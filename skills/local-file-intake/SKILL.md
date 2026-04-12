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

1. Confirm the source path exists with shell.
2. Create `/Users/hectorvelasquez/.openclaw/workspace/tmp/` if missing.
3. Copy the file into that folder, preserving a recognizable name.
4. Read/analyze the workspace-local copy.
5. If the source path no longer exists, tell the user clearly and ask for a new stable path or direct upload.

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

## For temporary macOS screenshot locations

Paths under `/var/folders/.../TemporaryItems/...` are especially fragile. Copy them immediately if they still exist.

## If copy fails

Report exactly which file failed and why:
- path missing
- permission issue
- source already deleted

Then ask the user for one of these:
- upload directly in chat
- move files into workspace `tmp/`
- provide corrected path

## Workspace rule for future skills

Create all new custom skills under:

```text
/Users/hectorvelasquez/.openclaw/workspace/skills/
```

Do not create new custom skills outside the OpenClaw workspace skills folder.
