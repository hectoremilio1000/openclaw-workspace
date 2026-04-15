#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Iterable, Optional

SEARCH_DIRS = [
    Path.home() / "Desktop",
    Path.home() / "Downloads",
    Path("/tmp"),
]

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-.")
    return value or "image"


def find_candidates(source: str) -> list[Path]:
    src = Path(source)
    base = src.name
    stem = src.stem
    ext = src.suffix.lower()

    tokens = [t for t in re.split(r"[^\w]+", stem) if t]
    strong_tokens = [t for t in tokens if len(t) >= 4]

    candidates: list[Path] = []
    search_roots: list[Path] = []
    if src.parent.exists():
        search_roots.append(src.parent)
    search_roots.extend([p for p in SEARCH_DIRS if p.exists()])

    seen: set[Path] = set()
    for root in search_roots:
        try:
            for path in root.rglob("*"):
                if not path.is_file():
                    continue
                if ext and path.suffix.lower() != ext:
                    continue
                name = path.name
                if name == base:
                    if path not in seen:
                        candidates.append(path)
                        seen.add(path)
                    continue
                hay = unicodedata.normalize("NFKC", name).lower()
                if all(tok.lower() in hay for tok in strong_tokens[:3]):
                    if path not in seen:
                        candidates.append(path)
                        seen.add(path)
        except Exception:
            continue
    return candidates


def choose_candidate(source: str) -> Optional[Path]:
    src = Path(source)
    if src.exists() and src.is_file():
        return src
    candidates = find_candidates(source)
    if not candidates:
        return None
    base = src.name
    for c in candidates:
        if c.name == base:
            return c
    return candidates[0]


def unique_destination(dest_dir: Path, desired_name: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(desired_name).stem
    suffix = Path(desired_name).suffix
    target = dest_dir / f"{stem}{suffix}"
    i = 2
    while target.exists():
        target = dest_dir / f"{stem}-{i}{suffix}"
        i += 1
    return target


def inspect(path: Path) -> dict:
    result = {"file": None, "dimensions": None, "ocr": None}
    try:
        result["file"] = subprocess.check_output(["file", str(path)], text=True).strip()
    except Exception as e:
        result["file"] = f"file failed: {e}"

    try:
        sips = subprocess.check_output(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
            text=True,
            stderr=subprocess.STDOUT,
        )
        result["dimensions"] = " ".join(line.strip() for line in sips.splitlines() if "pixel" in line)
    except Exception as e:
        result["dimensions"] = f"sips failed: {e}"

    tesseract = shutil.which("tesseract")
    if tesseract:
        try:
            ocr = subprocess.check_output([tesseract, str(path), "stdout"], text=True, stderr=subprocess.STDOUT)
            result["ocr"] = ocr.strip()[:4000] or None
        except Exception as e:
            result["ocr"] = f"tesseract failed: {e}"
    return result


def main(argv: Iterable[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--dest-dir", default="/tmp/codex-images")
    parser.add_argument("--name", default=None)
    args = parser.parse_args(list(argv))

    source = args.source
    chosen = choose_candidate(source)
    if not chosen:
        print(f"ERROR: source_not_found: {source}", file=sys.stderr)
        return 2

    ext = chosen.suffix.lower()
    if ext not in IMAGE_EXTS:
        print(f"ERROR: not_supported_image: {chosen}", file=sys.stderr)
        return 3

    desired = args.name or slugify(chosen.stem) + ext
    if not desired.endswith(ext):
        desired += ext

    dest = unique_destination(Path(args.dest_dir), desired)
    shutil.copy2(chosen, dest)
    meta = inspect(dest)

    print(f"SOURCE={chosen}")
    print(f"COPIED={dest}")
    print(f"FILE={meta['file'] or ''}")
    print(f"DIMENSIONS={meta['dimensions'] or ''}")
    if meta.get("ocr"):
        print("OCR_START")
        print(meta["ocr"])
        print("OCR_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
