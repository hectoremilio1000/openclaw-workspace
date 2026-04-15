---
name: image-terminal-ingest
description: "Use when the user provides an image attachment or local image path and wants it copied to a stable terminal-friendly path for shell use, inspection, OCR, or visual analysis. Triggers on pasted local image paths, screenshots from Desktop/Downloads, and fragile macOS TemporaryItems paths like /var/folders/.../NSIRD_screencaptureui_* . Ask for approval before creating directories or copying files." 
---

# Image Terminal Ingest

Use this skill when the user wants to work with an image from the terminal or pasted a local image path that should become stable and shell-friendly.

This skill includes a deterministic helper at `scripts/ingest_image.py` and should prefer that helper over ad-hoc shell when possible.

If the user wants a flow that feels like pasted images in chat, use alias-style names such as `image-1`, `image-2`, or `image-9`, and rely on the workspace mirror for image analysis.

## Goal

Turn a fragile or awkward image source into a stable local copy at:

```text
/tmp/codex-images/
```

And also create a workspace mirror at:

```text
/Users/hectorvelasquez/.openclaw/workspace/tmp/
```

Then return:
- copied absolute path
- workspace mirror path
- alias-like filename when helpful
- terminal-ready commands
- file metadata
- OCR text if available
- visual summary if OCR is unavailable

## Approval rule

Before creating directories or copying files, ask for explicit approval.
State clearly:
- source path
- destination path
- whether inspection and OCR will run

If the user already explicitly approved in the current conversation, proceed.

## Workflow

1. Identify the image source.
   - attached image
   - explicit local filesystem path
   - screenshot path from `Desktop`, `Downloads`, `/tmp`, or `/var/folders/.../TemporaryItems/...`

2. If the source is under `/var/folders/...` or `TemporaryItems`, treat it as urgent and try exact copy first.

3. Create destination directory only after approval:

```bash
mkdir -p /tmp/codex-images
```

4. Copy to a stable terminal-friendly filename.
   - lowercase
   - no spaces
   - no accents
   - no special punctuation except `-` and `.`
   - include date/time when useful

Example:

```text
/tmp/codex-images/screenshot-2026-04-14-2347.png
```

5. Never overwrite an existing file unless the user explicitly approves.
   If needed, append `-2`, `-3`, etc.

6. Never delete the original image.

7. If exact copy fails, do fuzzy recovery in this order:
   - same directory as source
   - `~/Desktop`
   - `~/Downloads`
   - `/tmp`

8. Prefer the bundled helper script for exact copy, fuzzy recovery, safe destination naming, workspace mirroring, metadata, and optional OCR.

```bash
python3 /Users/hectorvelasquez/.openclaw/workspace/skills/image-terminal-ingest/scripts/ingest_image.py \
  "/original/path/image.png" \
  --dest-dir /tmp/codex-images \
  --name screenshot-2026-04-14-2347.png \
  --alias image-9
```

9. Inspect the copied image with available tools:
   - `file <path>`
   - `sips -g pixelWidth -g pixelHeight <path>` on macOS
   - `tesseract <path> stdout` if installed and OCR is useful

10. If OCR is unavailable or weak, use visual inspection on the copied image.

11. Return the real outcome honestly.

## Shell patterns

### Exact copy

```bash
mkdir -p /tmp/codex-images && \
cp "/original/path/image.png" \
   "/tmp/codex-images/screenshot-2026-04-14-2347.png"
```

### Safe no-overwrite copy

```bash
dst="/tmp/codex-images/screenshot-2026-04-14-2347.png"
if [ -e "$dst" ]; then
  dst="/tmp/codex-images/screenshot-2026-04-14-2347-2.png"
fi
cp "/original/path/image.png" "$dst"
```

### Fuzzy recovery

```bash
find ~/Desktop ~/Downloads /tmp -type f \( -name 'Screenshot*.png' -o -name 'Screenshot*.jpg' \) | grep '2026-04-14 at 11.47'
```

### Preferred helper invocation

```bash
python3 /Users/hectorvelasquez/.openclaw/workspace/skills/image-terminal-ingest/scripts/ingest_image.py \
  "/original/path/image.png" \
  --dest-dir /tmp/codex-images \
  --name screenshot-2026-04-14-2347.png \
  --alias image-9
```

The helper returns both the stable shell path and a workspace mirror path that image tools can read.

### Metadata inspection

```bash
file /tmp/codex-images/screenshot-2026-04-14-2347.png
sips -g pixelWidth -g pixelHeight /tmp/codex-images/screenshot-2026-04-14-2347.png
```

### OCR if available

```bash
tesseract /tmp/codex-images/screenshot-2026-04-14-2347.png stdout
```

## Output checklist

Always return:
- source path used
- copied absolute path
- workspace mirror path
- alias used, if any
- at least one terminal-ready command
- file type and dimensions if available
- OCR text or a brief visual summary
- any failures truthfully

## Constraints

- Do not create the skill outside `/Users/hectorvelasquez/.openclaw/workspace/skills/`
- Do not overwrite files without approval
- Do not delete originals
- Prefer recoverable, transparent actions
- For very fragile `/var/folders/.../NSIRD_screencaptureui_*` paths, try copy immediately after approval because they may vanish within seconds
- This skill improves success rate, but cannot resurrect a temp file that macOS already deleted before the helper runs
- For TUI/native paste parity notes, see `references/tui-paste-gap.md`
