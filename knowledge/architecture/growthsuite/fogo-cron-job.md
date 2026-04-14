# Fogo de Chão cron job, cómo está creado

> Last updated: 2026-04-13

## Dónde lo creé

Lo dejé aquí:

`/Users/hectorvelasquez/.openclaw/workspace/knowledge/architecture/growthsuite/fogo-cron-job.md`

## Cron exacto

En OpenClaw, el cron activo es:

- **Name:** `Fogo de Chão Demo Simulator v3 (prod+dev+local)`
- **Job ID:** `3ebafb38-9e96-4fac-8060-1ed54ec77eae`
- **Enabled:** `true`
- **Session target:** `isolated`
- **Model:** `openai-codex/gpt-5.4`
- **Timeout:** `300s`
- **Delivery:** `none`

## Schedule

Corre con este cron:

```text
0 10,13,16,19,22 * * *
```

Timezone:

```text
America/Mexico_City
```

O sea, corre diario a:
- 10:00
- 13:00
- 16:00
- 19:00
- 22:00

## Qué ejecuta

El payload del cron corre el simulador en **serie** sobre las tres bases:

1. **PROD / main**
2. **DEV**
3. **LOCAL**

Comandos exactos:

```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local
```

Además, el prompt del cron dice explícitamente:
- correr las tres en serie
- si local falla porque PostgreSQL no está corriendo, eso se considera tolerable
- si falla prod o dev, loggear en `memory/fogo-sim-errors.md`

## Script fuente real

El runner real no vive dentro de `pos-app`, vive en el workspace:

```text
/Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-simulator.mjs
```

Ese script unificado soporta tres perfiles:
- default = **prod/main**
- `--dev`
- `--local`

## Cómo decide la base de datos

En `fogo-simulator.mjs`:

```text
PROD_DB_URL  -> Railway production
DEV_DB_URL   -> Railway dev
LOCAL_DB_URL -> PostgreSQL local (127.0.0.1:5432/pos_app)
```

Selección:
- sin flags -> producción
- `--dev` -> dev
- `--local` -> local

## Mapping por entorno

### PROD / main
- usa Fogo real en producción
- restaurante operativo del demo
- corre sin remap extra

### DEV
- usa una copia clonada de Fogo en dev
- el script carga `fogo-id-mapping-dev.json`
- restaurant mapping actual:
  - prod `r40`
  - dev `r9`

Archivo de mapping:

```text
/Users/hectorvelasquez/.openclaw/workspace/scripts/fogo-id-mapping-dev.json
```

Script que prepara esa clonación:

```text
/Users/hectorvelasquez/.openclaw/workspace/scripts/clone-fogo-to-dev.mjs
```

### LOCAL
- usa PostgreSQL local `pos_app`
- conserva `restaurant_id = 40`
- no necesita remap de IDs como dev

Script de preparación local:

```text
/Users/hectorvelasquez/.openclaw/workspace/scripts/clone-fogo-to-local.mjs
```

## Qué simula por horario

El simulador v3 modela un día de restaurante así:

- **10:00** → check-in staff + open shift + schedules
- **13:00** → lunch peak
- **16:00** → tarde lenta + algunos check-outs
- **19:00** → dinner peak + evening check-ins
- **22:00** → últimas órdenes + cierre de cuentas + tips + Corte Z + close shift + check-outs

## Guardrails

El script trae protecciones importantes:

- límite máximo por corrida: `MAX_ORDERS_PER_RUN = 60`
- límite máximo por día: `MAX_ORDERS_PER_DAY = 300`
- solo debe tocar el restaurante demo objetivo
- hace safety check antes de insertar

## Relación con brain / demos

Este cron existe para mantener vivo el estado demo del restaurante en:
- producción
- dev
- local

Eso alimenta:
- demos del bot
- demos del brain
- pruebas de reportes
- pruebas de inventario / operación con señal realista

## Distinción importante

No confundir esto con seeders one-shot del repo.

El simulador continuo real es:

```text
~/.openclaw/workspace/scripts/fogo-simulator.mjs
```

No el seeder aislado dentro de `pos-app`.

## Resumen corto

El cron de Fogo está creado como un job aislado de OpenClaw que, cinco veces al día, corre un único simulador unificado sobre **prod, dev y local**, usando flags para cambiar de base y apoyándose en scripts previos de clonación para que dev/local tengan contexto coherente del restaurante demo.
