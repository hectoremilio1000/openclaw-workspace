# Codex 5.4 Coaching Log

**Purpose:** Track coaching sessions where Opus analyzes and improves Codex performance.

---

## Session 1 — 2026-04-04 (Initial Framework)

### Coach: Claude Opus 4.6
### Subject: Codex 5.4 operating capability

### Analysis of Claude Code Source (from /Users/hectorvelasquez/Downloads/src)

**Key patterns extracted:**

1. **Mode Architecture:**
   - Claude Code has explicit plan mode (read-only, strategic thinking)
   - Execution uses parallel tool calls aggressively
   - Verification agent runs independently after implementation
   - Permission modes: plan, auto, normal (maps to our Plan/Exec/Chat)

2. **Agent System:**
   - Subagents inherit context OR start fresh (fork vs spawn)
   - Forks share prompt cache (cheap), fresh agents get full briefing
   - "Never delegate understanding" — prove you understood before delegating
   - Background tasks with notification system (don't poll, trust notification)

3. **Tool Discipline:**
   - Dedicated tools ALWAYS over shell commands
   - Parallel calls for independent operations (critical for speed)
   - File read required before any edit/write
   - Shell reserved for true system commands only

4. **Quality Patterns:**
   - Minimum viable changes (no gold-plating)
   - Faithful reporting (never fake success)
   - Self-verification before reporting complete
   - Diagnosis before tactic-switching

### Instructions Created for Codex

1. **`memory/codex-modes.md`** — 3-mode operating system (Plan/Exec/Chat)
2. **`memory/model-playbook.md`** — Universal quality standards
3. **`memory/claude-code-knowledge.md`** — Source-level patterns

### Gaps Identified for Future Coaching

- [ ] **Parallel execution quality** — does Codex actually use parallel tools effectively?
- [ ] **Plan quality** — how structured are Codex's plans vs Opus's?
- [ ] **Self-verification** — does Codex catch its own errors?
- [ ] **Context utilization** — is Codex actually leveraging its 1M window?
- [ ] **GrowthSuite domain knowledge** — can Codex navigate the project as well?

### Next Coaching Session Goals
1. Run identical GrowthSuite task on both models
2. Compare plan quality (Plan Mode test)
3. Compare execution efficiency (Exec Mode test)
4. Document specific instruction refinements needed

---

## Testing Queue

### Test 1: Plan Mode Quality
**Task:** "Plan how to add a new payment method to GrowthSuite POS"
**Run on:** Opus 4.6 (baseline), then Codex 5.4 (with codex-modes.md loaded)
**Compare:** Structure, completeness, risk identification, feasibility
**Status:** ✅ PASSED (health check variant)

**Results (2026-04-05 00:13):**
- Codex correctly detected Plan Mode from natural language triggers
- Produced full structured plan matching codex-modes.md template
- Zero execution violations — didn't touch any files
- Risk identification: thorough (auth middleware, prefixes, TS/JS, duplication)
- Plan quality: 4.5/5 — systematic, honest about unknowns, no assumptions
- Followed "read before modify" principle

**Exec Mode simulation:**
- Correctly described tool order, parallelization strategy
- Self-verification checklist was concrete and complete
- Execution report template matched codex-modes.md format
- Quality: 5/5

**Chat Mode transition:**
- Correctly detected "espera, vamos paso a paso" as Chat Mode trigger
- Proposed first step as read-only inspection
- Asked for explicit approval before proceeding
- Quality: 5/5

**Overall score: 4.8/5** — Codex 5.4 with playbook+modes instructions performed at near-Opus level

### Test 2: Execution Mode Efficiency
**Task:** "Fix a bug in pos_order_api health endpoint" (staged scenario)
**Run on:** Both models with identical instructions
**Compare:** Tool usage, parallelism, self-verification, accuracy
**Status:** ⏳ Pending

### Test 3: Long Context Task
**Task:** "Analyze the entire pos_auth_api codebase and create architecture doc"
**Run on:** Codex 5.4 only (leverages 1M context)
**Compare:** Against manually written architecture doc
**Status:** ⏳ Pending

### Test 4: Chat Mode Collaboration
**Task:** "Debug a real user-reported issue" (organic)
**Run on:** Both models in Chat Mode
**Compare:** Question quality, diagnosis accuracy, communication clarity
**Status:** ⏳ Pending

---

## Coaching Insights

### What Codex 5.4 Needs Most (Initial Assessment)
1. **Structured templates** — Codex benefits more from explicit output formats
2. **Explicit mode instructions** — less implicit mode-switching than Claude
3. **Parallel execution prompting** — needs to be told to parallelize more explicitly
4. **Verification checklists** — benefits from concrete verification steps
5. **Domain context preloading** — leverage 1M window by reading more upfront

### What Codex 5.4 Already Does Well
1. Large context handling — can hold entire projects
2. Cost efficiency — more work per dollar
3. Code generation — solid code output quality
4. Following explicit instructions — very instruction-following

### Coaching Strategy
- **Don't try to make Codex think like Claude** — leverage its own strengths
- **Provide more structure** where Claude uses implicit reasoning
- **Exploit context window** — read more, assume less
- **Explicit verification** — checklist-driven quality gates

---

## Session 2 — 2026-04-05 (Real Code Benchmarks)

### Coach: Claude Opus 4.6 (as main session model)
### Subject: Codex 5.4 real-world coding quality

### Round 1 — Simple endpoint (delivery stats)
- Codex: 26/30, Opus: 24/30
- Codex better: Promise.all, minimal changes, reused controller
- Opus better: commit messages, status mapping completeness
- **Playbook updated:** added Promise.all rule, no reformat rule, conventional commits

### Round 2 — Complex system (webhook retry)
- Codex: 29/30, Opus: 28.5/30
- Codex better: static methods, single clean commit
- Opus better: thorough integration
- Both timed out on first attempt (complex task)
- **Playbook updated:** branch verification, static preference, single commit rule

### Round 3 — Provider health monitor (most complex)
- **Both produced IDENTICAL code** (254 lines, same service, same controller, same routes)
- Both: tsc clean, build pass, correct branch, conventional commit
- Both: verified branch before committing
- Score: **30/30 tie**

### Key Insight
**With the playbook + codex-modes.md, Codex 5.4 converged to produce identical output as Opus 4.6.** The coaching system works — quality is now instruction-driven, not model-driven.

### Cumulative Scores
| Round | Codex 5.4 | Opus 4.6 |
|-------|-----------|----------|
| 1 (simple) | 26/30 | 24/30 |
| 2 (complex) | 29/30 | 28.5/30 |
| 3 (advanced) | 30/30 | 30/30 |
| **TOTAL** | **85/90** | **82.5/90** |

---

## Update Schedule
- After each coaching session, append results here
- Weekly: review and refine codex-modes.md based on findings
- Monthly: major playbook revision based on accumulated insights

**Last updated:** 2026-04-04 23:43 CST
