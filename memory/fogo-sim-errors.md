# Fogo simulator errors

## 2026-05-06 15:00 UTC / 2026-05-06 09:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
`exec denied: Cron runs cannot wait for interactive exec approval.`

Policy details returned by tool:
- Effective host exec policy: `security=allowlist ask=on-miss askFallback=allowlist`
- The command was blocked before simulator execution started
- Tool suggested fixes:
  - align policy to `security="full"` and `ask="off"` for trusted local automation
  - keep allowlist mode and add an explicit allowlist entry for this command
  - rerun interactively with exec approvals enabled

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Not attempted, because the required production-first series was blocked by cron exec policy before run 1 could start.

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Not attempted, because the required production-first series was blocked by cron exec policy before run 1 could start.

## 2026-05-06 19:00 UTC / 2026-05-06 13:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-06`
- Restaurant: `r40`
- Shift state: `NO_SHIFT`
- Coverage before run: `0o/0p`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`
- Window summary: `0 orders, $0.00 revenue`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-06`
- Shift: `OPEN #49`
- Coverage before run: `0o/0p`
- Flipped `1` open → printed
- Coverage after run reported `open=2, printed=2`
- Window summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LUNCH`
- Business date: `2026-05-06`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`
- Window summary: `0 orders, $0.00 revenue`

## 2026-05-06 06:00 UTC / 2026-05-06 00:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Coverage before run: `7o/2p`
- Closed lingering orders: `4` (5 still active: 3 open, 2 printed)
- Orders created: `2`
- Revenue: `$14175.20`
- Check-outs: `10`
- Inventory: `0 purchases, 3 consumptions, 3 waste`
- Coverage after run: `open=3/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `2o/4p`
- Closed lingering orders: `1` (5 still active: 2 open, 3 printed)
- Window summary reported `0 orders, $0.00 revenue`
- Check-outs: `7`
- Inventory: `0 purchases, 2 consumptions, 4 waste`
- Coverage after run reported `open=2/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Coverage before run: `4o/4p`
- Closed lingering orders: `1` (7 still active: 3 open, 4 printed)
- Orders created: `1`
- Revenue: `$2958.00`
- Check-outs: `8`
- Inventory: `0 purchases, 3 consumptions, 2 waste`
- Coverage after run: `open=3/2 printed=4/2`

## 2026-05-05 06:00 UTC / 2026-05-05 00:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `2o/3p`
- Rotated out: `1`
- Orders created: `1`
- Revenue: `$1821.20`
- Rotated in: `1`
- Coverage after run: `open=2/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation warning/error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `3o/2p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `4o/2p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=4/2 printed=2/2`

## 2026-05-05 05:00 UTC / 2026-05-04 23:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `3o/2p`
- Rotated out: `1`
- Orders created: `1`
- Revenue: `$8044.60`
- Rotated in: `1`
- Coverage after run: `open=2/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation warning/error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `3o/2p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=2/2`
- The warning appeared at the end of the combined series output, but the failing behavior matches the known DEV foreign key issue.

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `4o/2p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=4/2 printed=2/2`

## 2026-05-05 04:00 UTC / 2026-05-04 22:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `3o/3p`
- Closed lingering orders: `1`
- Check-outs: `7`
- Inventory: `0 purchases, 6 consumptions, 5 waste`
- Coverage after run: `open=3/2 printed=2/2`
- Window summary: `0 orders, $0.00 revenue`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `3o/3p`
- Closed lingering orders: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Check-outs: `5`
- Inventory: `0 purchases, 2 consumptions, 2 waste`
- Coverage after run reported `open=3/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `5o/4p`
- Closed lingering orders: `3`
- Check-outs: `5`
- Inventory: `0 purchases, 6 consumptions, 1 waste`
- Coverage after run: `open=4/2 printed=2/2`
- Window summary: `0 orders, $0.00 revenue`

## 2026-05-05 03:01 UTC / 2026-05-04 21:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `3o/3p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$3949.80`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `4o/2p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `5o/4p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$9570.00`
- Rotated in: `2`
- Coverage after run: `open=5/2 printed=4/2`

## 2026-05-05 02:00 UTC / 2026-05-04 20:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `4o/2p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$10266.00`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `4o/2p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=4/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `4o/5p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$13044.20`
- Rotated in: `2`
- Coverage after run: `open=5/2 printed=4/2`

# Fogo simulator errors

## 2026-05-05 00:00 UTC / 2026-05-04 18:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `4o/4p`
- Closed lingering orders: `3`
- Orders created: `17`
- Revenue: `$62350.00`
- Check-ins: `14`
- Reservations seated: `4 lunch seated`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run: `open=4/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `3o/3p`
- Closed lingering orders: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `9`
- Reservations seated: `11 lunch seated`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run reported `open=4/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `DINNER`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `3o/2p`
- Orders created: `8`
- Revenue: `$41325.00`
- Check-ins: `12`
- Reservations seated: `6 lunch seated`
- Inventory: `0 purchases, 7 consumptions, 0 waste`
- Coverage after run: `open=4/2 printed=5/2`


## 2026-05-04 23:00 UTC / 2026-05-04 17:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `5o/4p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$12818.00`
- Rotated in: `2`
- Coverage after run: `open=4/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `4o/2p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Coverage before run: `2o/3p`
- Rotated out: `1`
- Orders created: `1`
- Revenue: `$9842.60`
- Rotated in: `1`
- Coverage after run: `open=3/2 printed=2/2`


## 2026-05-04 07:00 UTC / 2026-05-04 01:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `3o/5p`
- Rotated out: `1`
- Orders created: `1`
- Revenue: `$5179.40`
- Rotated in: `1`
- Coverage after run: `open=2/2 printed=6/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `3o/3p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`


## 2026-05-02 20:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `3o/7p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$8415.80`
- Rotated in: `2`
- Coverage after run: `open=5/2 printed=5/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #45`
- Coverage before run: `8o/5p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=7/2 printed=6/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 19:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `3o/7p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$4500.80`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=7/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #45`
- Coverage before run: `8o/5p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=8/2 printed=5/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 18:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `2o/6p`
- Closed lingering orders: `3`
- Orders created: `23`
- Revenue: `$104869.80`
- Check-ins: `13`
- Reservations seated: `5`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run: `open=3/2 printed=7/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 13/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 14/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 15/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 16/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 17/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 18/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 19/19 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-02`
- Shift: `OPEN #45`
- Coverage before run: `2o/5p`
- Closed lingering orders: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `9`
- Reservations seated: `5`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run reported `open=8/2 printed=5/2`


## 2026-05-02 16:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `3o/5p`
- Orders created: `2`
- Revenue: `$8636.20`
- Coverage after run: `open=2/2 printed=6/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window: `AFTERNOON`
- Business date: `2026-05-02`
- Shift: `OPEN #45`
- Coverage before run: `3o/4p`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=5/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 15:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `3o/3p`
- Orders created: `21`
- Revenue: `$80840.40`
- Inventory: `0 purchases, 9 consumptions, 0 waste`
- Coverage after run: `open=3/2 printed=5/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/10 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window: `AFTERNOON`
- Business date: `2026-05-02`
- Shift: `OPEN #45`
- Coverage before run: `2o/4p`
- Window summary reported `0 orders, $0.00 revenue`
- Inventory: `0 purchases, 1 consumptions, 0 waste`
- Coverage after run reported `open=3/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

## 2026-05-02 13:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `4o/2p`
- Orders created: `1`
- Revenue: `$8114.20`
- Coverage after run: `open=4/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 11:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `3o/3p`
- Orders created: `2`
- Revenue: `$9715.00`
- Coverage after run: `open=4/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=4/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 10:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors written after the simulator summary while the process still exited with code 0:
`Order 1/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 13/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 14/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 15/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 16/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 17/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 18/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 19/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 20/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 21/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 22/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 23/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 24/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 25/25 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-02 09:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors written to stderr while the process still exited with code 0:
`Order 1/5 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/5 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/5 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/5 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/5 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`


## 2026-05-01 13:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
`exec denied: Cron runs cannot wait for interactive exec approval.`

Policy details returned by tool:
- Effective host exec policy: `security=allowlist ask=on-miss askFallback=allowlist`
- The command was blocked before simulator execution started

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Not attempted, because the required production-first series was blocked by cron exec policy before run 1 could start.

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Not attempted, because the required production-first series was blocked by cron exec policy before run 1 could start.


## 2026-04-29 23:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator still exited with code 0
- Window summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.


## 2026-04-29 21:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator still exited with code 0
- Maintenance summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.


## 2026-04-29 19:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
`exec denied: Cron runs cannot wait for interactive exec approval.`

Policy details returned by tool:
- Effective host exec policy: `security=allowlist ask=on-miss askFallback=allowlist`
- Suggested fixes from tool output:
  - align both files to `security="full"` and `ask="off"` for trusted local automation
  - keep allowlist mode and add an explicit allowlist entry for this command
  - enable Web UI, terminal UI, or chat exec approvals and rerun interactively

### DEV
Not attempted because the cron exec policy blocked the first production command, so the required series could not start.

### LOCAL
Not attempted because the cron exec policy blocked the first production command, so the required series could not start.

## 2026-04-29 20:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator still exited with code 0
- Maintenance summary reported `0 orders, $0.00 revenue`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.


## 2026-05-02 12:02 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-02`
- Shift: `OPEN #118268`
- Coverage before run: `4o/2p`
- Orders created: `2`
- Revenue: `$6861.40`
- Coverage after run: `open=4/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=4/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

## 2026-05-03 09:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `PREP`
- Business date: `2026-05-03`
- Shift: `OPEN #118269`
- Orders created: `7`
- Revenue: `$24549.40`
- Check-ins: `12`
- Reservations created: `14`
- Inventory: `26 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 1/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `PREP`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `9`
- Reservations created: `9`
- Inventory: `18 purchases, 0 consumptions, 0 waste`
- Coverage after run reported `open=2/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

## 2026-05-03 10:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `2o/2p`
- Orders created: `25`
- Revenue: `$120304.70`
- Check-ins: `7`
- Inventory: `13 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=4/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 13/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 14/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 15/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 16/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 17/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 18/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 19/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 20/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 21/21 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `2o/2p`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `3`
- Inventory: `5 purchases, 0 consumptions, 0 waste`
- Coverage after run reported `open=4/2 printed=5/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

## 2026-05-03 11:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `4o/4p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$12533.80`
- Rotated in: `2`
- Coverage after run: `open=4/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `4o/5p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=5/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Failed to connect to local PostgreSQL:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

## 2026-05-03 12:42 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `4o/4p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$3433.60`
- Rotated in: `2`
- Coverage after run: `open=4/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `5o/4p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=6/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `LUNCH` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `window — ACQUIRE_WINDOW_LOCK → ANOMALY → ENSURE_COVERAGE`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-03 13:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `4o/4p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$13572.00`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=5/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `3o/6p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=7/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `LUNCH` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LUNCH`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-03 15:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `3o/5p`
- Closed lingering orders: `3`
- Orders created: `8`
- Revenue: `$29764.00`
- Inventory: `0 purchases, 12 consumptions, 0 waste`
- Coverage after run: `open=3/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `2o/7p`
- Closed lingering orders: `4`
- Window summary reported `0 orders, $0.00 revenue`
- Inventory: `0 purchases, 1 consumptions, 0 waste`
- Coverage after run reported `open=3/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `AFTERNOON` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `window — ACQUIRE_WINDOW_LOCK → ANOMALY → ENSURE_COVERAGE`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-03 16:02 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `3o/3p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$7743.00`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `3o/4p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `AFTERNOON` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-04 02:00 UTC / 2026-05-03 20:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `2o/4p`
- Closed lingering orders: `1`
- Orders created: `14`
- Revenue: `$61480.00`
- Reservations seated: `3 lunch seated`
- Inventory: `0 purchases, 9 consumptions, 0 waste`
- Coverage after run: `open=3/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/12 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `2o/5p`
- Closed lingering orders: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Reservations seated: `3 lunch seated`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run reported `open=2/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `DINNER` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `DINNER`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `window — ACQUIRE_WINDOW_LOCK → ANOMALY → ENSURE_COVERAGE`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-03 17:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `3o/3p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$6345.20`
- Rotated in: `2`
- Coverage after run: `open=2/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `3o/4p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=5/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `AFTERNOON` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-04 05:00 UTC / 2026-05-03 23:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `3o/3p`
- Closed lingering orders: `1`
- Orders created: `6`
- Revenue: `$33047.90`
- Check-outs: `4`
- Inventory: `0 purchases, 8 consumptions, 3 waste`
- Coverage after run: `open=2/2 printed=6/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `2o/4p`
- Closed lingering orders: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Check-outs: `2`
- Inventory: `0 purchases, 2 consumptions, 1 waste`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `LATE_NIGHT` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `window — ACQUIRE_WINDOW_LOCK → ANOMALY → ENSURE_COVERAGE`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-04 06:00 UTC / 2026-05-04 00:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Restaurant: `r40`
- Shift: `OPEN #118269`
- Coverage before run: `2o/6p`
- Rotated out: `1`
- Orders created: `1`
- Revenue: `$8317.20`
- Rotated in: `1`
- Coverage after run: `open=3/2 printed=5/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift: `OPEN #46`
- Coverage before run: `3o/3p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success, but no shift was open for the `LATE_NIGHT` window.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LATE_NIGHT`
- Business date: `2026-05-03`
- Shift state: `NO_SHIFT`
- Plan: `skip — SKIP`
- Audit reported `coverage ok (open=0, printed=0)`

## 2026-05-04 15:00 UTC / 2026-05-04 09:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `PREP`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Orders created: `7`
- Revenue: `$22446.00`
- Check-ins: `14`
- Reservations created: `11`
- Inventory: `21 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `PREP`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `7`
- Reservations created: `14`
- Inventory: `16 purchases, 0 consumptions, 0 waste`
- Coverage after run reported `open=2/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `PREP`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Orders created: `6`
- Revenue: `$28367.80`
- Check-ins: `16`
- Reservations created: `9`
- Inventory: `12 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2/2 printed=2/2`

## 2026-05-04 22:36 UTC / 2026-05-04 16:36 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Restaurant: `r40`
- Shift: `OPEN #118270`
- Coverage before run: `2o/2p`
- Orders created: `25`
- Revenue: `$102497.60`
- Check-outs: `3`
- Inventory: `0 purchases, 6 consumptions, 0 waste`
- Coverage after run: `open=5/2 printed=4/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 13/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 14/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 15/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 16/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 17/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 18/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 19/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 20/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 21/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 22/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 23/23 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Shift: `OPEN #47`
- Coverage before run: `2o/2p`
- Window summary reported `0 orders, $0.00 revenue`
- Check-outs: `3`
- Inventory: `0 purchases, 1 consumptions, 0 waste`
- Coverage after run reported `open=4/2 printed=2/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-04`
- Shift: `OPEN #111241`
- Orders created: `15`
- Revenue: `$92171.00`
- Check-outs: `5`
- Inventory: `0 purchases, 4 consumptions, 0 waste`
- Coverage after run: `open=2/2 printed=3/2`

## 2026-05-05 15:01 UTC / 2026-05-05 09:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `PREP`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Orders created: `5`
- Revenue: `$20369.60`
- Check-ins: `11`
- Reservations created: `14`
- Inventory: `24 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2, printed=2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 1/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/4 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `PREP`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `7`
- Reservations created: `13`
- Inventory: `10 purchases, 0 consumptions, 0 waste`
- Coverage after run reported `open=2, printed=2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `PREP`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Orders created: `6`
- Revenue: `$29701.80`
- Check-ins: `18`
- Reservations created: `8`
- Inventory: `14 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2, printed=2`

## 2026-05-05 16:00 UTC / 2026-05-05 10:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Orders created: `23`
- Revenue: `$99292.20`
- Check-ins: `7`
- Inventory: `11 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=5/2 printed=3/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 10/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 11/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 12/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 13/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 14/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 15/15 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `5`
- Inventory: `6 purchases, 0 consumptions, 0 waste`
- Coverage after run reported `open=5/2 printed=3/2`
- The foreign key warnings were emitted after the combined series output completed, but they align with the DEV run because LOCAL created 11 orders successfully.

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LUNCH`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Orders created: `11`
- Revenue: `$61671.40`
- Check-ins: `2`
- Inventory: `4 purchases, 0 consumptions, 0 waste`
- Coverage after run: `open=2/2 printed=6/2`

## 2026-05-05 18:00 UTC / 2026-05-05 12:00 America/Mexico_City cron run

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `5o/3p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=4/2 printed=4/2`

## 2026-05-05 19:00 UTC / 2026-05-05 13:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `LUNCH`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Coverage before run: `5o/3p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$9268.40`
- Rotated in: `2`
- Coverage after run: `open=6/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/2 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `LUNCH`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `4o/4p`
- Rotated out: `2`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=3/2 printed=5/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `LUNCH`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Coverage before run: `3o/5p`
- Rotated out: `2`
- Orders created: `2`
- Revenue: `$12771.60`
- Rotated in: `2`
- Coverage after run: `open=3/2 printed=5/2`

## 2026-05-05 20:00 UTC / 2026-05-05 14:00 America/Mexico_City cron run

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Failed with connection reset:
`Error: read ECONNRESET`

Context:
- Exit code was `1`
- Restaurant mapping banner printed: `DEV MODE: restaurant r9 (mapped from prod r40)`
- No simulator summary was emitted after the connection error

## 2026-05-05 21:01 UTC / 2026-05-05 15:01 America/Mexico_City cron run

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/3 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `3o/5p`
- Closed lingering orders: `3` (5 still active: 2 open, 3 printed)
- Window summary reported `0 orders, $0.00 revenue`
- Inventory: `0 purchases, 1 consumptions, 0 waste`
- Coverage after run reported `open=3/2 printed=3/2`

## 2026-05-05 22:01 UTC / 2026-05-05 16:01 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Coverage before run: `3o/2p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=3/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation warning/error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `3o/3p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Coverage before run: `2o/3p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=2/2 printed=3/2`

## 2026-05-05 23:00 UTC / 2026-05-05 17:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Coverage before run: `3o/2p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=3/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation warning/error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `2o/4p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=4/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `AFTERNOON`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Coverage before run: `2o/3p`
- Window summary: `0 orders, $0.00 revenue`
- Coverage after run: `open=2/2 printed=3/2`

## 2026-05-06 01:00 UTC / 2026-05-05 19:00 America/Mexico_City cron run

### PRODUCTION
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs`

Result:
Success.

Summary:
- Loaded 5 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Window: `DINNER`
- Business date: `2026-05-05`
- Restaurant: `r40`
- Shift: `OPEN #118272`
- Coverage before run: `3o/2p`
- Orders created: `15`
- Revenue: `$52490.00`
- Check-ins: `12`
- Reservations seated: `5 lunch seated`
- Inventory: `0 purchases, 9 consumptions, 0 waste`
- Coverage after run: `open=7/2 printed=2/2`

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation errors while the process still exited with code 0:
`Order 1/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 2/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 3/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 4/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 5/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 6/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 7/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 8/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`
`Order 9/9 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `2o/4p`
- Closed lingering orders: `1` (5 still active: 2 open, 3 printed)
- Window summary reported `0 orders, $0.00 revenue`
- Check-ins: `8`
- Reservations seated: `5 lunch seated`
- Inventory: `0 purchases, 2 consumptions, 0 waste`
- Coverage after run reported `open=3/2 printed=3/2`

### LOCAL
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local`

Result:
Success.

Context:
- Loaded 9 areas, 2 cash stations
- Loaded users: WAITERS:13, CASHIERS:3, CHEFS:4, CHURRASQUEIROS:5, HOSTESSES:2, MANAGERS:2
- Restaurant: `r40`
- Window: `DINNER`
- Business date: `2026-05-05`
- Shift: `OPEN #111242`
- Coverage before run: `2o/3p`
- Orders created: `7`
- Revenue: `$26465.40`
- Check-ins: `13`
- Reservations seated: `6 lunch seated`
- Inventory: `0 purchases, 10 consumptions, 0 waste`
- Coverage after run: `open=3/2 printed=5/2`

## 2026-05-06 02:00 UTC / 2026-05-05 20:00 America/Mexico_City cron run

### DEV
Command:
`cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev`

Result:
Completed with order-generation warning/error while the process still exited with code 0:
`Order 1/1 failed: insert or update on table "order_items" violates foreign key constraint "order_items_route_area_id_foreign"`

Context:
- Simulator summary still reported `✅ Complete`
- Exit code was `0`
- Restaurant: `r9`
- Window: `DINNER`
- Business date: `2026-05-05`
- Shift: `OPEN #48`
- Coverage before run: `3o/3p`
- Rotated out: `1`
- Window summary reported `0 orders, $0.00 revenue`
- Coverage after run reported `open=2/2 printed=4/2`
