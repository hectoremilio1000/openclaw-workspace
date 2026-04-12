# System Map — Inventarios

> Last updated: 2026-04-12 (reescrito con rutas reales de `routes.ts`)

---

## Runtime

| Componente | Stack | Puerto local | URL producción |
|---|---|---|---|
| `pos_inventory_api` | AdonisJS v6 + Lucid ORM + PostgreSQL | 3344 | https://pos-inventory-api-production-bba3.up.railway.app |
| `pos_bot_api` | AdonisJS v6 + Lucid ORM | 3357 | https://pos-bot-api-production.up.railway.app |
| `pos_admin_front` | React + Vite + Ant Design | 5173 (dev) | Vercel |
| OpenClaw orchestration | Node cron | — | — |

---

## Endpoints agrupados por dominio

### Catálogos base

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/GET:id/PUT:id/DELETE:id | `/api/measurement-units` | `MeasurementUnitsController` | CRUD unidades de medida |
| POST | `/api/measurement-units/ensure-defaults` | `MeasurementUnitsController` | `ensureDefaults` — seedea unidades estándar |
| GET/POST/PUT:id/DELETE:id | `/api/supplier-types` | `SupplierTypesController` | CRUD tipos de proveedor |

### Proveedores

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/PUT:id/DELETE:id | `/api/suppliers` | `SuppliersController` | CRUD proveedores |
| GET/POST/PUT:id/DELETE:id | `/api/supplier-markets` | `SupplierMarketsController` | CRUD mercados |
| GET/POST/DELETE | `/api/supplier-markets/:marketId/suppliers` | `SupplierMarketSuppliersController` | Asignación proveedor↔mercado |
| GET/POST/PUT:id/DELETE:id | `/api/purchase-routes` | `PurchaseRoutesController` | CRUD rutas de compra |

### Catálogo de insumos

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/GET:id/PUT:id/DELETE:id | `/api/inventory/items` | `InventoryItemsController` | CRUD insumos |
| PUT | `/api/inventory/items/:id/detail` | `InventoryItemsController` | `upsertDetail` — info extendida |
| GET/POST/PUT:id/DELETE:id | `/api/inventory/items/:itemId/presentations` | `InventoryPresentationsController` | Presentaciones por insumo |
| GET | `/api/inventory/presentations/search` | `InventoryPresentationsController` | `search` — búsqueda global de presentaciones |
| PUT | `/api/inventory/presentations/:id/detail` | `InventoryPresentationsController` | `upsertDetail` |
| GET/PUT/DELETE | `/api/inventory/presentations/:id/supplier-costs/:supplierId` | `InventoryPresentationSupplierCostsController` | Costo de presentación por proveedor |
| GET/POST/DELETE | `/api/inventory/items/:id/photos` | `InventoryItemPhotosController` | Fotos de insumo |
| GET/POST/PUT:id/DELETE:id | `/api/inventory/groups` | `InventoryGroupsController` | Grupos de insumos |

### Almacenes

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/PUT:id/DELETE:id | `/api/inventory/warehouses` | `InventoryWarehousesController` | CRUD almacenes |
| GET/POST/PUT:id/DELETE:id | `/api/inventory/warehouse-locations` | `WarehouseLocationsController` | CRUD ubicaciones dentro del almacén |

### Compras y abastecimiento

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/GET:id/PUT:id/DELETE:id | `/api/purchase-orders` | `PurchaseOrdersController` | CRUD órdenes de compra |
| POST/PUT/DELETE | `/api/purchase-orders/:id/items` | `PurchaseOrdersController` | `addItem`, `updateItem`, `destroyItem` |
| POST | `/api/purchase-orders/:id/receive` | `PurchaseOrdersController` | `receive` — recepción de mercancía |
| GET/POST/GET:id/PUT:id/DELETE:id | `/api/stock-requests` | `StockRequestsController` | CRUD solicitudes de stock entre almacenes |
| POST/PUT/DELETE | `/api/stock-requests/:id/items` | `StockRequestsController` | Líneas de solicitud |
| POST | `/api/stock-requests/:id/fulfill` | `StockRequestsController` | `fulfill` — despachar solicitud |
| GET/GET:weekday/GET last-run | `/api/recorridos` | `RecorridosController` | Recorridos de compra por día de semana |
| POST | `/api/recorridos/:weekday/generate-run` | `RecorridosController` | Genera viaje de compra desde recorrido |
| GET/POST/GET:id/PATCH:id | `/api/purchase-runs` | `PurchaseRunsController` | CRUD viajes de compra |
| POST | `/api/purchase-runs/reconcile` | `PurchaseRunsController` | Reconciliación |
| POST | `/api/purchase-runs/bulk-import` | `PurchaseRunsController` | Importación masiva |
| POST | `/api/purchase-runs/:id/close` | `PurchaseRunsController` | Cerrar viaje |
| POST | `/api/purchase-runs/:id/reopen` | `PurchaseRunsController` | Reabrir viaje |
| POST | `/api/purchase-runs/:id/cancel` | `PurchaseRunsController` | Cancelar viaje |

### Stock, conteos y cortes

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET | `/api/inventory/stocks` | `InventoryStocksController` | Stock actual por almacén/insumo |
| GET/POST/POST calc/GET:id/detail | `/api/inventory/cuts` | `InventoryCutsController` | Cortes de inventario (snapshot) |
| GET/POST/GET:id/POST:id/items/PATCH:id/items/:itemId/DELETE:id/items/:itemId/POST:id/close/DELETE:id | `/api/stock-counts` | `StockCountsController` | Conteos físicos con líneas |

### Mermas

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/PUT:id | `/api/inventory/wastes` | `InventoryWastesController` | Registro de mermas |
| POST | `/api/inventory/wastes/:id/apply` | `InventoryWastesController` | `apply` — aplica merma al stock |

### Movimientos

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST | `/api/inventory/movements` | `InventoryMovementsController` | Historial de movimientos (entradas/salidas/ajustes) |
| GET/DELETE | `/api/inventory/external-refs` | `InventoryExternalRefsController` | Referencias externas (liga producto POS ↔ insumo) |

### BOM / Recetas

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET/POST/GET:id/GET:id/lines/PUT:id/DELETE:id | `/api/inventory/recipes` | `InventoryRecipesController` | CRUD recetas |
| POST/DELETE | `/api/inventory/recipes/:id/lines` | `InventoryRecipesController` | `upsertLine`, `deleteLine` — ingredientes de receta |
| GET/POST/PUT reorder/PUT:stepId/DELETE:stepId | `/api/inventory/recipes/:id/steps` | `InventoryRecipesController` | Pasos de preparación con reordenamiento |
| GET/POST/PUT:id/DELETE:id | `/api/inventory/print-area-warehouse-maps` | `PrintAreaWarehouseMapsController` | Mapeo área de impresión → almacén |
| GET | `/api/pos-products` | `PosProductsController` | Catálogo de productos POS (proxy, para ligar con recetas) |

### Consumo automático por ventas

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| POST | `/api/inventory/consumption/apply-sales` | `InventorySalesConsumptionController` | `apply` — descuenta insumos según ventas + BOM |
| GET | `/api/inventory/consumption/estimate` | `InventorySalesConsumptionController` | `estimate` — simula consumo sin escribir |

### Bot interno (protegido por `serviceToken`)

| Método | Ruta | Controller | Acción |
|---|---|---|---|
| GET | `/internal/bot/inventory/purchases-summary` | `BotInventoryController` | Resumen de compras por rango de fechas (hasta 62 días) |
| GET | `/internal/bot/inventory/purchase-suggestions` | `BotInventoryController` | Sugerencias de compra según consumo |
| GET | `/internal/bot/inventory/stock-status` | `BotInventoryController` | Estado de stock actual |
| GET | `/internal/bot/inventory/supplier-order` | `BotInventoryController` | Pedido sugerido por proveedor |

---

## Tablas de datos conocidas

| Tabla | Propósito |
|---|---|
| `inventory_items` | Catálogo de insumos del restaurante |
| `inventory_item_details` | Info extendida de insumo (upsertDetail) |
| `inventory_groups` | Grupos/categorías de insumos |
| `inventory_presentations` | Presentaciones/empaques de un insumo |
| `inventory_presentation_details` | Info extendida de presentación |
| `inventory_presentation_supplier_costs` | Costo de presentación por proveedor |
| `inventory_item_photos` | Fotos de insumos |
| `measurement_units` | Unidades de medida (kg, lt, pza…) |
| `supplier_types` | Tipos de proveedor (verduras, carnes…) |
| `suppliers` | Proveedores |
| `supplier_markets` | Mercados / centrales de abasto |
| `supplier_market_suppliers` | Relación mercado ↔ proveedor |
| `purchase_routes` | Rutas de compra (combinación de mercados) |
| `inventory_warehouses` | Almacenes físicos del restaurante |
| `inventory_warehouse_locations` | Ubicaciones dentro del almacén |
| `purchase_orders` | Órdenes de compra |
| `purchase_order_items` | Líneas de orden de compra |
| `stock_requests` | Solicitudes de stock entre almacenes |
| `stock_request_items` | Líneas de solicitud |
| `recorridos` | Definición de recorrido por día de semana |
| `purchase_runs` | Viajes de compra (ejecución del recorrido) |
| `inventory_stocks` | Stock actual por insumo/almacén |
| `inventory_cuts` | Cortes/snapshots de inventario |
| `stock_counts` | Conteos físicos |
| `stock_count_items` | Líneas de conteo físico |
| `inventory_wastes` | Registros de merma |
| `inventory_movements` | Historial de movimientos (compra/ajuste/merma/consumo) |
| `inventory_external_refs` | Referencia producto POS ↔ insumo/presentación |
| `print_area_warehouse_maps` | Mapeo área de impresión → almacén |
| `inventory_recipes` | Recetas (BOM) |
| `inventory_recipe_lines` | Ingredientes por receta |
| `inventory_recipe_steps` | Pasos de preparación |

---

## Ownership práctico

| Responsabilidad | Dueño |
|---|---|
| Source of truth de inventario | `pos_inventory_api` |
| Consultas conversacionales de inventario | `pos_bot_api` → `/internal/bot/inventory/*` |
| UI operativa diaria | `pos_admin_front` → `/inventario/*` |
| Orquestación y crons | OpenClaw |
| Datos demo / actividad sintética | Fogo simulator |
