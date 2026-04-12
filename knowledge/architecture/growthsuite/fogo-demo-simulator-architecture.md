# Fogo Demo Simulator Architecture

## Purpose
The Fogo simulator exists to keep demo environments alive with believable restaurant activity across production, dev, and local environments.

It is not just a seed. It is an operational demo simulator used to sustain realistic state for the GrowthSuite brain and related product demos.

---

## Source of truth
The active simulator is **outside** the main repo:

```text
/Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs
```

This matters because the repo-local seeder can be mistaken for the real runner.

---

## Important non-goal
This file is **not** the continuous simulator:

```text
~/proyectos/growthsuite/pos-app/pos_order_api/database/seeders/fogo_dev_year_activity_seeder.ts
```

That seeder is one-shot and should not be treated as the operational simulator.

---

## Current model
The simulator was unified into one v3 script that supports three environments:
- `prod` (default)
- `--dev`
- `--local`

It also includes inventory movement support.

---

## Restaurant mapping
Current mapping used for the demo:
- **LOCAL** -> `restaurant_id = 40`
- **DEV** -> `restaurant_id = 9`
- PROD remains mapped to the live Fogo demo restaurant

This mapping is intentional and should not be "normalized" casually.

---

## Inventory schema reality
The simulator had to be corrected to match the actual `inventory_movements` schema.

Correct fields include:
- `presentation_id`
- `quantity_base`
- `movement_at`
- `notes`

Do **not** use outdated assumptions like:
- `quantity`
- `moved_at`
- `reference_note`

The validated schema across local/dev/prod is:
- `id`
- `restaurant_id`
- `warehouse_id`
- `inventory_item_id`
- `presentation_id`
- `movement_type`
- `quantity_base`
- `unit_cost`
- `total_cost`
- `movement_at`
- `reference_type`
- `reference_id`
- `notes`
- `created_at`
- `updated_at`

---

## Local cloning and inventory setup
Operational helper scripts were used to prepare local/dev demo state:
- clone Fogo operational data to local without remapping
- populate dev inventory so `restaurant_id=9` has `inventory_items`

The important durable lesson is that the simulator depends on environment prep being coherent, especially inventory state.

---

## Cron
The simulator is expected to run through a single cron that executes environments in series:
- prod -> dev -> local

Validated cron id at the time of this note:

```text
3ebafb38-9e96-4fac-8060-1ed54ec77eae
```

Human-readable name used:

```text
Fogo de Chão Demo Simulator v3 (prod+dev+local)
```

The practical lesson is important:
**never assume a cron is valid just because someone says it exists. Validate it in code and operation.**

---

## Relationship to brain quality
The simulator was not the root cause of the `hoy = $0` bug in the brain.
That issue came from query/date handling in the brain layer, not from missing demo activity.

This distinction matters:
- simulator problems affect data freshness / realism
- query/timezone problems affect interpretation of already-existing data

---

## Sharing guidance for teammates
What teammates should know:
- the real simulator lives in the OpenClaw workspace, not only in the repo
- the repo seeder is not the continuous runner
- local/dev/prod mappings are intentional
- inventory schema assumptions must match reality
- cron validation must be operational, not assumed

What should **not** be copied casually into broad docs:
- passwords
- secret connection strings
- local-only env values
- transient generated output files
