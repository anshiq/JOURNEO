from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000
WIDTHS = (640, 1280, 1920)
FORMATS = {"JPEG", "PNG", "WEBP", "GIF", "AVIF", "MPO"}


class UnsupportedImage(Exception):
    pass


@dataclass(slots=True)
class Variant:
    width: int
    height: int
    data: bytes


@dataclass(slots=True)
class ProcessedImage:
    variants: list[Variant]
    dominant: str
    width: int
    height: int


def process(data: bytes) -> ProcessedImage:
    try:
        with Image.open(BytesIO(data)) as probe:
            probe.verify()
        raw = Image.open(BytesIO(data))
    except (Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
        raise UnsupportedImage("invalid") from exc
    with raw:
        if raw.format not in FORMATS:
            raise UnsupportedImage(raw.format or "unknown")
        image = ImageOps.exif_transpose(raw)
        image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
    variants: list[Variant] = []
    for width in WIDTHS:
        if width > image.width and variants:
            break
        target = (
            image
            if width >= image.width
            else image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        )
        buffer = BytesIO()
        target.save(buffer, "WEBP", quality=80, method=4)
        variants.append(Variant(width=target.width, height=target.height, data=buffer.getvalue()))
    pixel = image.convert("RGB").resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    r, g, b = pixel if isinstance(pixel, tuple) else (0, 0, 0)
    return ProcessedImage(variants=variants, dominant=f"#{r:02x}{g:02x}{b:02x}", width=image.width, height=image.height)
