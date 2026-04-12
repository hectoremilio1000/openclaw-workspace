# Brain — System Map

> Estado real del sistema al 2026-04-12. Basado en código auditado.

---

## Runtime principal

**pos_bot_api** — AdonisJS v6, PostgreSQL, Railway

Pipeline: `receive → classify → route → action_routes → execute → reply → persist`

| Stage | Archivo | Líneas | Responsabilidad |
|-------|---------|--------|-----------------|
| receive | `receive.ts` | 454 | Inbound, dedup, validación básica |
| classify | `classify.ts` | 521 | Intent: keywords → LLM con 24 tools |
| route | `route.ts` | 203 | Routing entre stages |
| action_routes | `action_routes.ts` | 553 | Mapeo intent → action handler |
| execute | `execute.ts` | 1,199 | Ejecutor: permission checks, confidence, dialog state |
| reply | `reply.ts` | 3 | Envío de respuesta |
| persist | `persist.ts` | 174 | Persiste estado, memorias, feedback |

**13 actions registradas** en `app/bot/actions/registry.ts`:
`sales_comparison_report`, `xcut_report`, `late_arrivals_report`, `supplies_purchases_report`, `stock_status_report`, `purchase_suggestions`, `generate_supplier_order`, `cancel_product`, `apply_discount`, `close_shift`, `reopen_order` + `guardrails.ts` (validación) + `registry.ts` (lookup)

**24 tools LLM** en `app/bot/llm/tool_definitions.ts` (CLASSIFY_TOOLS):
Reportes (7), Acciones (7), Queries (3), Conversacional (7)

---

## Fuentes de verdad (solo lectura para el brain)

### pos_order_api — Órdenes, productos, mesas
- Puerto local: 3341 | Railway: `pos-order-api-production.up.railway.app`
- **104 endpoints** | 30 modelos | AdonisJS v6
- Modelos clave: Order, OrderItem, Product, ProductCategory, Area, Table, Customer, Payment
- Admin endpoints activos: dashboard KPIs, listado de órdenes, detalle de orden, listado de meseros, turnos cerrados

### pos_cash_api — Turnos, cortes, pagos, movimientos
- Puerto local: 3342 | Railway: `pos-cash-api-production.up.railway.app`
- **44 endpoints** | 17 modelos | AdonisJS v6
- Modelos clave: Shift, CashStation, CashMovement, CashClosure, ZReport, Payment
- 7 endpoints de bot/service integration (lectura de turnos, cortes, KPIs de caja)

### pos_inventory_api — Ingredientes, recetas, stock, compras, proveedores
- Puerto local: 3344 | Railway: `pos-inventory-api-production-bba3.up.railway.app`
- **129 endpoints** | 30 modelos | AdonisJS v6
- Modelos clave: InventoryItem, InventoryRecipe, InventoryStock, PurchaseOrder, Supplier, StockCount, InventoryWaste
- 4 endpoints de bot integration (stock status, purchase suggestions)

### pos_auth_api — Usuarios, roles, restaurantes, suscripciones
- Puerto local: 3340 | Railway: `pos-auth-api-production.up.railway.app`
- JWT provider para todos los servicios

### pos_reservation_api — Reservaciones, schedules, guests
- Puerto local: 3347 | Railway: `posreservacionesapi-production.up.railway.app`
- **33 endpoints** | 6 modelos
- Modelos clave: Reservation, ReservationType, ReservationSchedule, Guest
- 4 endpoints de bot integration (disponibilidad, reservaciones activas)

---

## Servicios que el brain puede MUTAR

### pos_order_api (mutaciones disponibles)
- `POST /admin/orders` — Crear orden nueva (Nivel C)
- `POST /admin/orders/:id/items` — Agregar items a orden (Nivel C)
- `DELETE /admin/orders/:id/items/:itemId` — Remover item (Nivel D)
- `POST /admin/orders/:id/print` — Enviar a cocina (Nivel C)
- `POST /admin/orders/:id/pay` — Cobrar orden (Nivel D)
- Via bot service token: cancelar item, aplicar descuento, reabrir orden

### pos_bot_api (datos propios)
- `bot_memories` — Memorias persistentes por usuario/restaurante
- `bot_documents` — Documentos para RAG
- `bot_scheduled_reports` — Suscripciones a reportes programados

### pos_inventory_api (futuro)
- Registrar consumo, crear pedido a proveedor — endpoints existen pero bot no los usa aún

---

## Servicios que el brain solo LEE

| Servicio | Qué lee | Cómo |
|----------|---------|------|
| pos_cash_api | Turnos, cortes X/Z, movimientos de caja | Service token (7 endpoints) |
| pos_order_api | Órdenes, productos, KPIs, meseros | Service token (bot endpoints) |
| pos_inventory_api | Stock, sugerencias de compra | Service token (4 endpoints) |
| pos_reservation_api | Disponibilidad, reservaciones activas | Service token (4 endpoints) |
| pos_auth_api | Roles, permisos del usuario | JWT decode |

---

## Canales

| Canal | Estado | Dirección | Audiencia |
|-------|--------|-----------|-----------|
| WhatsApp (Meta Cloud API) | ✅ Activo | Bidireccional | Dueño / Gerente |
| Admin frontend (pos_admin_front) | ✅ Activo | UI + API calls | Dueño / Gerente / Admin |
| (futuro) Llamadas telefónicas | ❌ No existe | — | — |
| (futuro) WhatsApp B2C | ❌ No existe | — | Cliente final |
| (futuro) Soft Restaurant computer use | ❌ No existe | — | POS legado |
| (futuro) Jelp / PideDirecto delivery | ❌ No existe | — | Delivery |

**Bridge WhatsApp:** `pos-app/impulsobotwhats/` — Express → Meta Cloud API → pos_bot_api

---

## Dominios

| Dominio | Estado | APIs involucradas |
|---------|--------|-------------------|
| Ventas | ✅ Completo | pos_order_api, pos_cash_api |
| Caja / Turnos | ✅ Completo | pos_cash_api |
| Inventario | ⚠️ Parcial | pos_inventory_api |
| Compras a proveedores | ⚠️ Parcial | pos_inventory_api |
| Cancelaciones | ✅ Funciona | pos_order_api (vía bot token) |
| Descuentos | ✅ Funciona | pos_order_api (vía bot token) |
| Reservaciones | ⚠️ API existe, sin WhatsApp auto | pos_reservation_api |
| Clientes | ⚠️ Modelos existen | pos_order_api (Customer), pos_reservation_api (Guest) |
| Marketing | ❌ No existe | — |
| Loyalty | ❌ No existe | — |

---

## Sistemas externos conectados

| Sistema | Propósito | Estado |
|---------|-----------|--------|
| Qdrant (vector store) | RAG: `app/bot/vector/qdrant.ts` | ✅ Activo |
| OpenAI / OpenAI-compatible | LLM: classify, execute, memory | ✅ Activo |
| Meta Cloud API | WhatsApp mensajería | ✅ Activo |
| Railway | Hosting backends (9 servicios) | ✅ Activo |
| Vercel | Hosting frontends (auto-deploy) | ✅ Activo |
| PostgreSQL (Railway) | Base de datos producción | ✅ Activo |
| (futuro) Soft Restaurant | Computer use sobre POS legado | ❌ No existe |
| (futuro) Jelp / PideDirecto | Delivery integrado | ❌ No existe |

---

## Diagrama lógico (texto)

```
[WhatsApp] ──► impulsobotwhats ──► pos_bot_api
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              pos_order_api      pos_cash_api     pos_inventory_api
              (órdenes,mesas)    (turnos,caja)    (stock,compras)
                     │
              pos_reservation_api    pos_auth_api
              (reservaciones)        (auth,roles)
                     │
              [Qdrant] [OpenAI] [Web Search]
              (RAG)    (LLM)    (fallback)

[Admin Frontend] ──► pos_order_api, pos_cash_api, pos_inventory_api (directo por JWT)
```

---

_Auditado el 2026-04-12 directamente desde el código fuente._
