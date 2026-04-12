---
name: local-file-intake
description: "Use when a user references local files outside the OpenClaw workspace, especially Desktop, Downloads, /tmp, or macOS temporary screenshot paths. Triggers on phrases like 'lee este archivo del desktop', 'usa esta screenshot local', 'está en downloads', or when provided absolute local paths fail due to access restrictions. This skill standardizes intake by copying requested files into /Users/hectorvelasquez/.openclaw/workspace/tmp/ first, then reading/analyzing them from there. Also applies when a skill needs stable workspace-local copies of transient screenshots before processing." 
---

# Local File Intake

Use this skill when the user gives local file paths outside the workspace and the normal file/image tools cannot access them directly.

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
5. Read/analyze the workspace-local copy.
6. Only if no reasonable match exists, tell the user clearly and ask for a new stable path or direct upload.

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
