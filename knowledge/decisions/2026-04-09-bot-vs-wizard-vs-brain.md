# Decision: Separar consultas (brain) de acciones (wizard) de reportes (bot actual)

- **Fecha:** 2026-04-09
- **Decidido por:** Hector
- **Estado:** APROBADO

---

## Contexto

El bot actual mezcla todo en un solo pipeline: reportes, acciones, preguntas informativas, marketing, legal.
Esto genera un `execute.ts` de 1,199 lineas y un `classify.ts` de 521 lineas que crecen sin control.

## Decision

Hay 3 tipos de interaccion y cada una tiene un flujo diferente:

### Tipo A — Consulta/Diagnostico (BRAIN pipeline)
- **Ejemplo:** "¿Como van los descuentos hoy?"
- **Flujo:** estado → diagnostico → LLM con contexto → respuesta enriquecida → log
- **Pipeline:** `app/brain/pipeline.ts` (NUEVO)
- **Quien:** Hector

### Tipo B — Accion/Wizard (ACTION flow)
- **Ejemplo:** "Agrega Coca Cola 355ml", "Cancela la coca de mesa 5"
- **Flujo:** intent → wizard conversacional → confirmacion → ejecucion → log
- **Pipeline:** `app/bot/actions/` (YA EXISTE, se extiende)
- **Quien:** Ambos

### Tipo C — Reportes/FAQ/Info (BOT actual)
- **Ejemplo:** "Reporte de ventas de ayer", "Como uso el sistema"
- **Flujo:** classify → execute → reply (el pipeline actual)
- **Pipeline:** `app/bot/pipeline/` (YA EXISTE, se mantiene)
- **Quien:** Se mantiene como esta

## Regla clave

Incluso los wizards (Tipo B) alimentan el loop del cerebro.
Cuando creas un producto = `business_event` de tipo `product_created`.
Cuando haces inventario = actualiza `daily_metrics`.

La diferencia:
- En consulta: el loop GENERA la respuesta
- En wizard: el loop REGISTRA lo que paso

## Que se descarto

- **Reemplazar todo con brain pipeline:** los wizards necesitan estado conversacional, no solo LLM
- **Mantener todo en execute.ts:** no escala, ya tiene 1,199 lineas
- **Hacer 3 bots separados:** confusion para el usuario, mismo canal de entrada

## Acciones pendientes

- [ ] Crear `create_product_flow` en action_routes (wizard Coca Cola)
- [ ] Crear `inventory_count_flow` en action_routes (wizard inventario)
- [ ] Crear `app/brain/pipeline.ts` (brain para consultas)
- [ ] Feature flag `BRAIN_ENABLED` para activar brain pipeline
