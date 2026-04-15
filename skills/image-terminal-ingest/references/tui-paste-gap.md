# OpenClaw TUI paste gap

## Current behavior

In Claude desktop, `cmd+v` can create a true image attachment that shows up as `Image #n`.

In OpenClaw TUI, pasting a screenshot often arrives only as:
- a local filesystem path
- or a fragile macOS temp path under `/var/folders/.../TemporaryItems/...`

That means the agent must ingest the file after the message, instead of receiving a first-class image attachment.

## What the TUI would need for parity

1. Detect image data on paste, not only plain text.
2. If clipboard contains an image, write it immediately to a stable temp file before sending.
3. Attach that file as media in the outbound message instead of only pasting text.
4. Optionally include a friendly label like `Image #9` in the UI while preserving the actual attachment.
5. Fall back to path-based ingest only when clipboard did not contain real image bytes.

## Why the skill still helps

Until the TUI supports native image paste, `image-terminal-ingest` provides the best available fallback:
- normalize unstable local paths
- copy to stable destinations
- mirror into workspace for tool-readable image analysis
- return terminal-friendly paths and metadata
