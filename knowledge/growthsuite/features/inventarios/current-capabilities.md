# Current Capabilities — Inventarios

> Last updated: 2026-04-12 (reescrito con código real — rutas de `pos_inventory_api/start/routes.ts` + pantallas de `pos_admin_front/src/pages/Inventarios/`)

---

## ✅ SÍ HACE (funciona hoy en producción)

### Backend — `pos_inventory_api` (puerto 3344 local / Railway prod)

**28 controllers, ~131 endpoints totales (127 /api + 4 /internal).**

| Dominio | Controllers | Endpoints |
|---|---|---|
| Catálogos (unidades, tipos proveedor) | `MeasurementUnitsController`, `SupplierTypesController` | 10 |
| Proveedores y mercados | `SuppliersController`, `SupplierMarketsController`, `SupplierMarketSuppliersController`, `PurchaseRoutesController` | 15 |
| Catálogo de insumos | `InventoryGroupsController`, `InventoryItemsController`, `InventoryPresentationsController`, `InventoryPresentationSupplierCostsController`, `InventoryItemPhotosController` | 22 |
| Almacenes | `InventoryWarehousesController`, `WarehouseLocationsController` | 8 |
| Compras y abastecimiento | `PurchaseOrdersController`, `StockRequestsController`, `RecorridosController`, `PurchaseRunsController` | 31 |
| Stock / Conteos / Cortes | `InventoryStocksController`, `InventoryCutsController`, `StockCountsController` | 13 |
| Mermas | `InventoryWastesController` | 4 |
| Movimientos | `InventoryMovementsController`, `InventoryExternalRefsController` | 4 |
| BOM / Recetas | `InventoryRecipesController`, `PrintAreaWarehouseMapsController`, `PosProductsController` | 18 |
| Consumo por ventas | `InventorySalesConsumptionController` | 2 |
| Bot (internal, serviceToken) | `BotInventoryController` | 4 |

**Funcionalidades concretas que EXISTEN:**

- CRUD completo de insumos (`/api/inventory/items`) con fotos, grupos y detalle extendido
- Presentaciones por insumo con costos por proveedor (`/api/inventory/presentations/:id/supplier-costs`)
- CRUD de proveedores + mercados + rutas de compra
- Órdenes de compra con líneas, edición, recepción (`POST /api/purchase-orders/:id/receive`)
- Solicitudes de stock entre almacenes (`/api/stock-requests`) con fulfill
- Recorridos de compra por día de semana + generación de run (`POST /api/recorridos/:weekday/generate-run`)
- Viajes de compra (`/api/purchase-runs`) con cierre, reapertura, cancelación, reconciliación y bulk-import
- Stock actual (`GET /api/inventory/stocks`)
- Conteos físicos (`/api/stock-counts`) con líneas, cierre y eliminación
- Cortes de inventario (`/api/inventory/cuts`) con cálculo y detalle
- Mermas con aplicación (`POST /api/inventory/wastes/:id/apply`)
- Movimientos de inventario (entradas/salidas/ajustes) con historial completo
- Recetas (BOM): ingredientes, líneas, pasos con reordenamiento (`/api/inventory/recipes/:id/steps/reorder`)
- Mapeo área de impresión → almacén (`/api/inventory/print-area-warehouse-maps`)
- Consumo automático por ventas: estimación + aplicación (`/api/inventory/consumption/apply-sales`)
- 4 endpoints bot-internos para resumen de compras, sugerencias, estado de stock, y pedido a proveedor

### Frontend — `pos_admin_front/src/pages/Inventarios/` (11 tabs)

| Tab / ruta | Componentes clave |
|---|---|
| `/inventario/insumos` | `ItemsPage`, `InventoryItemFormDrawer`, `ItemPresentationsDrawer`, `InventoryItemPhotosPanel`, `PresentationEditModal` |
| `/inventario/presentaciones` | tab dentro de `InventoryItemsTab` |
| `/inventario/compras` | `PurchasesRouter` → `PurchaseOrdersTab`, `PurchaseOrderFormDrawer`, `PurchaseReceiveModal` |
| `/inventario/compras/recorridos` | `RecorridosPage` |
| `/inventario/compras/viajes` | `PurchaseRunsPage`, `PurchaseRunDetailPage`, `PurchaseRunFormModal`, `PurchaseRunSupplierCards`, `PurchaseRunOrdersTable` |
| `/inventario/compras/solicitudes` | `StockRequestsTable`, `StockRequestFormDrawer`, `StockRequestItemsDrawer` |
| `/inventario/bom` | `RecipesPage`, `RecipeEditorDrawer`, `RecipeStepsSection`, `RecipePhotosPanel`, `BOMPage`, `ExternalRefsPage`, `PrintAreaWarehouseMapsPage` |
| `/inventario/almacenes` | (via `InventoryWarehousesController`) |
| `/inventario/proveedores` | `SuppliersPage`, `SupplierFormModal`, `SupplierMarketsTab`, `SupplierMarketFormModal`, `SupplierMarketSuppliersDrawer`, `SupplierTypeCreateModal` |
| `/inventario/conteos` | `CountsPage`, `StockCountDetailDrawer`, `StockCountFormModal` |
| `/inventario/mermas` | `WastesPage` |
| `/inventario/movimientos` | `MovementsPage` |
| `/inventario/consumo` | (Ventas/Consumo — `InventorySalesConsumptionController`) |
| `/inventario/diferencias` | `DiffsPage`, `DiffsWizard` |

---

## ⚠️ PARCIAL (existe pero con limitaciones conocidas)

| Capacidad | Qué falta / problema | Workaround |
|---|---|---|
| CORS en Railway DEV | El endpoint de inventory API en Railway dev puede rechazar requests desde frontend local | Usar prod URL o proxy local |
| Fogo dev sin datos de inventario | Restaurant id=40 no tiene insumos, recetas ni proveedores en dev/prod | Seedear manualmente o con Fogo simulator |
| `InventoryStocksController` (1 endpoint) | Solo GET `/api/inventory/stocks` — no hay cálculo automático de stock mínimo ni alertas | Revisar stock manualmente |
| Recorridos | Existen rutas y lógica, pero sin UI completa de configuración de recorrido | Usar API directa |
| Consumo por ventas | `apply-sales` y `estimate` existen pero requieren que las recetas (BOM) estén completas | Requiere datos de recetas en producción |
| Bot inventory (4 endpoints `/internal`) | Protegidos por `serviceToken` — solo accesibles desde `pos_bot_api`, no desde admin | Usar via bot únicamente |

---

## ❌ NO HACE (gap real, no existe en código)

- Alertas proactivas de stock bajo (no hay cron, no hay umbral mínimo configurable)
- `business_events` o event log de inventario (no hay tabla ni endpoint)
- Métricas diarias de inventario (`daily_metrics_by_restaurant` para inventario)
- Dashboard de food cost (costo de ingredientes vs ventas)
- Notificaciones WhatsApp automáticas por faltantes
- Policy Engine para writes de inventario desde bot (bot puede sugerir pero no ejecuta)
- Autenticación de bot para ejecutar compras o mermas directamente
- Reconciliación contable de inventario con cierre financiero
- Borrado/historial de recetas con versioning
- Previsión de compras por temporada o tendencia

---

## Riesgos activos

| Riesgo | Severidad | Estado |
|---|---|---|
| Fogo dev sin datos → bot inventa | P1 | Activo — pendiente seedear |
| `apply-sales` corre sin recetas → mueve 0 | P1 | Activo — depende de BOM completo |
| Bot endpoint sin rate limit (`/internal`) | P2 | Activo — solo serviceToken, sin quota |
| `bulk-import` en purchase-runs sin validación de duplicados | P2 | Por revisar en controller |
