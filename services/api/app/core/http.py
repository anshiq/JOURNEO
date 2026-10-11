import ipaddress
import socket
from collections.abc import Iterable
from typing import Any, cast

import anyio
import httpcore
import httpx

REDIRECTS = (301, 302, 303, 307, 308)
SocketOption = tuple[int, int, int] | tuple[int, int, bytes | bytearray] | tuple[int, int, None, int] | Any


class BlockedDestination(Exception):
    def __init__(self, host: str) -> None:
        super().__init__(host)
        self.host = host


class ResponseTooLarge(Exception):
    pass


def allowed(address: str) -> bool:
    ip: ipaddress.IPv4Address | ipaddress.IPv6Address = ipaddress.ip_address(address.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


class SafeBackend(httpcore.AsyncNetworkBackend):
    inner: httpcore.AsyncNetworkBackend

    def __init__(self) -> None:
        self.inner = cast(httpcore.AsyncNetworkBackend, httpcore.AnyIOBackend())

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Iterable[SocketOption] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        try:
            infos = await anyio.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except OSError as exc:
            raise BlockedDestination(host) from exc
        addresses = [str(info[4][0]) for info in infos]
        if not addresses or not all(allowed(a) for a in addresses):
            raise BlockedDestination(host)
        return await self.inner.connect_tcp(
            addresses[0], port, timeout=timeout, local_address=local_address, socket_options=socket_options
        )

    async def connect_unix_socket(
        self, path: str, timeout: float | None = None, socket_options: Iterable[SocketOption] | None = None
    ) -> httpcore.AsyncNetworkStream:
        raise BlockedDestination("unix socket")

    async def sleep(self, seconds: float) -> None:
        await self.inner.sleep(seconds)


class SafeTransport(httpx.AsyncHTTPTransport):
    def __init__(self) -> None:
        super().__init__()
        self._pool = httpcore.AsyncConnectionPool(network_backend=SafeBackend(), max_connections=20)


def safe_client(timeout: float = 5.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=SafeTransport(),
        timeout=httpx.Timeout(timeout),
        follow_redirects=False,
        headers={"User-Agent": "JourneoBot/1.0"},
    )


def check_scheme(url: httpx.URL) -> None:
    if url.scheme not in ("http", "https") or not url.host:
        raise BlockedDestination(str(url))


async def fetch_bytes(url: str, max_bytes: int = 2_000_000, hops: int = 3) -> tuple[bytes, str, str]:
    current = httpx.URL(url)
    async with safe_client() as client:
        for _ in range(hops + 1):
            check_scheme(current)
            async with client.stream("GET", current) as resp:
                if resp.status_code in REDIRECTS:
                    location = resp.headers.get("location", "")
                    if not location:
                        raise BlockedDestination(str(current))
                    current = current.join(location)
                    continue
                resp.raise_for_status()
                declared = resp.headers.get("content-length")
                if declared and declared.isdigit() and int(declared) > max_bytes:
                    raise ResponseTooLarge(str(current))
                chunks: list[bytes] = []
                size = 0
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > max_bytes:
                        raise ResponseTooLarge(str(current))
                    chunks.append(chunk)
                return b"".join(chunks), str(current), resp.headers.get("content-type", "")
        raise BlockedDestination(str(current))


async def fetch_text(url: str, max_bytes: int = 2_000_000, hops: int = 3) -> tuple[str, str]:
    data, final, _ = await fetch_bytes(url, max_bytes=max_bytes, hops=hops)
    return data.decode("utf-8", errors="replace"), final
