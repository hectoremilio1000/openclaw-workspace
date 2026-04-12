# Brain — Capacidades Reales (Abril 2026)

> Basado en código real auditado el 2026-04-12. NO es visión, es estado actual.

---

## ✅ SÍ HACE HOY (en producción)

### Bot vía WhatsApp (pos_bot_api)

**Reportes de ventas (acciones reales en `app/bot/actions/`):**
- `sales_comparison_report` — Comparativo de ventas y productos (por fechas, mesero, área)
- `xcut_report` — Corte X (reconciliación de caja)
- `late_arrivals_report` — Reporte de llegadas tarde del personal
- `supplies_purchases_report` — Reporte de compras de insumos por proveedor
- `stock_status_report` — Estado del inventario (niveles de stock actuales)
- `purchase_suggestions` — Sugerencias de compra inteligentes (qué pedir)
- `generate_supplier_order` — Generar pedido a proveedor (crea borrador)

**Queries via execute.ts (herramientas LLM declaradas en `tool_definitions.ts`):**
- `reporte_ventas` — Ventas generales del período
- `reporte_ventas_mesero` — Top meseros por ventas
- `reporte_productos` — Top productos vendidos
- `reporte_movimientos_caja` — Movimientos de caja
- `reporte_cancelaciones` — Reporte de cancelaciones
- `reporte_descuentos` — Reporte de descuentos aplicados
- `consulta_cuentas_abiertas` — Cuentas abiertas en este momento

**Acciones que tocan datos (con dialog state machine):**
- `cancel_product` (539 líneas) — Cancelar/anular items de órdenes con selección de cantidad
- `apply_discount` (234 líneas) — Aplicar descuento % o fijo con flujo de confirmación
- `close_shift` (133 líneas) — Cerrar turno de caja
- `reopen_order` (246 líneas) — Reabrir orden cerrada

**Clasificación y routing:**
- `classify.ts` (521 líneas) — Clasificación LLM con fallback a keywords/regex, normalización de fechas en español, detección de feedback, manual de mesero, preguntas informativas
- `action_routes.ts` (553 líneas) — Router que mapea intent → action handler
- `execute.ts` (1,199 líneas) — Ejecutor principal con permission checks, confidence gates, dialog state

**LLM y herramientas:**
- 24 tools definidas en `tool_definitions.ts` (CLASSIFY_TOOLS) — usadas por LLM para clasificar intents
- `llm_client.ts` — Cliente OpenAI-compatible con capa de resiliencia (`resilience.ts`)
- `llm_structured.ts` — Respuestas estructuradas
- `prompts.ts` — Prompts del sistema

**Memoria conversacional (`app/bot/memory/`):**
- `conversation_history.ts` — Historial por sesión
- `user_profile.ts` (12.5 KB) — Perfil persistente del usuario
- `persistent_memory.ts` (12.7 KB) — Extracción automática de memorias via LLM, tabla `bot_memories`

**RAG (`app/bot/rag/`):**
- `documents.ts` — Gestión de documentos por restaurante (tabla `bot_documents`)
- `chunking.ts` — Chunking de documentos
- `synonyms.ts` — Expansión de sinónimos
- `query_rewriter.ts` — Reescritura de queries
- `reranker.ts` — Reranking de resultados
- `tfidf.ts` — TF-IDF como fallback

**Vector store:**
- Qdrant (`app/bot/vector/qdrant.ts` + `embeddings.ts`) — activo para RAG

**Web search:**
- `app/bot/search/web_search.ts` + `search_cache.ts` — búsqueda web con caché, activo como fallback

**Pipeline completo (7 stages):**
`receive.ts` (454) → `classify.ts` (521) → `route.ts` (203) → `action_routes.ts` (553) → `execute.ts` (1,199) → `reply.ts` (3) → `persist.ts` (174)

**Scheduled reports (estructura completa):**
- Tabla `bot_scheduled_reports` (restaurant_id, phone, report_type, schedule daily/weekly, enabled, last_sent_at)
- Controller: subscribe / unsubscribe / list
- Comando Ace: `bot:send-scheduled-reports {daily|weekly}` — lógica completa
- ⚠️ Falta: integración final con mensajería (TODO en línea 69 de `send_scheduled_reports.ts`)

### Admin Frontend (pos_admin_front — módulo Operación)

21 archivos, 3,511 líneas en `src/pages/Operacion/`:
- `OperacionPage.tsx` (313 líneas) — Página principal con grid de mesas + sidebar de áreas
- `OperacionHeader.tsx` (87 líneas) — Header bg-slate-700 con 6 botones (ABRIR CUENTA, MI VENTA, VER PRECIOS, MOVIMIENTOS, CORTE X, MONITOR)
- `OperacionAreaSidebar.tsx` (98 líneas) — Sidebar derecha, filtrado por área
- `OperacionTableCard.tsx` (71 líneas) — Cards de mesas (emerald=libre, blue=ocupada, indigo=impresa, amber=held)
- `OrderPanel.tsx` (280 líneas) — Panel de orden con tabs CONSUMO/MI COMANDA/TOTALES, 12 acciones
- `CapturaComandaModal.tsx` (510 líneas) — Modal para capturar/crear orden
- `OpenOrderModal.tsx` (533 líneas) — Modal para abrir cuentas nuevas
- `CobrarTab.tsx` (487 líneas) — Tab de cobro/pago
- `CorteTab.tsx` (242 líneas) — Tab de cierre de turno
- `MesasTab.tsx` (183 líneas) — Tab de gestión de mesas
- `ProductCatalog.tsx` (146 líneas) — Catálogo de productos
- `ModifierModal.tsx` (102 líneas) — Selección de modificadores

### APIs backend (endpoints disponibles)

**pos_order_api** (104 endpoints totales, 30 modelos):
- Admin: GET/POST `/admin/orders`, `/admin/orders/:id/items`, `/admin/orders/:id/pay`, `/admin/orders/:id/print`
- Admin: GET `/admin/dashboard/kpis`, `/admin/waiters`, `/admin/shifts/closed`
- Kiosk: 59+ endpoints completos para POS

**pos_cash_api** (44 endpoints, 17 modelos):
- Turnos: abrir, cerrar, preview, listar cerrados
- Movimientos de caja, propinas, comisiones
- Reportes X/Z cuts, movimientos por fecha
- 7 endpoints de integración para bot/servicios

**pos_inventory_api** (129 endpoints, 30 modelos):
- Catálogo completo: items, grupos, presentaciones, fotos
- Proveedores: CRUD completo + tipos + mercados
- Compras: órdenes, solicitudes de stock, corridas de compra
- Stock: cortes, conteos, merma, movimientos
- Recetas: ingredientes, líneas, pasos, consumo

**pos_reservation_api** (33 endpoints, 6 modelos):
- Widget público: disponibilidad, booking, lookup
- Admin: tipos, schedules, reservaciones, guests, stats
- Bot: 4 endpoints de integración

---

## ⚠️ HACE PARCIAL

- **Scheduled reports:** lógica DB + Ace command completa, pero falta envío real a WhatsApp (TODO en línea 69)
- **LLM como router:** `tool_definitions.ts` con 24 tools existe y se usa en classify.ts, pero classify.ts sigue siendo keywords-first; el LLM es el fallback, no el primario
- **Cobrar desde admin:** endpoint `POST /admin/orders/:id/pay` existe en pos_order_api, `CobrarTab.tsx` existe en frontend — sin prueba end-to-end confirmada
- **Agregar items desde admin:** `POST /admin/orders/:id/items` existe, `CapturaComandaModal.tsx` existe — sin prueba end-to-end confirmada (señalado como 500 en algunos casos en sesiones anteriores)
- **Inventario frontend:** 129 endpoints en pos_inventory_api, modelos completos — sin datos de prueba en Fogo dev
- **Reservaciones WhatsApp:** 4 endpoints de bot en pos_reservation_api, pero sin confirmación automática vía WhatsApp implementada
- **generate_supplier_order:** genera borrador pero no lo envía (por diseño: Nivel C)
- **Dialog state machine:** existe en `app/bot/dialog/` pero coverage de acciones variable
- **Canal admin panel:** `channel_profiles.ts` sugiere soporte para canal admin distinto de WhatsApp — sin implementación completa confirmada

---

## ❌ NO HACE TODAVÍA

- **Event log del negocio** (`bot_events` append-only) — no existe
- **Daily metrics materializadas** (`daily_metrics_by_restaurant`) — no existe
- **Anomaly detection automática** — no existe
- **Briefings proactivos** por WhatsApp (el brain empuja, no espera) — no existe
- **LLM como router principal** (classify.ts keywords como safety net, no como primario) — pendiente
- **Computer use sobre POS terceros** (Soft Restaurant, etc.) — no existe
- **Marketing automatizado** — no existe
- **Loyalty/rewards** — no existe
- **App móvil** — no existe
- **Multi-restaurant learning** (lo que funciona en restaurante A mejora B) — no existe
- **Policy Engine** (validación determinista separada del LLM antes de ejecutar) — no existe
- **Domain services separados del LLM** — todo en execute.ts monolítico
- **Evaluator** (state_before → action → state_after → ΔJ) — no existe
- **WhatsApp B2C** (canal al cliente final, no al dueño) — no existe
- **Llamadas telefónicas** — no existe
- **Delivery integrado** (Rappi, Uber Eats, PideDirecto) — no existe
- **Dashboard de métricas del bot** — no existe
- **Shadow mode / feature flags** para migración — no existe
- **CI regression para test suite** (bloquear merge si Cat A < 75) — no existe

---

_Auditado el 2026-04-12 directamente desde el código fuente._
