# Current Capabilities — Inventarios

> Last updated: 2026-04-12

## Sí hace (funcionando hoy)

- [x] Existe microservicio dedicado de inventario (`pos_inventory_api`) en prod y dev.
- [x] El sistema ya registra movimientos de inventario con schema validado (`inventory_movements`) y soporte de costo/unidad.
- [x] El demo Fogo ya puede simular actividad de inventario en prod, dev y local.
- [x] El brain ya reconoce parcialmente preguntas de inventario y puede degradar con seguridad sin inventar.

## Parcial (funciona pero incompleto o con limitaciones)

| Capacidad | Qué falta | Workaround actual |
|---|---|---|
| Lectura ejecutiva de inventario desde el brain | Falta deterministic sólido para consumo, merma, compras y faltantes | Responder solo señales soportadas y degradar elegantemente |
| Demo integral inventario | Hay simulación, pero no una experiencia cerrada end-to-end para admin/operación | Usar Fogo simulator + queries existentes |
| Alertas operativas | No hay capa robusta de alertas proactivas de inventario | Revisión manual o briefing ad hoc |
| Integración feature docs → ejecución | La arquitectura está documentada, pero falta bajar a implementación concreta del feature | Usar este kickoff como base antes de tocar código |

## No hace (gap conocido)

- [ ] Flujo fuerte de inventario desde brain que responda con precisión consumo, riesgo y acción sugerida.
- [ ] Capa de acciones sobre inventario con policy engine claro para writes.
- [ ] Definición formal de UX para inventario en admin, bot y posibles canales.
- [ ] Observability específica para preguntas/acciones de inventario.

## Riesgos activos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| El brain inventa precisión por ingrediente/consumo | P1 | Mantener safe degradation y ampliar routing deterministic |
| Se confunde simulador con feature productizada | P1 | Separar claramente demo simulator vs producto inventarios |
| Writes de inventario sin policy clara | P0 | Definir action layer antes de tocar mutaciones |
| Mezcla de ownership entre `pos_inventory_api`, brain y OpenClaw | P1 | Documentar system map y límites por capa |
