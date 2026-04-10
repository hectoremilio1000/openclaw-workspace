---
name: whatsapp-inbox-sync
description: Convert important WhatsApp conversations into durable, shareable knowledge inside the OpenClaw workspace. Use when a user pastes chat transcripts, screenshots, or summaries from WhatsApp and wants them synchronized into Obsidian/GitHub as memory notes, architecture docs, decisions, tasks, or project knowledge without duplicating existing thoughts.
---

# WhatsApp Inbox Sync

Turn WhatsApp conversations into structured workspace knowledge.

This skill is for **capturing, summarizing, routing, and storing** important chat conversations so the user does not have to repeat context between WhatsApp, TUI, Obsidian, and GitHub.

## Core workflow

1. **Ingest the conversation**
   - Accept pasted transcript, screenshots, or user summary.
   - If the user only gives fragments, ask for the minimum missing context needed.
   - Do **not** pretend to have direct WhatsApp history access unless a real tool provides it.

2. **Extract the useful parts**
   Pull out:
   - context
   - decisions
   - open questions
   - next actions
   - durable knowledge worth preserving

3. **De-duplicate against the workspace**
   Before writing, check whether the same idea already exists in:
   - `knowledge/`
   - `memory/`
   - relevant project docs

   Prefer **updating or extending existing notes** over creating near-duplicates.

4. **Route to the right destination**
   Read `references/routing-rules.md` and choose the correct target:
   - `memory/YYYY-MM-DD.md` for temporary or session-specific notes
   - `knowledge/architecture/...` for durable system/product thinking
   - `knowledge/decisions/...` for closed decisions
   - `knowledge/programming/...` for coding rules or patterns
   - project-specific docs when the content belongs there

5. **Write structured notes**
   Use the templates in `references/note-templates.md`.
   Keep notes concise, skimmable, and readable without chat context.

6. **Prepare for sync**
   If files were updated, tell the user what changed and whether it should be committed/pushed.
   Do not push unless explicitly allowed by the active instructions.

7. **Use the OpenClaw channel-sync architecture when automation is requested**
   If the user wants WhatsApp ↔ TUI synchronization to be automatic, treat it as personal OpenClaw infrastructure.
   Read `references/sync-playbook.md` and route the design toward:
   - local raw-message storage in `~/.openclaw/state/channel-sync/`
   - summarized knowledge in `~/.openclaw/workspace/memory/` and `knowledge/`
   - no raw WhatsApp history in git

## Decision rules

### When to create a new file
Create a new file only when the conversation introduces:
- a new architecture concept
- a new durable workflow
- a new formal decision
- a new reusable programming rule

### When to update an existing file
Update an existing file when the conversation:
- extends an existing roadmap
- clarifies a previously documented decision
- adds examples to a known pattern
- refines an already-existing architecture direction

### When to keep it out of `knowledge/`
Keep it in `memory/` only when it is:
- half-baked thinking
- unresolved brainstorming
- temporary planning
- a status update without durable value

## How to summarize

Use this structure by default:
- **Context** — what was being discussed
- **Key insights** — the useful discoveries
- **Decisions** — what is now considered decided
- **Open questions** — what remains unresolved
- **Next steps** — what should happen next

Avoid transcript-style storage unless the user explicitly wants the raw chat preserved.

## Important constraints

- Do not claim WhatsApp is synchronized unless the content was actually provided or a real integration exists.
- Do not dump huge raw chats into `knowledge/`.
- Do not create duplicate docs just because the wording is slightly different.
- Do not store secrets or sensitive credentials in synced notes.

## References

- For routing content to the right destination: read `references/routing-rules.md`
- For writing note formats: read `references/note-templates.md`
- For the end-to-end workflow and future automation path: read `references/sync-playbook.md`
