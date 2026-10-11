import io

import anyio
import trafilatura
from pypdf import PdfReader

from app.core.http import fetch_bytes

MAX_PDF_PAGES = 50


def html_to_text(html: str, url: str) -> str:
    extracted = trafilatura.extract(
        html, url=url, output_format="markdown", favor_precision=True, include_tables=True, include_comments=False
    )
    return extracted or ""


def pdf_to_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages[:MAX_PDF_PAGES]]
    return "\n\n".join(p.strip() for p in pages if p.strip())


async def from_url(url: str) -> tuple[str, str]:
    data, final, content_type = await fetch_bytes(url, max_bytes=2_000_000)
    if "pdf" in content_type or final.lower().endswith(".pdf"):
        return await anyio.to_thread.run_sync(pdf_to_text, data), final
    html = data.decode("utf-8", errors="replace")
    return await anyio.to_thread.run_sync(html_to_text, html, final), final


async def from_pdf(data: bytes) -> str:
    return await anyio.to_thread.run_sync(pdf_to_text, data)
