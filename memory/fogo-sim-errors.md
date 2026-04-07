# Fogo Simulator Errors

## 2026-04-07 04:00 UTC / 2026-04-06 10:00 PM America/Mexico_City

### PRODUCTION
Command:
```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs
```

Output:
```text
🔥 Fogo de Chão Simulator v2 — 2026-04-07T04:00:14.529Z
📍 Phase: close (22:00 MX)
──────────────────────────────────────────────────
  🛡️ Safety: 17/300 orders today
🔒 PHASE: CLOSE — End of day
  🍽️ Orders: 10 created, revenue: $58493.00
  💳 Payments created: 0
  📊 Shift totals: 7 payment methods
❌ Error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
    at /Users/hectorvelasquez/.openclaw/workspace/scripts/node_modules/pg/lib/client.js:631:17
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async phaseClose (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:533:5)
    at async main (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:771:25) {
  length: 354,
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (118209, 1, 2026-04-07 04:00:35.617615+00, 2026-04-07 04:00:35.617615+00, 92491.50, 92442.50, -49.00, t, null, null, 9690).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'shift_declarations',
  column: 'cash_session_id',
  dataType: undefined,
  constraint: undefined,
  file: 'execMain.c',
  line: '2022',
  routine: 'ExecConstraints'
}

(Command exited with code 1)
```

### DEV
Command:
```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev
```

Output:
```text
🔧 DEV MODE: restaurant r9 (mapped from prod r40)

🔥 Fogo de Chão Simulator v2 — 2026-04-07T04:00:14.487Z
📍 Phase: close (22:00 MX)
──────────────────────────────────────────────────
  🛡️ Safety: 16/300 orders today
🔒 PHASE: CLOSE — End of day
  🍽️ Orders: 9 created, revenue: $49555.20
  💳 Payments created: 0
  📊 Shift totals: 6 payment methods
❌ Error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
    at /Users/hectorvelasquez/.openclaw/workspace/scripts/node_modules/pg/lib/client.js:631:17
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async phaseClose (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:533:5)
    at async main (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:771:25) {
  length: 345,
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (24, 1, 2026-04-07 04:00:30.024533+00, 2026-04-07 04:00:30.024533+00, 92173.20, 92175.20, 2.00, t, null, null, 9).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'shift_declarations',
  column: 'cash_session_id',
  dataType: undefined,
  constraint: undefined,
  file: 'execMain.c',
  line: '2022',
  routine: 'ExecConstraints'
}

(Command exited with code 1)
```

# Fogo Simulator Errors

## 2026-04-06 04:00 UTC / 2026-04-05 10:00 PM America/Mexico_City

### PRODUCTION
Command:
```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs
```

Output:
```text
🔥 Fogo de Chão Simulator v2 — 2026-04-06T04:00:16.481Z
📍 Phase: close (22:00 MX)
──────────────────────────────────────────────────
  🛡️ Safety: 12/300 orders today
🔒 PHASE: CLOSE — End of day
  🍽️ Orders: 6 created, revenue: $44429.55
  💳 Payments created: 0
  📊 Shift totals: 6 payment methods
❌ Error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
    at /Users/hectorvelasquez/.openclaw/workspace/scripts/node_modules/pg/lib/client.js:631:17
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async phaseClose (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:533:5)
    at async main (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:771:25) {
  length: 355,
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (118208, 1, 2026-04-06 04:00:33.630541+00, 2026-04-06 04:00:33.630541+00, 124829.15, 124853.15, 24.00, t, null, null, 9689).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'shift_declarations',
  column: 'cash_session_id',
  dataType: undefined,
  constraint: undefined,
  file: 'execMain.c',
  line: '2022',
  routine: 'ExecConstraints'
}

(Command exited with code 1)
```

### DEV
Command:
```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev
```

Output:
```text
🔧 DEV MODE: restaurant r9 (mapped from prod r40)

🔥 Fogo de Chão Simulator v2 — 2026-04-06T04:00:16.413Z
📍 Phase: close (22:00 MX)
──────────────────────────────────────────────────
  🛡️ Safety: 24/300 orders today
🔒 PHASE: CLOSE — End of day
  🍽️ Orders: 10 created, revenue: $59438.40
  💳 Payments created: 0
  📊 Shift totals: 7 payment methods
❌ Error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
error: null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
    at /Users/hectorvelasquez/.openclaw/workspace/scripts/node_modules/pg/lib/client.js:631:17
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async phaseClose (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:533:5)
    at async main (file:///Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs:771:25) {
  length: 349,
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (23, 1, 2026-04-06 04:00:38.326373+00, 2026-04-06 04:00:38.326373+00, 124769.60, 124725.60, -44.00, t, null, null, 8).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'shift_declarations',
  column: 'cash_session_id',
  dataType: undefined,
  constraint: undefined,
  file: 'execMain.c',
  line: '2022',
  routine: 'ExecConstraints'
}

(Command exited with code 1)
```
