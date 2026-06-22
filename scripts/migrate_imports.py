"""One-off: convert ../ imports to @/ alias paths."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

IMPORT_RE = re.compile(
    r"(?P<prefix>(?:import|export)\s+(?:[^'\";]*?\s+from\s+)?|import\s+)"
    r"(?P<quote>['\"])(?P<spec>\.\./[^'\"]+)(?P=quote)"
)


def to_alias(file_path: Path, spec: str) -> str:
    target = (file_path.parent / spec).resolve()
    rel = target.relative_to(SRC.resolve())
    return "@/" + rel.as_posix()


def main() -> None:
    changed_files = 0
    for path in sorted(SRC.rglob("*")):
        if path.suffix not in {".js", ".jsx"}:
            continue
        text = path.read_text(encoding="utf-8")

        def repl(match: re.Match[str]) -> str:
            alias = to_alias(path, match.group("spec"))
            return (
                f"{match.group('prefix')}{match.group('quote')}{alias}{match.group('quote')}"
            )

        new = IMPORT_RE.sub(repl, text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed_files += 1
            print(path.relative_to(ROOT))

    print(f"changed {changed_files} files")


if __name__ == "__main__":
    main()
