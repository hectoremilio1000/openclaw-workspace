#!/usr/bin/env python3
import argparse
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Iterable, Optional

WORKSPACE_TMP = Path("/Users/hectorvelasquez/.openclaw/workspace/tmp")

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


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKC", value).lower()


def extract_screenshot_signature(value: str) -> tuple[Optional[str], Optional[str]]:
    normalized = normalize_text(value)
    m = re.search(
        r"screenshot\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2})\.(\d{2})(?:\.(\d{2}))?",
        normalized,
    )
    if not m:
        return None, None
    date_part = m.group(1)
    hh = int(m.group(2))
    mm = m.group(3)
    ss = m.group(4) or None
    return date_part, f"{hh:02d}.{mm}" + (f".{ss}" if ss else "")


def score_candidate(source: Path, candidate: Path) -> int:
    src_name = normalize_text(source.name)
    cand_name = normalize_text(candidate.name)
    score = 0

    if src_name == cand_name:
        return 1000

    src_date, src_time = extract_screenshot_signature(source.name)
    cand_date, cand_time = extract_screenshot_signature(candidate.name)

    if src_date and cand_date:
        if src_date != cand_date:
            return -1
        score += 200
    elif src_date or cand_date:
        return -1

    if src_time and cand_time:
        if src_time == cand_time:
            score += 500
        elif src_time[:5] == cand_time[:5]:
            score += 300
        else:
            return -1

    src_stem = normalize_text(source.stem)
    cand_stem = normalize_text(candidate.stem)
    tokens = [t for t in re.split(r"[^\w]+", src_stem) if len(t) >= 4]
    overlap = sum(1 for t in tokens if t in cand_stem)
    score += overlap * 25

    if candidate.parent == source.parent:
        score += 30
    if "temporaryitems" in normalize_text(str(source.parent)) and candidate.parent == Path.home() / "Desktop":
        score += 10

    return score


def find_candidates(source: str) -> list[Path]:
    src = Path(source)
    base = src.name
    ext = src.suffix.lower()

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
                if path in seen:
                    continue
                name = path.name
                if name == base:
                    candidates.append(path)
                    seen.add(path)
                    continue
                score = score_candidate(src, path)
                if score >= 250:
                    candidates.append(path)
                    seen.add(path)
        except Exception:
            continue
    candidates.sort(key=lambda p: score_candidate(src, p), reverse=True)
    return candidates


def choose_candidate(source: str) -> Optional[Path]:
    src = Path(source)
    if src.exists() and src.is_file():
        return src
    candidates = find_candidates(source)
    if not candidates:
        return None
    best = candidates[0]
    if score_candidate(src, best) < 250:
        return None
    return best


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


def build_alias_name(chosen: Path, alias: Optional[str]) -> str:
    ext = chosen.suffix.lower()
    if alias:
        alias = slugify(alias)
        if not alias.endswith(ext):
            alias += ext
        return alias
    return slugify(chosen.stem) + ext


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
    parser.add_argument("--workspace-mirror-dir", default=str(WORKSPACE_TMP))
    parser.add_argument("--alias", default=None)
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

    alias_name = build_alias_name(chosen, args.alias)
    dest = unique_destination(Path(args.dest_dir), desired)
    shutil.copy2(chosen, dest)

    workspace_mirror_dir = Path(args.workspace_mirror_dir)
    workspace_dest = unique_destination(workspace_mirror_dir, alias_name)
    shutil.copy2(dest, workspace_dest)

    meta = inspect(dest)

    print(f"SOURCE={chosen}")
    print(f"COPIED={dest}")
    print(f"WORKSPACE_MIRROR={workspace_dest}")
    print(f"ALIAS={workspace_dest.name}")
    print(f"TERMINAL_COMMAND=open {dest}")
    print(f"FILE={meta['file'] or ''}")
    print(f"DIMENSIONS={meta['dimensions'] or ''}")
    if meta.get("ocr"):
        print("OCR_START")
        print(meta["ocr"])
        print("OCR_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
