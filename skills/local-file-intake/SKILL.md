---
name: local-file-intake
description: "Use when a user references local files outside the OpenClaw workspace, especially Desktop, Downloads, /tmp, bare pasted absolute paths, or macOS temporary screenshot paths like /var/folders/.../TemporaryItems/... . Triggers on messages that are only a file path, requests like 'lee este archivo', 'usa esta screenshot local', 'está en downloads', or when absolute local paths fail due to access restrictions. This skill standardizes intake by copying requested files into /Users/hectorvelasquez/.openclaw/workspace/tmp/ first, then reading/analyzing them from there, including images that should be treated as image inputs after intake." 
---

# Local File Intake

Use this skill when the user gives local file paths outside the workspace and the normal file/image tools cannot access them directly.

This includes messages that are just one or more pasted absolute paths, for example:

```text
/Users/hectorvelasquez/Desktop/Screenshot 2026-04-14 at 11.35.56 p.m..png
/var/folders/.../TemporaryItems/.../Screenshot 2026-04-14 at 11.36.26 p.m..png
```

## Rule
Never assume Desktop, Downloads, or temporary macOS screenshot paths are readable by tools directly.

Instead, first make a stable copy inside the OpenClaw workspace:

```text
/Users/hectorvelasquez/.openclaw/workspace/tmp/
```

Then read/analyze the copied file from there.

## Default intake flow

1. Try the exact source path first.
2. If it fails, search for likely matches in the source directory and common local folders.
3. Create `/Users/hectorvelasquez/.openclaw/workspace/tmp/` if missing.
4. Copy the best match into that folder, preserving a recognizable name.
5. If the file is an image, analyze the workspace-local copy as an image input, not just as plain text.
6. If the file is a text-like file, use the read tool on the workspace-local copy.
7. Only if no reasonable match exists, tell the user clearly and ask for a new stable path or direct upload.

## Shell pattern

Use shell only for the copy step. Prefer `cp` with quoted absolute paths.

Example:

```bash
mkdir -p /Users/hectorvelasquez/.openclaw/workspace/tmp && \
cp "/Users/hectorvelasquez/Desktop/example.png" \
   "/Users/hectorvelasquez/.openclaw/workspace/tmp/example.png"
```

## For multiple screenshots

Copy all of them first, then analyze from the workspace copies.
If any exact path fails, do a fuzzy search before giving up.

When the user pasted multiple screenshots and refers to them positionally, keep a stable order and simple aliases in your own narration, for example:
- image 1 -> first pasted path
- image 2 -> second pasted path

Do not rename the original source file. The alias is only for clear conversation and comparison.

## Fuzzy recovery flow

When a provided local path fails, search in this order:

1. same directory as the original path
2. `~/Desktop`
3. `~/Downloads`
4. `/var/folders/.../TemporaryItems/...` if the original path was temporary

Use shell to search by:
- basename prefix
- nearby timestamp words
- extension

Example strategy for screenshots:

```bash
find ~/Desktop ~/Downloads -maxdepth 2 -type f \( -name 'Screenshot*.png' -o -name 'Screenshot*.jpg' \) | grep '2026-04-12 at 12'
```

If multiple candidates match, prefer:
1. exact basename match
2. same minute timestamp
3. same directory as the original path

## For temporary macOS screenshot locations

Paths under `/var/folders/.../TemporaryItems/...` are especially fragile. Copy them immediately if they still exist. If they disappear, search Desktop/Downloads for a stable copy before asking the user again.

For screenshot paths captured right after paste:
- prefer immediate copy into workspace `tmp/`
- preserve extension (`.png`, `.jpg`, `.webp`)
- after copy, use the workspace-local path for any image analysis so the image renders/loads correctly in tools

## If copy still fails after fuzzy recovery

Report exactly which file failed and why:
- path missing
- permission issue
- source already deleted
- no close match found

Then ask the user for one of these:
- upload directly in chat
- move files into workspace `tmp/`
- provide corrected path

## Tool handoff after intake

After the file is copied into workspace `tmp/`:
- image file (`png`, `jpg`, `jpeg`, `webp`, `gif`) -> use image-capable analysis on the copied path
- text-like file (`txt`, `md`, `json`, `log`, source files) -> use `read` on the copied path
- unknown/binary file -> identify it first, then choose the safest next tool

Do not keep trying to analyze the original external path once the workspace copy exists. The workspace copy becomes the canonical path for the rest of the task.

## Reliable shell patterns

### Exact copy first

```bash
mkdir -p /Users/hectorvelasquez/.openclaw/workspace/tmp && \
cp "/absolute/source/file.png" \
   "/Users/hectorvelasquez/.openclaw/workspace/tmp/file.png"
```

### Fuzzy locate if exact path fails

```bash
find ~/Desktop ~/Downloads -maxdepth 2 -type f | grep 'Screenshot 2026-04-12 at 12'
```

### Copy all matched screenshots into workspace tmp

```bash
mkdir -p /Users/hectorvelasquez/.openclaw/workspace/tmp
while IFS= read -r f; do
  cp "$f" /Users/hectorvelasquez/.openclaw/workspace/tmp/
done < <(find ~/Desktop ~/Downloads -maxdepth 2 -type f | grep 'Screenshot 2026-04-12 at 12')
```

## Workspace rule for future skills

Create all new custom skills under:

```text
/Users/hectorvelasquez/.openclaw/workspace/skills/
```

Do not create new custom skills outside the OpenClaw workspace skills folder.
