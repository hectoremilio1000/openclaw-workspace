# Fogo Simulator Runbook

## Qué es

El cron de Fogo ejecuta el simulador operacional sobre tres bases en serie:

1. `PRODUCTION`
2. `DEV`
3. `LOCAL`

Comandos actuales:

```bash
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --dev
cd /Users/hectorvelasquez/.openclaw/workspace/scripts && NODE_PATH=/tmp/node_modules node fogo-simulator.mjs --local
```

## Por qué corre en serie

Corre en serie para conservar una lectura humana simple del estado por entorno y evitar mezclar fallas entre:
- datos productivos de referencia
- dataset dev mapeado (`r40 -> r9`)
- entorno local del operador

## Ventanas operativas observadas

El simulador usa ventanas como:
- `AFTERNOON`
- `DINNER`
- `LATE_NIGHT`
- `LUNCH`
- `CLOSE`

Cada ventana puede disparar planes como:
- `ROTATE_ORDERS`
- `ENSURE_COVERAGE`
- `SETTLE_ALL_ORDERS`
- `CLOSE_SHIFT`
- `FINAL_ATTENDANCE`
- `FINAL_INVENTORY`
- `SKIP`

## Cómo leer la salida

Campos importantes:

- `Safety X/500 orders today` → volumen relativo del día
- `Shift` → si hay turno abierto, cerrado o `NO_SHIFT`
- `Coverage 0o/0p` → cobertura de órdenes abiertas / printed
- `Orders created` y `Revenue` → si realmente generó actividad
- `Plan` → qué camino tomó el runtime

## Cuándo un `skip` es normal

`skip` puede ser perfectamente normal cuando:
- la ventana no requiere mantenimiento
- el turno está `CLOSED`
- no existe turno abierto (`NO_SHIFT`) en esa ventana

Ejemplo normal:
- `Window: LUNCH`
- `Shift state: NO_SHIFT`
- `Plan: skip — SKIP`
- `0 orders, $0.00 revenue`

Eso no implica bug por sí mismo.

## Errores conocidos

### 1. `order_items_route_area_id_foreign`

Patrón observado:
- se repite en `DEV`
- el proceso puede terminar con `exit code 0`
- el resumen puede decir `Complete`
- pero realmente deja `0 orders created` y `$0.00 revenue`

Interpretación:
- el simulador sigue vivo
- pero la generación de órdenes falla en la inserción de `order_items`
- por eso no hay que confiar solo en `Complete`

### 2. `exec denied: Cron runs cannot wait for interactive exec approval`

Este error no es del simulador.
Es de política/seguridad del cron.

Significa que el job intentó correr bajo una policy que pedía aprobación interactiva.

## Estado operativo real observado hasta hoy

### PRODUCTION
- Sí ha creado órdenes en corridas previas
- También puede entrar en `skip` cuando la ventana no tiene turno activo

### DEV
- Es el entorno con el fallo recurrente visible
- Error repetido: `order_items_route_area_id_foreign`
- El problema aparente es integridad/referencia de datos, no disponibilidad del job

### LOCAL
- Sí ha corrido exitosamente en varias corridas
- Sí ha llegado a crear órdenes útiles
- Cuando aparece `NO_SHIFT`, normalmente hace `skip`
- No es correcto asumir que local está roto solo porque una corrida reciente salió en `0 orders`

## Checklist rápida para otra máquina

Cuando revises una corrida, confirma:

1. ¿El job sí arrancó o fue bloqueado por policy?
2. ¿Qué entorno falló exactamente: `PROD`, `DEV` o `LOCAL`?
3. ¿Había `OPEN`, `CLOSED` o `NO_SHIFT`?
4. ¿Hubo `Orders created` reales?
5. ¿Apareció `order_items_route_area_id_foreign`?
6. ¿La corrida terminó en `Complete` pero con `0 orders`? Si sí, revisar error real antes de asumir éxito.

## Archivos clave

- `scripts/fogo-simulator.mjs`
- `memory/fogo-sim-errors.md`
- `memory/2026-04-14.md`
- `knowledge/architecture/growthsuite/restaurant-runtime-simulator.md`
