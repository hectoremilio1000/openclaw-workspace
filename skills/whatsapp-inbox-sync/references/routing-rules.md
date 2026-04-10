# Routing Rules

Use these rules to decide where WhatsApp-derived knowledge should be stored.

## 1. `memory/YYYY-MM-DD.md`
Use when the content is temporary, session-bound, or not yet fully decided.

Examples:
- brainstorming
- partial summaries
- "today we discussed..."
- loose next steps
- unconfirmed hypotheses

## 2. `knowledge/decisions/YYYY-MM-DD-*.md`
Use when the conversation closes a meaningful decision.

Examples:
- product direction changed
- architecture boundary established
- ownership split defined
- rollout strategy chosen
- something is explicitly "ya decidido"

A decision file should answer:
- context
- decision
- why
- what was rejected
- consequences

## 3. `knowledge/architecture/...`
Use when the content explains how a system should be structured.

Examples:
- shell unificado
- brain pipeline
- workspace navigation
- data model and flow
- domain boundaries
- rollout architecture

Prefer updating an existing architecture file if it already covers the same subject.

## 4. `knowledge/programming/...`
Use when the content defines how to implement things.

Examples:
- coding rules
- patterns learned from Claude Code
- tool-calling guidelines
- AdonisJS conventions
- TypeScript rules
- migration strategy patterns

## 5. Project-specific docs
Use when the knowledge belongs to a specific project document already acting as source of truth.

Examples:
- roadmap additions
- UX specs
- product flow refinements
- demo definitions

## 6. Avoid duplicates
Before creating a file, ask:
- does this already exist in another note?
- is this a refinement rather than a new concept?
- should I append/update instead of create?

Default preference:
1. update existing note
2. create new note only if really new
