# Acceptance checklist

## Core paste behavior

- [ ] `cmd+v` with a clipboard image creates a real image attachment
- [ ] the composer shows an attachment chip such as `Image #1`
- [ ] the pasted image is not inserted as a filesystem path in message text
- [ ] multiple pasted images create multiple chips in stable order

## Delivery behavior

- [ ] sending the draft preserves image media in the outbound message
- [ ] the receiving agent/session sees the image as a first-class image attachment
- [ ] the agent can inspect the attachment without path rescue logic

## Fallback behavior

- [ ] pasted Desktop screenshot path falls back to stable copy + attachment
- [ ] pasted Downloads image path falls back to stable copy + attachment
- [ ] pasted `/var/folders/.../TemporaryItems/...` path is attempted immediately
- [ ] if the temp file already expired, the client fails honestly and clearly

## Stability

- [ ] saved temp filenames are clean and terminal-friendly
- [ ] attachments are not silently overwritten
- [ ] originals are not deleted
- [ ] repeated tests do not regress previous successful paste behavior

## Honest reporting

- [ ] report exactly which path was used internally
- [ ] report whether the source was clipboard image bytes or a text path fallback
- [ ] report exact blocker when the current session lacks computer-use or clipboard access
