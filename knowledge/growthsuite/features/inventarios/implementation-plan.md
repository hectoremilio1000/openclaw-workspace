# Implementation Plan — Inventarios

> Last updated: 2026-04-12 | Status: planning

## Alcance

### Sí entra en este plan
- Definir inventarios como feature formal, no solo como microservicio existente.
- Hacer visible el mapa real del sistema: source of truth, lectura, mutación y ownership.
- Fortalecer preguntas de inventario en el brain con routing deterministic / degradation segura.
- Preparar base para acciones futuras de inventario con action layer y policy engine.
- Dejar claro qué partes viven en `pos_inventory_api`, cuáles en `pos_bot_api`, y cuáles en OpenClaw/demo infra.

### No entra (explícitamente fuera de scope)
- Reescribir completo `pos_inventory_api`.
- Construir ya todos los endpoints faltantes.
- Automatizar compras reales sin confirmación humana.
- Navegación computer-use o ejecución autónoma irreversible.

## Backend

| Tarea | Archivo | Status |
|---|---|---|
| Documentar ownership de inventario | `knowledge/growthsuite/features/inventarios/system-map.md` | done |
| Definir action layer | `knowledge/growthsuite/features/inventarios/action-layer.md` | done |
| Revisar queries de inventario del brain | `pos_bot_api/app/brain/*` | pending |
| Agregar subclases inventory_* faltantes | `pos_bot_api/app/brain/pipeline.ts` | pending |
| Identificar endpoints de writes críticos | `pos_inventory_api/start/routes.ts` y controllers | pending |

## Frontend

| Tarea | Archivo | Status |
|---|---|---|
| Definir UX admin para inventarios | `knowledge/growthsuite/features/inventarios/user-flows.md` | pending |
| Mapear superficies que consumen inventario | admin / centro control / bot | pending |
| Identificar gaps de vistas/acciones | front(s) correspondientes | pending |

## Brain (Bot / IA)

| Tarea | Archivo | Status |
|---|---|---|
| Soportar `inventory_health` con salida estable | `pos_bot_api/app/brain/pipeline.ts` | pending |
| Cubrir consumo, faltantes, compras, merma | `pos_bot_api/app/brain/pipeline.ts` + queries | pending |
| Mantener safe degradation sin inventar detalle | `brain-policy-layer.md` + pipeline | pending |
| Diseñar transición respuesta -> acción confirmada | action layer / policy engine futuro | pending |

## Testing

- [ ] Unit tests para queries/mapeos de inventario
- [ ] Integration tests para endpoints de movimientos/ajustes/compras
- [ ] Bot tests para preguntas de stock, consumo, faltantes, proveedor, merma
- [ ] QA manual con Fogo simulator en prod/dev/local

## Orden de ejecución

1. Documentar feature y ownership (este kickoff)
2. Auditar source of truth en `pos_inventory_api`
3. Auditar queries y routing del brain para inventario
4. Definir UX mínima de lectura y acción en admin/bot
5. Implementar mejoras deterministic del brain
6. Diseñar policy engine para writes sensibles
7. QA con datos demo reales
