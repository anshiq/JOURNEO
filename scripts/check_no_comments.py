import ast
import pathlib
import sys
import tokenize

ROOTS = [pathlib.Path("services/api/app"), pathlib.Path("services/api/tests"), pathlib.Path("scripts")]

def check_file(path: pathlib.Path) -> list[str]:
    problems: list[str] = []
    try:
        with tokenize.open(str(path)) as f:
            tokens = list(tokenize.generate_tokens(f.readline))
    except Exception as e:
        return [f"{path} tokenize failed: {e}"]
    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            if tok.start[0] == 1 and tok.string.startswith("#!"):
                continue
            problems.append(f"{path}:{tok.start[0]} comment")
    try:
        tree = ast.parse(path.read_text(), filename=str(path))
    except Exception as e:
        problems.append(f"{path} parse failed: {e}")
        return problems
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node, clean=False)
            if doc is not None:
                problems.append(f"{path}:{node.lineno} docstring")
    return problems

def main() -> int:
    problems: list[str] = []
    for root in ROOTS:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.py")):
            if ".venv" in path.parts or "__pycache__" in path.parts:
                continue
            problems.extend(check_file(path))
    if problems:
        sys.stdout.write("\n".join(problems) + "\n")
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
