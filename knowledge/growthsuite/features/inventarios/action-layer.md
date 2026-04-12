# Action Layer — Inventarios

> Last updated: 2026-04-12 (reescrito con endpoints reales de `routes.ts`)
> Niveles de riesgo: A (solo lectura) → E (irreversible, dinero real)

---

## Nivel A — Solo lectura (sin efectos secundarios)

| Acción | Endpoint real | Reversible |
|---|---|---|
| Ver stock actual | `GET /api/inventory/stocks` | N/A |
| Ver movimientos recientes | `GET /api/inventory/movements` | N/A |
| Ver insumos del catálogo | `GET /api/inventory/items` | N/A |
| Ver insumo individual | `GET /api/inventory/items/:id` | N/A |
| Ver presentaciones de un insumo | `GET /api/inventory/items/:itemId/presentations` | N/A |
| Buscar presentaciones | `GET /api/inventory/presentations/search` | N/A |
| Ver costos por proveedor | `GET /api/inventory/presentations/:id/supplier-costs` | N/A |
| Ver cortes de inventario | `GET /api/inventory/cuts` + `GET /api/inventory/cuts/:id/detail` | N/A |
| Ver conteos físicos | `GET /api/stock-counts` + `GET /api/stock-counts/:id` | N/A |
| Ver mermas | `GET /api/inventory/wastes` | N/A |
| Ver recetas (BOM) | `GET /api/inventory/recipes` + `GET /api/inventory/recipes/:id` + `lines` + `steps` | N/A |
| Ver proveedores | `GET /api/suppliers`, `GET /api/supplier-markets` | N/A |
| Ver órdenes de compra | `GET /api/purchase-orders`, `GET /api/purchase-orders/:id` | N/A |
| Ver viajes de compra | `GET /api/purchase-runs`, `GET /api/purchase-runs/:id` | N/A |
| Ver solicitudes de stock | `GET /api/stock-requests`, `GET /api/stock-requests/:id` | N/A |
| Ver recorridos | `GET /api/recorridos`, `GET /api/recorridos/:weekday` | N/A |
| Estimar consumo (sin escribir) | `GET /api/inventory/consumption/estimate` | N/A |
| Preguntar al bot por inventario | `GET /internal/bot/inventory/stock-status` | N/A |
| Resumen de compras (bot) | `GET /internal/bot/inventory/purchases-summary?restaurantId=&from=&to=` | N/A |
| Sugerencias de compra (bot) | `GET /internal/bot/inventory/purchase-suggestions` | N/A |
| Pedido sugerido por proveedor (bot) | `GET /internal/bot/inventory/supplier-order` | N/A |

---

## Nivel B — Escribe pero reversible (catálogo, configuración)

| Acción | Endpoint real | Cómo revertir |
|---|---|---|
| Crear insumo | `POST /api/inventory/items` | `DELETE /api/inventory/items/:id` si no tiene movimientos |
| Editar insumo | `PUT /api/inventory/items/:id` | Re-editar |
| Agregar detalle de insumo | `PUT /api/inventory/items/:id/detail` | Re-editar |
| Crear grupo de insumos | `POST /api/inventory/groups` | Eliminar si sin insumos asignados |
| Crear presentación | `POST /api/inventory/presentations` | Eliminar antes de uso operativo |
| Editar costos de presentación por proveedor | `PUT /api/inventory/presentations/:id/supplier-costs/:supplierId` | Re-editar |
| Crear proveedor | `POST /api/suppliers` | Editar o eliminar |
| Crear mercado / ruta de compra | `POST /api/supplier-markets` / `POST /api/purchase-routes` | Editar o eliminar |
| Crear almacén | `POST /api/inventory/warehouses` | Editar o eliminar si sin stock |
| Alta de receta (BOM) | `POST /api/inventory/recipes` | Eliminar antes de aplicar a ventas |
| Editar líneas / pasos de receta | `POST /api/inventory/recipes/:id/lines`, `PUT steps/:stepId` | Re-editar o eliminar línea |
| Seedear unidades por defecto | `POST /api/measurement-units/ensure-defaults` | Idempotente — seguro repetir |

---

## Nivel C — Escribe con efectos secundarios menores

| Acción | Endpoint real | Efecto secundario |
|---|---|---|
| Crear conteo físico | `POST /api/stock-counts` | Abre sesión de conteo activa |
| Añadir / editar línea de conteo | `POST /api/stock-counts/:id/items`, `PATCH /api/stock-counts/:id/items/:itemId` | Modifica cantidades del conteo |
| Aplicar consumo por ventas | `POST /api/inventory/consumption/apply-sales` | Descuenta stock según BOM + ventas del día. Requiere recetas completas. |
| Crear corte de inventario | `POST /api/inventory/cuts` / `POST /api/inventory/cuts/calc` | Registra snapshot del stock en un momento dado |
| Generar run desde recorrido | `POST /api/recorridos/:weekday/generate-run` | Crea `purchase_run` con items del recorrido |
| Crear viaje de compra | `POST /api/purchase-runs` | Inicia un viaje que puede cerrarse con costos |
| Actualizar viaje de compra | `PATCH /api/purchase-runs/:id` | Modifica datos del viaje en curso |

---

## Nivel D — Toca dinero / inventario (requiere Policy Engine)

| Acción | Endpoint real | Validaciones requeridas |
|---|---|---|
| Crear orden de compra | `POST /api/purchase-orders` | Proveedor válido, idempotency check, autorización de usuario |
| Editar orden de compra | `PUT /api/purchase-orders/:id` | Verificar que no esté recibida |
| Recibir mercancía | `POST /api/purchase-orders/:id/receive` | Referencia de compra válida, cantidades, autorización. **Mueve stock.** |
| Cerrar viaje de compra | `POST /api/purchase-runs/:id/close` | Valida que no haya items pendientes |
| Reconciliación de purchase run | `POST /api/purchase-runs/reconcile` | Cuadra diferencias entre lo comprado y lo recibido |
| Bulk import de purchase runs | `POST /api/purchase-runs/bulk-import` | Validar duplicados, restaurantId, cantidades |
| Registrar merma | `POST /api/inventory/wastes` | Motivo requerido, cantidad positiva |
| **Aplicar merma al stock** | `POST /api/inventory/wastes/:id/apply` | **Descuenta stock real.** Requiere autorización explícita. |
| Crear movimiento manual | `POST /api/inventory/movements` | Tipo de movimiento (compra/ajuste/merma/consumo), auditoría obligatoria |
| Fulfillment de solicitud de stock | `POST /api/stock-requests/:id/fulfill` | Valida stock disponible en almacén origen |
| Bot sugiere compra (futuro) | action layer pendiente | Confirmación humana + policy engine antes de ejecutar |

---

## Nivel E — Irreversible / crítico

| Acción | Endpoint real | Quién puede ejecutar |
|---|---|---|
| Cerrar conteo físico | `POST /api/stock-counts/:id/close` | Ajusta stock al contado — **no reversible** sin nuevo conteo |
| Eliminar conteo físico | `DELETE /api/stock-counts/:id` | Admin autorizado únicamente |
| Eliminar historial de movimiento | No existe endpoint de DELETE para `movements` — correcto por diseño | — |
| Reabrir viaje de compra | `POST /api/purchase-runs/:id/reopen` | Auditoría requerida |
| Cancelar viaje de compra | `POST /api/purchase-runs/:id/cancel` | Estado financiero impactado |

---

## Regla de diseño

- **Nivel A/B**: el bot puede ejecutar o recomendar sin validación adicional.
- **Nivel C**: el bot puede ejecutar con confirmación del usuario en el chat.
- **Nivel D/E**: el bot **recomienda únicamente**. La ejecución pasa por policy engine, autorización por rol y registro de auditoría.
- Las mutaciones nivel D/E no deben salir directo del LLM. El LLM puede preparar el payload, el policy engine decide si ejecutar.
