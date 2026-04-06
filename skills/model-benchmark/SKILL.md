---
name: model-benchmark
description: Compare and benchmark different models (Opus, Sonnet, Codex) on the same task to identify strengths, document quality differences, and improve model routing decisions. Use when optimizing model selection or investigating quality variations between models.
---

# Model Benchmark Skill

Systematically compare how different models handle the same task to optimize model routing and maintain quality consistency.

## When to Use

- Testing whether a cheaper model can handle a task as well as an expensive one
- Documenting model-specific strengths and weaknesses  
- Investigating quality differences between models
- Optimizing cost vs quality tradeoffs
- Building evidence for model routing decisions

## Quick Start

1. **Define the test task** — specific, measurable, realistic
2. **Run on multiple models** — at least 2, ideally 3+ 
3. **Compare results** — quality, accuracy, approach differences
4. **Document findings** — update model playbook with insights

## Benchmark Process

### Step 1: Design the Test

**Good test tasks:**
- Specific and measurable (not vague like "be helpful")
- Representative of real work (debugging, code review, architecture)
- Time-bounded (can complete in reasonable time)
- Has clear success criteria

**Examples:**
- "Debug this authentication error" (with specific logs)
- "Review this PR for security issues" (with actual code)
- "Design database schema for user management" (with requirements)
- "Explain this complex algorithm" (with specific code block)

### Step 2: Execute on Multiple Models

For each model test:

1. **Reset context** — use fresh session or clear conversation
2. **Use identical prompt** — copy exact same input
3. **Record full interaction** — prompts, responses, tool calls
4. **Note timing** — how long each took
5. **Capture final result** — what was actually delivered

### Step 3: Compare Results

**Quality dimensions to evaluate:**

- **Accuracy** — did it solve the actual problem?
- **Completeness** — did it address all requirements?  
- **Efficiency** — appropriate tool usage, minimal steps?
- **Safety** — avoided destructive actions, security issues?
- **Communication** — clear explanations, good error handling?

**Cost analysis:**
- Token usage (input + output)
- Time to completion
- Need for follow-up corrections

### Step 4: Document Insights

Update `memory/model-comparisons.md`:

```markdown
## [Date] — [Task Type] Comparison

**Task:** [Brief description]

**Models tested:** Opus 4.6, Sonnet 4.6, Codex 5.4

**Results:**
- **Opus:** [Quality score/notes, token cost, time]
- **Sonnet:** [Quality score/notes, token cost, time]  
- **Codex:** [Quality score/notes, token cost, time]

**Key findings:**
- [Model X] was best at [specific strength]
- [Model Y] struggled with [specific weakness]
- [Model Z] was most cost-effective for [scenario]

**Routing recommendation:**
- Use [model] for [task type] because [reason]
```

## Benchmark Templates

### Code Review Benchmark

```markdown
**Test prompt:** "Review this code for security vulnerabilities, performance issues, and maintainability problems: [code block]"

**Success criteria:**
- Identifies actual vulnerabilities (if any)
- Suggests specific improvements  
- Explains reasoning clearly
- Avoids false positives

**Models to test:** Opus (baseline), Sonnet (balanced), Codex (cost-effective)
```

### Debugging Benchmark  

```markdown
**Test prompt:** "This error is occurring: [error message]. Here's the relevant code: [code]. Debug and fix it."

**Success criteria:**
- Identifies root cause correctly
- Provides working fix
- Explains why error occurred
- Uses appropriate debugging tools

**Models to test:** All available models
```

### Architecture Decision Benchmark

```markdown
**Test prompt:** "We need to [requirement]. What's the best architectural approach? Consider scalability, maintainability, and team expertise."

**Success criteria:**
- Provides multiple viable options
- Explains tradeoffs clearly  
- Considers business context
- Recommends specific choice with reasoning

**Models to test:** Opus (strategic), Sonnet (practical)
```

## Analysis Guidelines

### Quality Scoring

Use consistent 1-5 scale:

- **5 - Excellent:** Exceeds expectations, would use as-is
- **4 - Good:** Meets requirements, minor improvements possible
- **3 - Adequate:** Solves problem but has notable gaps
- **2 - Poor:** Major issues, requires significant rework  
- **1 - Failed:** Doesn't solve problem or causes new issues

### Cost Calculation

Track both direct and indirect costs:

- **Direct:** Token usage × model pricing
- **Indirect:** Time to review, need for corrections, follow-up questions

### Pattern Recognition

Look for consistent patterns across tests:

- **Model strengths:** What does each excel at?
- **Model weaknesses:** What should each avoid?
- **Cost sweet spots:** Where is each most cost-effective?
- **Use case mapping:** Which model for which scenarios?

## Common Pitfalls

### Testing Pitfalls

- **Biased prompts** — favoring one model's style
- **Cherry picking** — only testing where you expect differences  
- **Single test** — not representative of typical usage
- **Vague criteria** — can't definitively say which was better

### Analysis Pitfalls  

- **Recency bias** — overweighting recent test results
- **Cost obsession** — choosing cheaper even when quality gap is large
- **Perfectionism** — testing forever instead of making routing decisions
- **Static thinking** — not retesting as models improve

## Integration with Model Routing

### Update Playbook Rules

Based on benchmark results, update `memory/model-playbook.md`:

- Revise routing table with evidence-based recommendations
- Add specific scenarios where model performance differs significantly
- Document cost/quality tradeoffs quantitatively
- Note any model-specific adaptation strategies needed

### Implement in Practice

- Configure heartbeat and routine tasks to use most cost-effective model
- Set up fallback rules (if Model A fails, try Model B)  
- Create task-specific routing (complex debugging → Opus)
- Monitor real usage to validate benchmark predictions

## Continuous Improvement

### Regular Retesting

- **Monthly:** Quick test of core workflows
- **Quarterly:** Comprehensive benchmark of all major task types
- **Model updates:** Test new model versions when released
- **Cost review:** Validate routing decisions against actual usage

### Feedback Loop

- Track real-world model performance vs benchmarks
- Document cases where routing decisions were wrong
- Adjust routing rules based on production experience
- Share insights with team/community when relevant

---

**Remember:** The goal isn't to find the "best" model — it's to use the right model for each task to optimize both quality and cost.