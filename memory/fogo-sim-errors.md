# Fogo Simulator Errors

## 2026-04-12 22:00 America/Mexico_City

### PRODUCTION
- Command: `cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`
- Error: `duplicate key value violates unique constraint "shift_totals_pkey"`
- PostgreSQL code: `23505`
- Failing detail: `Key (shift_id, payment_method_id)=(118216, 1) already exists.`
- Stack top:
  - `phaseClose (fogo-simulator.mjs:604:5)`
  - `main (fogo-simulator.mjs:1050:25)`

### DEV
- Command: `cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`
- Error: `duplicate key value violates unique constraint "shift_totals_pkey"`
- PostgreSQL code: `23505`
- Failing detail: `Key (shift_id, payment_method_id)=(29, 10) already exists.`
- Stack top:
  - `phaseClose (fogo-simulator.mjs:604:5)`
  - `main (fogo-simulator.mjs:1050:25)`

## 2026-04-11 22:00 America/Mexico_City

### PRODUCTION
- Command: `cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`
- Error: `null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint`
- PostgreSQL code: `23502`
- Failing detail: `Failing row contains (118216, 1, 2026-04-12 04:00:48.127351+00, 2026-04-12 04:00:48.127351+00, 209036.40, 208994.40, -42.00, t, null, null, 9712).`
- Stack top:
  - `phaseClose (fogo-simulator.mjs:535:5)`
  - `main (fogo-simulator.mjs:863:25)`

### DEV
- Command: `cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`
- Error: `null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint`
- PostgreSQL code: `23502`
- Failing detail: `Failing row contains (111221, 1, 2026-04-11 22:01:34.73695-06, 2026-04-11 22:01:34.73695-06, 285568.80, 285561.80, -7.00, t, null, null, 9407).`
- Stack top:
  - `phaseClose (fogo-simulator.mjs:535:5)`
  - `main (fogo-simulator.mjs:863:25)`

