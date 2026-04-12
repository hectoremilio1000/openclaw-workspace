# Implementation Plan — Inventarios

> Last updated: 2026-04-12 (reescrito con contexto real del código)
> Status: Semana 1 pendiente

---

## Contexto de partida

El microservicio `pos_inventory_api` **ya existe y es completo** (28 controllers, ~131 endpoints). El problema no es construir endpoints — es que no hay datos reales en Fogo dev/prod, el bot no está conectado a los endpoints internos de inventario, y la UI del admin no tiene flujos cerrados para las operaciones clave.

---

## Semana 1 — Datos reales en Fogo + arreglar CORS

**Objetivo:** que el restaurante de prueba (Fogo, id=40) tenga insumos, recetas, proveedores y stock reales para que el bot y la UI puedan responder con verdad en vez de inventar.

### Backend

| Tarea | Endpoint a usar | Responsable |
|---|---|---|
| Seedear unidades de medida | `POST /api/measurement-units/ensure-defaults` (idempotente) | Hector / script |
| Crear grupos de insumos (Carnes, Lácteos, Abarrotes, Bebidas, Empaques) | `POST /api/inventory/groups` | Hector / script |
| Crear 20-30 insumos base de Fogo | `POST /api/inventory/items` | Hector / script |
| Crear presentaciones por insumo (kg, lt, pza) | `POST /api/inventory/presentations` | Hector / script |
| Crear 3-5 proveedores (Carnes, Verduras, Bebidas) | `POST /api/suppliers` | Hector / script |
| Asignar costos de presentación por proveedor | `PUT /api/inventory/presentations/:id/supplier-costs/:supplierId` | Hector / script |
| Crear 2-3 recetas BOM de platos Fogo | `POST /api/inventory/recipes` + `POST .../lines` | Hector / script |
| Ingresar stock inicial (movimiento de entrada) | `POST /api/inventory/movements` | Hector / script |

### Infraestructura

- [ ] Verificar CORS en Railway DEV para requests desde `localhost:5173`
- [ ] Si CORS bloqueado: agregar `localhost:5173` a `config/cors.ts` en `pos_inventory_api`
- [ ] Verificar que `pos_inventory_api` en Railway DEV esté apuntando a DB correcta (no prod)

---

## Semana 2 — Conectar bot actions de inventario con datos reales

**Objetivo:** que las 4 acciones del `BotInventoryController` respondan con datos reales de Fogo y que el bot las use correctamente desde `pos_bot_api`.

### Verificar endpoints internos

| Endpoint interno | Prueba manual |
|---|---|
| `GET /internal/bot/inventory/stock-status?restaurantId=40` | Debe devolver insumos con stock real |
| `GET /internal/bot/inventory/purchases-summary?restaurantId=40&from=2026-04-01&to=2026-04-12` | Debe devolver compras del período (requiere movimientos tipo `purchase`) |
| `GET /internal/bot/inventory/purchase-suggestions?restaurantId=40` | Debe sugerir compras (requiere consumo histórico) |
| `GET /internal/bot/inventory/supplier-order?restaurantId=40` | Debe generar pedido por proveedor |

### Conectar en pos_bot_api

- [ ] Identificar dónde en `pos_bot_api` se llaman los `/internal/bot/inventory/*` endpoints (buscar en `app/bot/actions/` y `app/bot/pipeline/`)
- [ ] Asegurar que el `serviceToken` correcto está en `.env` de `pos_bot_api`
- [ ] Agregar test manual: preguntar por WhatsApp "¿qué falta comprar?" con restaurantId=40 y verificar respuesta coherente

### Casos que deben funcionar después de Semana 2

1. "¿Cuánto se compró esta semana?" → `purchases-summary` con datos reales
2. "¿Qué falta comprar?" → `purchase-suggestions` con Fogo data
3. "¿Cómo está el stock?" → `stock-status` con cantidades reales
4. "Genera el pedido del lunes" → `supplier-order` agrupado por proveedor

---

## Semana 3 — Agregar tools LLM de inventario al brain

**Objetivo:** que el LLM tenga tools tipadas para inventario, no solo keywords en `classify.ts`.

### Nuevas tool definitions en pos_bot_api

Agregar en `app/bot/llm/tool_definitions.ts`:

```typescript
{
  name: "get_stock_status",
  description: "Obtiene el estado de stock actual del restaurante",
  parameters: { restaurantId: number, warehouseId?: number }
}
{
  name: "get_purchase_suggestions",
  description: "Sugiere compras basadas en consumo histórico y stock actual",
  parameters: { restaurantId: number, days?: number }
}
{
  name: "get_purchases_summary",
  description: "Resumen de compras en un rango de fechas",
  parameters: { restaurantId: number, from: string, to: string }
}
{
  name: "get_supplier_order",
  description: "Genera pedido sugerido agrupado por proveedor",
  parameters: { restaurantId: number }
}
```

### Routing en classify.ts (no reemplazar — agregar)

- [ ] Agregar patrones de inventario a `INVENTORY_KEYWORDS` o equivalente en `classify.ts`
- [ ] Asegurar que cuando LLM elige tool de inventario, el execute.ts la llama al endpoint correcto

---

## Semana 4 — UI improvements en admin

**Objetivo:** que las pantallas de inventario en `pos_admin_front` sean utilizables en producción.

### Pantallas a mejorar (según gaps actuales)

| Pantalla | Mejora | Prioridad |
|---|---|---|
| `/inventario/insumos` | Agregar filtro por grupo y búsqueda por nombre | Alta |
| `/inventario/conteos` | Mostrar diferencia stock esperado vs contado al cerrar | Alta |
| `/inventario/mermas` | Validar que "apply" muestre confirmación antes de ejecutar | Alta |
| `/inventario/consumo` | Botón "aplicar consumo del día" con confirmación y resultado | Media |
| `/inventario/diferencias` | DiffsWizard — verificar que compare conteo vs stock calculado | Media |
| `/inventario/compras/viajes` | PurchaseRunDetailPage — asegurar que muestra totales por proveedor | Media |
| Recorridos | Agregar UI de configuración de recorrido (qué comprar cada día) | Baja (existente pero sin UI) |

---

## Orden de ejecución resumido

1. **Semana 1:** Seedear Fogo + CORS → base de datos reales
2. **Semana 2:** Verificar y conectar bot endpoints internos → bot responde con verdad
3. **Semana 3:** Tools LLM tipadas → bot usa inventario como herramienta nativa
4. **Semana 4:** UI admin → operación diaria sin fricción

---

## Fuera de scope (no entra en este plan)

- Reescribir `pos_inventory_api` (no es necesario — los endpoints ya existen)
- Policy Engine completo para nivel D/E (requiere sprint separado)
- Automatización de compras sin confirmación humana
- Alertas proactivas / cron de stock bajo (siguiente sprint)
- Facturación / reconciliación contable
