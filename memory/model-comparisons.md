# Model Performance Comparisons

**Purpose:** Track how different models perform on identical tasks to optimize routing decisions.

---

## Testing Framework

**Models in rotation:**
- **Anthropic Claude Opus 4.6** — premium reasoning, highest cost
- **Anthropic Claude Sonnet 4.6** — balanced quality/cost  
- **OpenAI Codex 5.4** — 1M context, cost-effective

**Standard test format:**
1. Identical prompt across all models
2. Fresh context for each test
3. Quality score (1-5) + cost tracking
4. Specific strengths/weaknesses noted

---

## Comparison Results

### 2026-04-04 — Authentication Debugging

**Task:** Resolve "Third-party apps now draw from your extra usage" Claude error

**Models tested:** Opus 4.6, Sonnet 4.6, Codex 5.4

**Results:**
- **Opus 4.6:** ✅ Quality: 5/5, identified exact root cause (auth profile misconfiguration), provided step-by-step fix
- **Sonnet 4.6:** ⚠️ Quality: 4/5, same solution but less detailed explanation  
- **Codex 5.4:** ❓ Not tested (error was Claude-specific)

**Key findings:**
- Opus excelled at diagnosis and systematic troubleshooting
- Both Claude models understood Anthropic ecosystem better than expected
- For Claude-specific issues, use Claude models not competitors

**Routing recommendation:**
- Complex auth/config debugging → Opus 4.6
- Standard troubleshooting → Sonnet 4.6

---

## Performance Patterns Observed

### Model Strengths by Category

| Task Type | Opus 4.6 | Sonnet 4.6 | Codex 5.4 |
|-----------|----------|-------------|-----------|
| **Complex Debugging** | 🥇 Excellent systematic approach | 🥈 Good but less thorough | 🤔 TBD |
| **Code Architecture** | 🥇 Strategic thinking | 🥈 Practical solutions | 🤔 TBD |
| **Routine Edits** | 💸 Overkill/expensive | 🥇 Efficient balance | 🥈 Good value |
| **Large Context** | ⚠️ Limited context | ⚠️ Limited context | 🥇 1M tokens |
| **Cost Efficiency** | ❌ Most expensive | ⚖️ Balanced | 🥇 Most cost-effective |

### Observed Weaknesses

**Opus 4.6:**
- Expensive for simple tasks
- Sometimes over-explains obvious steps
- Can be perfectionist when "good enough" suffices

**Sonnet 4.6:**  
- Less thorough on complex reasoning
- May miss edge cases in architecture decisions
- Context window limitations for large codebases

**Codex 5.4:**
- Less domain-specific knowledge (e.g., Claude ecosystem)
- May need more explicit instructions
- Different "personality" - more direct, less collaborative tone

---

## Cost Analysis

### Token Usage Patterns

**Heartbeat tasks (simple monitoring):**
- Opus: ~200 tokens avg → $0.012 per heartbeat
- Sonnet: ~150 tokens avg → $0.006 per heartbeat  
- Codex: ~120 tokens avg → $0.001 per heartbeat

**Recommendation:** Codex for heartbeats (92% cost savings vs Opus)

**Complex debugging (multi-step):**
- Opus: ~2000 tokens → $0.12 per session, high success rate
- Sonnet: ~1500 tokens → $0.075 per session, good success rate
- Codex: ~1200 tokens → $0.012 per session, success rate TBD

---

## Routing Decisions Made

### Current Active Rules

1. **Heartbeat model:** Changed from Sonnet 4 → Codex 5.4 (cost optimization)
2. **Main session default:** Remains Opus 4.6 for complex work
3. **Fallback order:** Opus → Sonnet → Codex

### Next Testing Priorities

1. **Codex large context** — test with GrowthSuite codebase analysis  
2. **Routine file edits** — compare quality vs cost for typical changes
3. **GrowthSuite-specific tasks** — API debugging, database queries, deployment
4. **Multi-model conversations** — can cheaper model handle follow-ups after expensive model does initial analysis?

---

## Update Log

- **2026-04-04 23:30** — Initial framework established
- **2026-04-04 23:30** — Heartbeat model changed to Codex 5.4
- **2026-04-04 23:30** — Authentication debugging comparison documented

---

## Testing Queue

**High priority tests:**
- [ ] Code review task (same PR, all 3 models)
- [ ] GrowthSuite health check analysis (monitoring workflow)
- [ ] Complex architecture decision (restaurant management feature)

**Medium priority tests:**  
- [ ] Large file editing (compare context handling)
- [ ] Multi-step debugging (compare reasoning chains)
- [ ] Cost vs quality sweet spots (find break-even points)

**Low priority tests:**
- [ ] Creative tasks (documentation writing, naming)
- [ ] Learning tasks (explaining complex concepts)
- [ ] Long conversation handling (context management)

---

**Next review:** 2026-04-11 (weekly evaluation of routing decisions)