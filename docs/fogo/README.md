# Fogo de Chão Operator Pack

Este folder documenta cómo correr y portar el runtime/simulator de Fogo de Chão entre computadoras OpenClaw.

## Objetivo

No tratar Fogo como un script suelto que “mete datos”, sino como un runtime operacional continuo para:
- simular operación viva
- alimentar reportes, asistencia, inventario y bot
- correr en `prod`, `dev` y `local`
- dejar trazabilidad clara para otra máquina

## Qué leer primero

1. `docs/fogo/simulator-runbook.md`
2. `docs/fogo/cron-bootstrap.md`
3. `docs/openclaw/second-machine-setup.md`

## Resumen operativo

- Cron principal: `Fogo de Chão Demo Simulator v3 (prod+dev+local)`
- Corre en serie: `PRODUCTION -> DEV -> LOCAL`
- Schedule actual: `0 9-23,0-3 * * *` en `America/Mexico_City`
- Modelo operativo: `openai-codex/gpt-5.4`
- Si `LOCAL` no tiene PostgreSQL o no hay turno abierto, eso puede terminar en `skip` y no necesariamente es bug.
- El error recurrente conocido no está en local: el patrón visible hoy apunta a `DEV` con `order_items_route_area_id_foreign`.

## Hallazgos durables ya observados

- `PROD` y `LOCAL` sí han generado órdenes útiles en corridas previas.
- `DEV` ha fallado repetidamente al crear `order_items` por foreign key `order_items_route_area_id_foreign`.
- En algunas ventanas `LUNCH`, `PROD` y `LOCAL` quedan en `NO_SHIFT`, lo cual causa `skip` normal, no fallo.
- Una corrida falló por política de exec del cron, no por el simulador. La política interactiva bloqueó el comando antes de arrancar.

## Fuentes relacionadas

- `memory/fogo-sim-errors.md`
- `memory/2026-04-14.md`
- `knowledge/architecture/growthsuite/restaurant-runtime-simulator.md`
