# Sync Playbook

## Goal
Make important WhatsApp conversations available across TUI, Obsidian, and GitHub without repeating context.

## Current reality
This workflow works today with:
- pasted chat transcripts
- screenshots
- user summaries

It does **not** assume magical direct WhatsApp history access.

## Manual sync workflow (usable now)

1. User provides conversation text, screenshots, or summary.
2. Read enough context to understand the topic.
3. Search workspace knowledge/memory to avoid duplication.
4. Extract:
   - context
   - decisions
   - tasks
   - durable insights
5. Route content using `routing-rules.md`.
6. Write concise structured notes.
7. Report what was saved and where.
8. Commit/push only if explicitly authorized.

## Semi-automatic future workflow

When a real message-history tool exists, use the same logic but add:
- incremental import by date/thread
- deduplication by message range or summary hash
- conversation-to-note mapping
- daily/weekly inbox processing

## What "good" looks like
After sync, someone on another computer should be able to:
- open the workspace
- read one note
- understand the conclusion
- continue without the raw WhatsApp chat

## Anti-patterns
- dumping raw chats into `knowledge/`
- duplicating the same idea into multiple files
- creating decision records for unresolved thoughts
- storing secrets from chats in synced notes
