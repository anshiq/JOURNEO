import re

TARGET = 1200
OVERLAP = 150
BREAKS = re.compile(r"\n(?=#{1,6}\s)|\n\s*\n")


def chunk_text(text: str, target: int = TARGET, overlap: int = OVERLAP) -> list[str]:
    parts = [p.strip() for p in BREAKS.split(text or "") if p and p.strip()]
    chunks: list[str] = []
    current = ""
    for piece in parts:
        part = piece
        while len(part) > target:
            head, part = part[:target], part[target - overlap :]
            if current:
                chunks.append(current)
                current = ""
            chunks.append(head)
        if len(current) + len(part) + 2 > target and current:
            chunks.append(current)
            current = current[-overlap:] + "\n\n" + part if overlap else part
        else:
            current = f"{current}\n\n{part}" if current else part
    if current.strip():
        chunks.append(current)
    return [c.strip() for c in chunks if c.strip()][:400]
