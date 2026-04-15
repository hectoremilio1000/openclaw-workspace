---
name: computer-use-image-paste
description: "Use when the user wants OpenClaw TUI or another chat client with computer-use/clipboard access to behave like Claude Desktop when pasting screenshots: detect real image bytes on paste, save them immediately to a stable temp file, attach them as first-class images, and verify the result by pasting and sending test screenshots. Also use when designing, implementing, or validating cmd+v image-paste behavior, attachment chips like Image #n, or clipboard-to-attachment fallback flows for macOS screenshots and TemporaryItems paths."
---

# Computer Use Image Paste

Use this skill for environments that have actual computer-use capability or native clipboard/image access.

If the current session does **not** have computer-use or clipboard-image tooling, be explicit: you can still edit specs/code, but you cannot personally press keys, take screenshots, or paste images.

## Goal

Make paste behave like Claude Desktop:
- user takes a screenshot
- user presses `cmd+v`
- the client creates a real image attachment
- the composer shows something like `Image #9`
- the agent receives image media, not only a fragile local path

## Workflow

1. Confirm what is available in the current environment:
   - computer-use / keyboard / mouse control
   - clipboard image access
   - filesystem write access for temp attachments
   - attachment support in the composer/send pipeline

2. If computer-use is available, run a real end-to-end test:
   - trigger screenshot flow or use an existing screenshot
   - paste with `cmd+v`
   - verify the UI shows an image attachment chip
   - send the message
   - verify the receiving agent sees a first-class image

3. If paste currently inserts only a local path, fix the client flow:
   - inspect clipboard for image bytes before plain text fallback
   - write image bytes immediately to a stable temp path
   - create a draft attachment entry
   - render an attachment chip like `Image #n`
   - send the attachment as media

4. Keep a fallback path-ingest flow only for cases where the clipboard did not contain image bytes and only contained text.

5. Re-test until all acceptance checks pass.

## Required implementation behavior

### Native image paste path

On paste:
- detect whether the clipboard contains a real image payload
- if yes, save it immediately to a stable path such as `/tmp/openclaw-tui-paste/`
- generate a clean filename
- add it to the draft as an image attachment
- render a user-facing label such as `Image #1`
- do not inject the local filesystem path into the visible message text

### Text-path fallback

Only if there are no image bytes in the clipboard:
- inspect pasted text for a likely local image path
- if it points to a screenshot or image, copy it to a stable temp path immediately
- attach that stable copy
- if it already expired, fail honestly instead of pretending it worked

### File safety

- never overwrite existing files silently
- never delete originals
- prefer stable temp dirs and clean names

## Acceptance checklist

Use the checklist in `references/acceptance-checklist.md`.

Minimum bar:
- paste from clipboard image creates an attachment, not plain text
- multiple pastes create multiple image chips
- sent messages preserve the image as media
- expired TemporaryItems paths fail honestly
- Desktop screenshots pasted as text paths still succeed through fallback ingest

## Output expectations

When reporting progress, include:
- what was tested
- whether the image appeared as a true attachment or plain text path
- stable temp path used internally
- what still fails
- exact blocker if current session lacks computer-use capability
