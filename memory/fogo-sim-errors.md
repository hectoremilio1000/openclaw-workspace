# Fogo Simulator Errors

## 2026-04-05 05:14 UTC (Sat Apr 4, 23:14 MX)

**Phase:** close (end of day)  
**Error:** Same on BOTH production and dev  

```
null value in column "cash_session_id" of relation "shift_declarations" violates not-null constraint
```

### Production (r40)
- Orders today: 20/300 safety limit
- Orders created this run: 11, revenue: $72,418.80
- Payments created: 1
- Shift totals: 7 payment methods
- **Failed at:** `phaseClose` → INSERT into `shift_declarations` with `cash_session_id = null`
- Failing row: `(118207, 1, ..., 119007.90, 119001.90, -6.00, t, null, null, 9688)`

### Dev (r9, mapped from prod r40)
- Orders today: 23/300 safety limit
- Orders created this run: 5, revenue: $37,468.00
- Payments created: 0
- Shift totals: 7 payment methods
- **Failed at:** `phaseClose` → INSERT into `shift_declarations` with `cash_session_id = null`
- Failing row: `(22, 1, ..., 74553.20, 74521.20, -32.00, t, null, null, 7)`

### Root Cause
The `phaseClose` function at line ~533 in `fogo-simulator.mjs` tries to insert a `shift_declarations` row without providing a `cash_session_id`. The column has a NOT NULL constraint. The simulator needs to either:
1. Find/create a valid `cash_session_id` before inserting the declaration
2. Or the schema needs to allow nullable `cash_session_id`

### Status: **Unresolved** — needs fix in simulator script
