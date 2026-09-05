from PyPDF2 import PdfReader
import io, httpx
from bs4 import BeautifulSoup
def load_pdf_bytes(data: bytes):
    reader=PdfReader(io.BytesIO(data))
    texts=[]
    for p in reader.pages:
        try: texts.append(p.extract_text() or "")
        except: pass
    return "\n".join(texts)
def load_web(url: str):
    headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
    r=httpx.get(url, timeout=15, headers=headers, follow_redirects=True)
    r.raise_for_status()
    soup=BeautifulSoup(r.text, "html.parser")
    for s in soup(["script","style"]): s.decompose()
    return soup.get_text(separator="\n")[:8000]
