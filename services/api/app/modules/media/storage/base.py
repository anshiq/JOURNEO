from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class StoredFile:
    data: bytes
    mime: str


class MediaStorage(Protocol):
    async def put(self, key: str, data: bytes, mime: str, width: int | None, height: int | None) -> str: ...

    async def get(self, key: str) -> StoredFile | None: ...
