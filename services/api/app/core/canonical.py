import hashlib
from typing import Any

import orjson


def canonical(doc: dict[str, Any]) -> bytes:
    return orjson.dumps(doc, option=orjson.OPT_SORT_KEYS)


def doc_hash(doc: dict[str, Any]) -> str:
    return hashlib.sha256(canonical(doc)).hexdigest()
