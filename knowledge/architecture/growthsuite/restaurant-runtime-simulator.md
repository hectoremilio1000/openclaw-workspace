# Restaurant Runtime Simulator

## Purpose

Turn Fogo de Chão into a continuously-operating demo/runtime environment, not just a one-shot seeder.

The simulator should keep `main`, `dev`, and `local` populated with coherent operational state so the bot, brain, reports, and future decision layers can be tested against believable restaurant activity.

---

## Product goal

Support this chain consistently:

```text
operational data -> state -> diagnosis -> response/action -> validation
```

The simulator exists so the restaurant brain can answer questions like:
- quién llegó tarde
- cuántas cuentas siguen abiertas
- qué vendimos hoy
- qué insumo está en riesgo
- ya se cerró el turno
- quién salió temprano

---

## Runtime modules

### 1. scenario-planner
Defines the current operational frame:
- phase of day
- service profile
- expected covers/sales
- attendance incidents
- inventory pressure
- operational risks

### 2. attendance-simulator
Generates:
- schedules
- check-ins / check-outs
- tardiness / no-show incidents
- active staff by role and area

### 3. operations-simulator
Generates:
- shift open/close
- cash session open/close
- orders
- payments
- discounts
- cancellations
- close events / Corte X-Z

### 4. inventory-simulator
Generates:
- purchases / receptions
- consumption from sales
- waste
- low-stock pressure
- replenishment signals

### 5. consistency-verifier
Validates:
- no closed shift with open orders
- no impossible payments
- attendance coherent with operation
- inventory not absurd
- consumption aligned to sales
- close artifacts valid

### 6. bot-evaluator
Asks the bot/brain/reporting layer about the simulated day and compares expected vs observed.

---

## Phase A scope

Phase A is intentionally conservative.

It should:
- keep the current cron-compatible simulator working
- extract scenario planning into a separate module
- emit runtime artifacts after each run
- prepare the script to split into modules without breaking production/dev/local usage

It should **not** try to finish the full validator/evaluator in the same step.

## Phase B scope

Phase B adds a first useful `consistency-verifier`.

It should validate at least:
- open shift expectations by phase
- closed shifts without leaked open orders
- obviously impossible settled payments
- attendance presence when there are orders
- check-in/check-out balance sanity
- inventory negative-balance warnings
- expected vs observed sales/order ranges

The verifier should not silently fail. Its result must land in the runtime artifact as machine-readable `ok/issues/warnings`.

It should separate two different signals:
- `runConsistency`: what this exact execution created or failed to create
- `dayHealth`: the accumulated health of the restaurant day after the run

Do not mix these two. Otherwise repeated runs create noisy false alarms for expected-vs-observed checks.

---

## Artifacts

Each run should leave a machine-readable artifact containing:
- environment
- phase
- scenario plan
- operational totals
- inventory totals
- step summaries
- status/error

Current artifact directory:

```text
/Users/hectorvelasquez/.openclaw/workspace/artifacts/fogo-runtime/
```

These artifacts are the bridge between:
- simulator output
- future consistency verification
- future bot evaluation
- regression tracking across local/dev/main

---

## Environment contract

The runtime must support:
- `prod` (default)
- `--dev`
- `--local`

The meaning is operational, not cosmetic:
- all three environments should simulate the same kind of restaurant
- but intensity, coverage, and safety limits can differ by environment

---

## Design rule

Do not treat this as:

```text
script that inserts data
```

Treat it as:

```text
restaurant runtime + evaluator harness
```

That framing is what makes it useful for the bot architecture under construction.
