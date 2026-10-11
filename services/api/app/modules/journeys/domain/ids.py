import re
import secrets
import string
from collections.abc import Callable
from typing import Literal

IdKind = Literal["scr", "stp", "el", "it", "opt", "fld", "band", "rule"]
IdGen = Callable[[IdKind], str]
ID_PATTERN = r"^[a-z][a-z0-9_-]{5,20}$"
_ID_RE = re.compile(ID_PATTERN)
_ALPHABET = string.ascii_lowercase + string.digits
_DIGITS = string.digits + string.ascii_lowercase


def is_valid_id(value: str) -> bool:
    return bool(_ID_RE.match(value))


def random_ids(kind: IdKind) -> str:
    return f"{kind}_" + "".join(secrets.choice(_ALPHABET) for _ in range(10))


def _base36(n: int) -> str:
    out = ""
    while True:
        n, r = divmod(n, 36)
        out = _DIGITS[r] + out
        if n == 0:
            return out


def sequential_ids(seed: int = 0) -> IdGen:
    counter = [seed]

    def gen(kind: IdKind) -> str:
        counter[0] += 1
        return f"{kind}_{_base36(counter[0]).rjust(10, '0')}"

    return gen
