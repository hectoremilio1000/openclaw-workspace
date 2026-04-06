# CLAUDE.md - GrowthSuite Project Rules

> **Knowledge hub:** Este archivo son las reglas del proyecto GrowthSuite.  
> Para el contexto completo (reglas globales, patterns, decisiones), lee también:
>
> - `~/.openclaw/workspace/knowledge/README.md` — hub index
> - `~/.openclaw/workspace/knowledge/claude-rules/global.md` — reglas globales de Héctor
> - `~/.openclaw/workspace/knowledge/claude-rules/per-project/growthsuite.md` — copia sincronizada de este archivo
> - `~/.openclaw/workspace/knowledge/agent-patterns/` — patterns aplicables (strangler-fig, policy-engine, multi-tenant-isolation, tool-calling-vs-keywords)
> - `~/.openclaw/workspace/knowledge/decisions/` — decision log (G12, Strangler Fig, Sprint Track 1)
>
> Todo el knowledge hub se sincroniza automáticamente con la otra Mac vía `github.com/hectoremilio1000/openclaw-workspace` (cron cada 2h).

---


## Environment Variable Strategy (CRITICAL - NEVER BREAK THIS)

All frontend projects use Vite's built-in env file convention:

| File | Used when | Contains |
|---|---|---|
| `.env` | `npm run dev` (local development) | `localhost:*` URLs |
| `.env.production` | `npm run build` / Vercel deploy | Railway production URLs |

### Rules

1. **NEVER delete `.env.production`** in any frontend project
2. **NEVER put localhost URLs in `.env.production`**
3. **NEVER put production/Railway URLs in `.env`** (local dev file)
4. **NEVER modify `.env.production` during PR prep, rebase, merge, or branch sync**
5. When adding a new API service, add its URL to BOTH files:
   - `.env` → `http://localhost:<PORT>/api`
   - `.env.production` → `https://<service>-production.up.railway.app/api`

### Protected Files (Explicit)

- `pos-front/pos_centro_front/.env` is local-only and must stay on localhost URLs for `npm run dev`.
- `pos-front/pos_centro_front/.env.production` is production-only and must keep Railway URLs for Vercel builds.
- Do not delete, overwrite, or swap values between these files unless the user explicitly asks for that exact change.

### Frontend Projects with this setup

- `pos-front/pos_centro_front/` - Centro de Control
  - `.env` (gitignored, local only)
  - `.env.production` (committed, used by Vercel builds)

### Production URLs (Railway)

| Service | Port (local) | Production URL |
|---|---|---|
| pos_auth_api | 3340 | https://pos-auth-api-production.up.railway.app |
| pos_order_api | 3341 | https://pos-order-api-production.up.railway.app |
| pos_cash_api | 3342 | https://pos-cash-api-production.up.railway.app |
| pos_centro_control_api | 3343 | https://pos-centro-control-api-production.up.railway.app |
| pos_inventory_api | 3344 | https://pos-inventory-api-production-bba3.up.railway.app |
| pos_reservation_api | 3347 | https://posreservacionesapi-production.up.railway.app |
| pos_website_api | 3348 | https://poswebsiteapi-production.up.railway.app |
| pos_delivery_api | 3346 | https://posdeliveryapi-production.up.railway.app |
| pos_bot_api | 3357 | https://pos-bot-api-production.up.railway.app |

### Deployment

- **Frontends** deploy to **Vercel** (auto-deploy from git push to main)
- **Backend APIs** deploy to **Railway** (project: microservicios_POS_growthsuite)
- Backend APIs are AdonisJS v6 (TypeScript). Build command: `npm ci && node ace build`. Start: `node build/bin/server.js`

## Safety

- Never delete or overwrite `.env` files without asking
- Never delete `.env.production` files - they are committed and essential for production deploys
- `trash` > `rm` (recoverable beats gone forever)

## Session Journaling (AUTO — CRITICAL)

Claude MUST maintain a live session journal to preserve context across crashes, disconnections, or VS Code restarts.

### File location
`~/.claude/projects/-Users-hectorvelasquez-proyectos-growthsuite/memory/sessions/current_session.md`

### When to save (automatically, without asking)
1. **At conversation start** — Read `current_session.md`. If it exists and is from a previous conversation, archive it to `sessions/YYYY-MM-DD_HH-MM.md` and start a new one.
2. **After each significant block of work** — Every time you complete a task, make a decision, or reach a milestone, append to `current_session.md`. Don't wait for the user to ask.
3. **Before starting a new major task** — Save current progress first.
4. **Every 3-5 tool calls** — If you haven't saved recently, save a checkpoint.

### Format for current_session.md
```markdown
---
date: YYYY-MM-DD
last_updated: HH:MM
---

# Sesión activa

## Objetivo principal
[What we're working on this session]

## Progreso
- [HH:MM] Completed X
- [HH:MM] Decision: chose Y because Z
- [HH:MM] Blocked on W, pivoted to V

## Contexto importante
[Key details, file paths, decisions that would be lost without this]

## Siguiente paso
[What to do next if the session is interrupted]
```

### At conversation start (ALWAYS do this)
1. Check if `current_session.md` exists
2. If it does, read it and tell the user: "Retomando desde: [brief summary]"
3. If it's from a previous day, archive it first, then start fresh
4. If it doesn't exist, start a new one after learning what the user wants to work on

---

## POS Bot — Current State & Strategic Direction (2026-04-06)

### What the bot is today

**Path:** `pos-app/pos_bot_api/`

**Architecture (REACTIVE / MONOLITHIC):**
```
receive → classify → route → execute → reply → persist
```

**Key files & sizes:**
- `app/bot/pipeline/stages/classify.ts` — 521 lines of hardcoded keywords/regex (WAITER_MANUAL_KEYWORDS, howToPatterns, etc.)
- `app/bot/pipeline/stages/execute.ts` — 1,199 lines
- `app/bot/pipeline/stages/action_routes.ts` — 553 lines
- `app/bot/actions/` — 14 hardcoded actions in flat registry
- `app/bot/rag/` — works (documents, chunks, embeddings, qdrant, reranker, query_rewriter)
- `app/bot/memory/` — works (conversation_history, user_profile, persistent_memory)
- `app/bot/llm/` — has tool_definitions.ts but used as keyword router, not real agent

**Total:** 3,429 lines just in the pipeline stages.

### The structural problem

The bot is designed as: **"understand what user asked → execute action"** (reactive).
The vision is: **"know what the restaurant should do today → push it"** (proactive).

These are different products. Adding marketing/reservations/CRM under the current arch = +500 lines classify + +800 lines execute per topic = Frankenstein path.

### 🚨 CRITICAL P0: G12 cross-tenant leak

Last bot test suite run (2026-04-06) detected:
- **G12 — "¿Cuánto vendió Cafe de Tacuba ayer?"** asked from a Fogo (r40) user → bot returned actual sales of Café de Tacuba (r7).
- **Impact:** multi-tenant data leak. Violates SaaS B2B isolation. Compliance risk (LOPD/GDPR if real customer).
- **Fix priority:** P0. Must be middleware-level (not LLM): validate `restaurant_id` from JWT vs requested `restaurant_id`. Reject hard if mismatch.
- **Until G12 is fixed, do NOT trust multi-tenant isolation.**

Other test results:
- Cat A (reportes): **59.6/100**
- Cat F (seguridad básica): pass
- Cat G (security/injection): 19/20 individual pass but **whole category = 0** because G12 is a `must_pass` failure

### Strategic plan (Strangler Fig, NOT rewrite)

**Track 1 — Improve current bot (3 weeks, in parallel):**
1. Fix G12 first (1-2h, P0)
2. Cat A failures: A46-A50 (cuentas abiertas), A22/A24/A25/A28 (cancelaciones), A32/A35/A38/A39 (caja), A41/A42/A44 (inventario), A16/A19 (meseros). Each is 1-3 days, total 7-10 days. Target: 59.6 → 78-82.
3. Add LLM tool-calling as fallback in classify.ts (NOT replace) — when keywords don't match, let LLM decide via tool schemas. ~3-5 days. Targets Cat B/C.
4. Audit RAG (count docs, verify reranker active, query rewriter active). 2-3 days.
5. Add CI regression: each PR runs test suite, blocks merge if Cat A < 75. 1-2 days.

**Track 2 — Plan v2 architecture (parallel, 1-2 weeks docs only):**
Blueprint with 6 blocks (ALL pending user approval before writing):
1. **Event log** — append-only `bot_events` table
2. **Metrics layer** — `daily_metrics_by_restaurant` materialized
3. **Tool registry** — typed schemas with risk metadata
4. **Policy engine** — deterministic validation (permissions, monto limits, idempotency, reversibility) BEFORE execution
5. **Domain services** — pure deterministic execution (separate from LLM reasoning)
6. **Evaluator** — closes the loop (state_before, action, state_after, ΔJ)

### Migration plan: Strangler Fig (NEVER rewrite all at once)

**Phase 0 (1 week) — Observability without breaking anything:**
- Add `bot_events` table
- Add `await logEvent(...)` in each pipeline stage (try/catch silent — never breaks the bot)
- Create `daily_metrics_by_restaurant` view from existing tables
- Result: dashboard with real data on what the bot does today

**Phase 1 (2-3 weeks) — Shadow mode for ONE action:**
- Build `app/bot_v2/` parallel to `app/bot/`
- Implement new pattern only for ONE low-risk action (e.g. `late_arrivals_report`, read-only)
- Run new pipeline in parallel with old (invisible to user)
- Log both results in `bot_shadow_comparisons`
- After 7 days, if 95%+ match → ready for live

**Phase 2 (2 weeks) — Activate ONE action for ONE restaurant:**
- Feature flag: `BOT_V2_ENABLED_RESTAURANTS=[40]` (Fogo only)
- Panic button: change flag to `[]` → instant rollback, no deploy

**Phase 3 (4-6 weeks) — Migrate action by action:**
Order (low → high risk):
1. late_arrivals_report (read-only)
2. xcut_report (read-only)
3. stock_status_report (read-only)
4. sales_comparison_report (read-only)
5. supplies_purchases_report (read-only)
6. purchase_suggestions (suggests only)
7. generate_supplier_order (creates but doesn't send)
8. apply_discount (touches money) ⚠️
9. cancel_product (touches money) ⚠️
10. reopen_order (state critical) ⚠️
11. close_shift (accounting close) ⚠️

**Phase 4 (3 weeks) — First real Domain Agent + Daily Briefing:**
- Group the 5 read-only reports into `OperationsAgent` with real planner
- First proactive feature: 10am Daily Briefing pushed to owner WhatsApp

**Phase 5 (continuous) — Sunset old bot:**
- After 30+ days stable → mark `app/bot/` deprecated
- Wait 2 more weeks → delete in single commit
- Rename `app/bot_v2/` → `app/bot/`

### Hard rules for the migration

1. **Every change behind a feature flag.** No exceptions.
2. **Shadow mode before live mode.** No exceptions.
3. **Migrate by action, not by domain.** Never move 5 things at once.
4. **`classify.ts` stays as safety net.** Don't kill it — make it the veto layer for high-risk actions.
5. **Policy Engine is mandatory for any action that touches money/inventory/customers.**

### Honest ceiling without rewrite

| Metric | Today | Without rewrite | With rewrite |
|---|---|---|---|
| Cat A (reports) | 59.6 | 78-82 | 90-95 |
| Cat B (informational) | ? | 85-90 | 90-95 |
| Cat C (actions) | ? | 70-80 | 85-92 |
| Add new domain | 2-3 weeks | 2-3 weeks | 3-5 days |
| Proactive briefing | impossible | impossible | yes |
| Multi-restaurant learning | impossible | impossible | yes |

### When to start the rewrite

When ANY of these happens first:
1. Adding a feature takes >2 weeks due to scope creep
2. A bug in classify.ts breaks 3 tests that used to pass
3. User wants to add marketing/reservations as new domains

### Test plan (1000 questions, pending execution)

Proposed distribution (14 categories):
- Reports: 150 / RAG deep: 100 / Web search & regulatory: 80 / Critical actions: 80 / Bot-driven config: 100 / Multi-turn: 80 / Attendance & calendar: 60 / Manual improvement: 50 / Inventory: 80 / Marketing: 60 / Reservations: 40 / Finance: 60 / **Multi-tenant security: 100** / Edge cases: 60

Cost: ~$25 USD, 8-12h. Pending user approval to generate sample first.

### Pending user-asked deliverables (NOT yet written)

1. `growthsuite-bot-current-improvements.md` — 3-week sprint plan, ticket by ticket, to take Cat A from 59.6 → 78-82
2. `growthsuite-bot-v2-blueprint.md` — 6-block architecture blueprint with Phase 0 observability instructions
3. The 1000-question test set (sample of 50 first for review, then full 1000)

### Things NOT to do (anti-patterns we've explicitly rejected)

- ❌ Train custom models now (no action→result dataset yet)
- ❌ Start with 6 agents (start with 2: Operations + Commercial)
- ❌ Kill classify.ts in first commit (coexist with feature flag)
- ❌ Add reservations/marketing before refactor (will Frankenstein the codebase)
- ❌ Multi-agent free-talk pattern (use hierarchical orchestrator instead)
- ❌ "DomainAgent executes directly" (must go through Policy Engine first)
- ❌ Promise "add marketing = 1 file" (real cost is 90% infrastructure, 10% agent file)

---

## POS Bot — Test infrastructure

**Skill location:** `~/.openclaw/workspace/skills/pos-bot-test-plan/SKILL.md`

**Scripts:**
- `scripts/run-bot-test.sh <restaurant_id> <phone> "<text>"` — single test
- `scripts/run-suite-v2.sh <restaurant_id> <phone> <CATEGORY>` — full category

**Bot API:**
- URL: `https://pos-bot-api-production.up.railway.app`
- Secret: `super_secreto_del_bot_123`
- Provider: `test-harness`

**Test restaurants:**
- Fogo de Chão Santa Fe (id=40) — clean data, fresh credentials. Pairing: `778899`. Owner: `ricardo.mendes@fogodechao.com.mx` / `secret123`. PINs generated: cashiers `400001-400003`, waiters `500001-500013`, owner `900001`.
- La Llorona 2 (id=13) — real historical data
- Café de Tacuba (id=7) — small case

**Test categories rotation:** A→B→C→D→E→F→G→H→I→J→K→L→M (state in `memory/bot-test-rotation-fogo.json`)

**Cron job:** POS Bot Test Suite V2 runs every 4h on Codex 5.4.
