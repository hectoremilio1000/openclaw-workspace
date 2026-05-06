# Fogo Cron Bootstrap

Este documento explica cómo recrear el cron de Fogo en otra computadora OpenClaw.

## Importante

Los cron jobs de OpenClaw no viven solo en git.
Clonar `~/.openclaw/workspace` NO recrea automáticamente los jobs del Gateway.

Por eso, una máquina nueva necesita dos cosas:

1. workspace clonado
2. cron jobs recreados explícitamente

## Job actual

### Nombre
`Fogo de Chão Demo Simulator v3 (prod+dev+local)`

### Schedule
- tipo: `cron`
- expresión: `0 9-23,0-3 * * *`
- timezone: `America/Mexico_City`

### Session target
- `isolated`

### Wake mode
- `now`

### Modelo
- `openai-codex/gpt-5.4`

### Timeout
- `300s`

### Delivery
- `none`

## Payload actual

```text
Before doing anything, read /Users/hectorvelasquez/.openclaw/workspace/memory/model-playbook.md and follow it strictly.

Run the Fogo de Chão restaurant simulator v3 on ALL THREE databases in series. Execute these commands:

1. PRODUCTION: cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs
2. DEV: cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev
3. LOCAL: cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local

Report output from all three runs. If LOCAL fails because PostgreSQL is not running, that's OK — just note it and continue. If there are errors on PROD or DEV, log them to memory/fogo-sim-errors.md
```

## Política operativa recomendada

- Mantener este job en `Codex 5.4`
- Mantenerlo en sesión `isolated`
- No usar Opus para carga automática
- No confiar en `Complete` si el output muestra errores funcionales internos

## Pitfall conocido

Una corrida falló por policy de exec:

```text
exec denied: Cron runs cannot wait for interactive exec approval.
```

Interpretación:
- el simulador ni siquiera arrancó
- el problema fue policy del host/cron
- no era un bug de Fogo

## Cómo recrearlo en una máquina nueva

### Opción recomendada
Pídeselo directamente a OpenClaw en la nueva máquina, usando este documento como source of truth.

Prompt sugerido:

```text
Create the OpenClaw cron job documented in docs/fogo/cron-bootstrap.md exactly as written. Use Codex 5.4, isolated session, the same schedule, and the same payload.
```

### Opción manual asistida
Verifica con `cron list` o desde la UI de OpenClaw que el job quede con:
- mismo nombre
- mismo schedule
- mismo payload
- mismo timeout
- mismo modelo

## Cómo validar que quedó bien

Después de recrearlo:

1. confirma que aparece en la lista de jobs
2. confirma que el próximo `nextRun` tiene sentido en horario CDMX
3. ejecuta una corrida manual si quieres validar bootstrap
4. revisa que escriba o actualice `memory/fogo-sim-errors.md` cuando corresponda

## Qué revisar si algo sale raro

### Si falla solo `DEV`
Sospecha primaria:
- integridad de datos de `route_area_id`
- mapping `r40 -> r9`

### Si falla solo `LOCAL`
Revisar:
- PostgreSQL local arriba
- dataset local disponible
- existencia de turno abierto para esa ventana

### Si `PROD` y `LOCAL` hacen `skip`
No asumir fallo.
Primero revisar si están en `NO_SHIFT` o en una ventana donde mantenimiento no aplica.
