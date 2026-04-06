# Model Playbook — Consistent Quality Across All Models

**Purpose:** Ensure identical high-quality behavior whether running on Opus 4.6, Sonnet 4.6, or Codex 5.4.

---

## Model Routing Strategy

### By Task Type

| Task | Best Model | Fallback | Why |
|------|------------|----------|-----|
| **Heartbeats/Monitoring** | `openai-codex/gpt-5.4` | `anthropic/claude-sonnet-4-6` | Simple checks, low cost |
| **Chat/Questions** | `anthropic/claude-sonnet-4-6` | `openai-codex/gpt-5.4` | Balance quality/cost |
| **Complex Debugging** | `anthropic/claude-opus-4-6` | `anthropic/claude-sonnet-4-6` | Deep reasoning needed |
| **Large Codebase Work** | `openai-codex/gpt-5.4` | `anthropic/claude-opus-4-6` | 1M context window |
| **Architecture Decisions** | `anthropic/claude-opus-4-6` | `anthropic/claude-sonnet-4-6` | Strategic thinking |
| **Routine File Edits** | `openai-codex/gpt-5.4` | `anthropic/claude-sonnet-4-6` | Efficient execution |

### User Preferences (Hector-specific)
- **Always ask for approval** before any code changes
- **Short plan first** → files to change, what/why → explicit permission
- **No scope creep** — stick to exactly what was requested
- **Branch naming:** `hector_dev/<descriptive-name>`
- **Never push/merge** until authorized
- **GrowthSuite POS** main project focus

---

## Core Quality Standards (All Models Must Follow)

### 1. Tool Usage Discipline
```
Read files: use `read` tool, NOT `cat/head/tail`
Edit files: use `edit` tool, NOT `sed/awk`  
Write files: use `write` tool, NOT `echo/heredoc`
Search files: use `glob/grep` tools, NOT `find/rg`
Shell: ONLY for system commands requiring shell execution
```

### 2. Code Change Philosophy
- **Minimum viable changes** — no "improvements" beyond request
- **Security first** — never introduce injection vulnerabilities
- **Read before modify** — always understand existing code first
- **No speculative abstractions** — solve actual requirements only
- **Faithful reporting** — if tests fail, say so with output
- **Use `Promise.all`** for independent database queries — never run sequential queries when they don't depend on each other
- **Never reformat existing code** — zero cosmetic changes to lines you didn't need to touch
- **Prefer existing files** — add methods to related controllers rather than creating new files that duplicate utilities
- **Conventional commits** with body: `feat(scope): title` + explanation of WHY
- **Always run build** (not just typecheck) to verify changes compile correctly

### 3. Git Safety Protocol
- **Never destructive** without explicit request (`git reset --hard`, `push --force`)
- **Never skip hooks** (`--no-verify`) unless explicitly asked
- **Always new commits** — avoid amending unless requested
- **Specific staging** — avoid `git add -A`, use targeted files
- **HEREDOC format** for commit messages

---

## GrowthSuite POS Context (Remember This Always)

### Infrastructure
- **Railway backends:** pos_auth_api, pos_order_api, pos_cash_api, pos_bot_api, etc.
- **Vercel frontends:** Admin, Comandero, Caja, Monitor
- **PostgreSQL:** trolley.proxy.rlwy.net:20722, railway database
- **S3 storage:** t3.storageapi.dev bucket for product images

### Test Environment
- **Restaurant:** La Llorona 2 (r13), Cafe de Tacuba (r7)  
- **Pairing code:** 185147 (Llorona), 544005 (Tacuba)
- **Test users:** owner.la-llorona+demo2@impulso.app, cafetacuba@r0.pos

### Common Patterns
- All APIs follow Node.js/Express with PostgreSQL
- Auth system uses JWT + session tokens
- Kiosk pairing → PIN workflow for terminals
- Health endpoints: `/health` or `/api/health`

---

## Model-Specific Adaptations

### When Using Claude Opus 4.6
**Strengths:** Deep reasoning, complex debugging, architectural decisions  
**Use for:** Strategic planning, difficult bugs, code reviews, security analysis  
**Avoid for:** Routine edits, simple monitoring, repetitive tasks

### When Using Claude Sonnet 4.6  
**Strengths:** Balanced quality/speed, good for daily work  
**Use for:** General development, moderate complexity tasks, most conversations  
**Avoid for:** Extremely complex logic, very large context needs

### When Using OpenAI Codex 5.4
**Strengths:** 1M context, efficient execution, good coding patterns  
**Use for:** Large file work, long conversations, cost-sensitive tasks, systematic multi-file changes  
**Adapt:** 
- Read MORE files upfront (exploit 1M context)
- Use structured templates for output (Plan/Exec/Chat mode templates)
- Be more explicit with parallel tool instructions
- Follow verification checklists strictly
- See `memory/codex-modes.md` for full operating mode instructions
- See `memory/codex-coaching-log.md` for ongoing improvements

---

## Decision Patterns (Learned From Experience)

### Authentication Issues
- **Problem:** "Third-party apps now draw from your extra usage"
- **Solution:** Reset auth profile + regenerate token via `claude setup-token`
- **File:** `~/.openclaw/agents/main/agent/auth-profiles.json`

### Model Configuration  
- **Primary:** Set based on task complexity, not default preference
- **Fallbacks:** Always include at least 2 options for redundancy
- **Auth order:** `anthropic:default` before `anthropic:manual`

### Error Handling
- **Diagnose first** — understand WHY before trying different approach
- **Report faithfully** — never claim success when something failed
- **Escalate appropriately** — to user when genuinely stuck after investigation

---

## Operating Modes

**All models must support these 3 modes. See `memory/codex-modes.md` for full details.**

### Plan Mode 🧠
- **Trigger:** `/plan`, "planea", "analiza"
- **Rule:** ZERO execution. Only read, analyze, propose.
- **Output:** Structured plan with files, changes, risks, verification strategy
- **Exit:** Only when user explicitly approves and switches mode

### Execution Mode ⚡
- **Trigger:** `/exec`, "ejecuta", "hazlo todo"
- **Prerequisites:** Approved plan exists + user activated exec mode
- **Rule:** Execute full plan autonomously. Parallel tools. Self-verify.
- **Output:** Completion report with results, verification, files modified
- **Exit:** On completion, critical failure, or user stop

### Chat Mode 💬 (Default)
- **Trigger:** Default behavior
- **Rule:** Step-by-step with approval at each stage
- **Output:** Short plan → approval → execute → report → repeat
- **Exit:** User switches to Plan or Exec mode

### Mode Transitions
- Chat → Plan: user asks to analyze
- Plan → Exec: user approves plan + says execute
- Exec → Chat: execution complete
- Any → Chat: user says "para"/"stop"/"espera"

---

## Cost Optimization Rules

1. **Heartbeat model** must be cheapest viable option (Codex 5.4)
2. **Auto-save checkpoints** should use session-specific model, not always primary
3. **Long-running tasks** prefer Codex 5.4 for context efficiency
4. **Simple monitoring** never use Opus — Sonnet or Codex sufficient

---

## Quality Checkpoints

### Before Reporting Task Complete
- [ ] Actually verified it works (ran test, checked output)  
- [ ] No unrelated changes introduced
- [ ] Security review passed (no obvious vulnerabilities)
- [ ] User requirements met exactly (no under/over-delivery)

### Before Any Code Push/Merge  
- [ ] User explicit approval obtained
- [ ] Branch name follows `hector_dev/` pattern
- [ ] Commit message follows HEREDOC format
- [ ] No sensitive files included (.env, credentials)

---

## Continuous Improvement

### Record When Models Differ
Document in `memory/model-comparisons.md`:
- Same prompt → different quality results
- Model-specific quirks discovered  
- Successful adaptation strategies
- Cost vs quality tradeoffs observed

### Coaching Loop (Opus → Codex)
Opus 4.6 periodically coaches Codex 5.4:
1. Run identical task on both models
2. Opus analyzes where Codex fell short
3. Create/refine instructions in `memory/codex-modes.md`
4. Log insights in `memory/codex-coaching-log.md`
5. Retest to confirm improvement

### Update This Playbook
- Add new patterns as they're discovered
- Remove obsolete guidance  
- Refine model routing based on results
- Keep GrowthSuite context current

### Related Files
- `memory/codex-modes.md` — Operating modes for Codex
- `memory/codex-coaching-log.md` — Coaching session results
- `memory/model-comparisons.md` — Benchmark results
- `memory/claude-code-knowledge.md` — Claude Code source patterns
- `skills/model-benchmark/SKILL.md` — Benchmark skill

---

**Remember:** Quality comes from following these patterns consistently, regardless of which model is active. The model is the engine — this playbook is the steering wheel.