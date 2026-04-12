# User Flows — Inventarios

> Last updated: 2026-04-12 (4 flujos originales revisados + 3 flujos nuevos)

---

## Flujo 1: Ver estado actual de inventario

**Actor:** dueño / admin  
**Trigger:** quiere saber si hay riesgo operativo en inventario hoy  
**Canal:** admin (`/inventario/insumos`) o bot WhatsApp

**Pasos:**
1. Admin: entra a `/inventario/insumos` → ve lista de insumos con stock actual (via `GET /api/inventory/stocks`)
2. Bot: envía "¿cómo está el stock?" → bot llama `GET /internal/bot/inventory/stock-status?restaurantId=X`
3. El sistema retorna insumos con cantidad actual, unidad y almacén
4. Si hay insumos con stock cero o bajo → se marca como alerta visual (admin) o se incluye en respuesta bot

**Resultado esperado:** el usuario entiende qué hay en stock, qué falta y si hay riesgo operativo.

**Errores conocidos:**
- Si Fogo dev no tiene datos seeded → stock-status retorna vacío → bot puede confundirse
- Si `apply-sales` no se ha corrido → stock puede estar desactualizado por consumo no descontado

---

## Flujo 2: Detectar insumo con consumo atípico

**Actor:** dueño / gerente  
**Trigger:** quiere saber si hay algún insumo con consumo inusualmente alto  
**Canal:** bot WhatsApp

**Pasos:**
1. Pregunta "¿qué insumo se está gastando más rápido de lo normal?"
2. Bot clasifica como pregunta de inventario → llama `GET /internal/bot/inventory/purchase-suggestions`
3. El sistema cruza consumo histórico vs stock actual y retorna los insumos con mayor velocidad de consumo
4. Bot responde con lista priorizada (insumo, consumo diario promedio, días de stock restante)

**Resultado esperado:** señal operativa concreta, no alucinación.

**Errores conocidos:**
- Sin BOM completo (recetas), el consumo calculado es 0 → el bot no puede detectar anomalías
- Si no hay historial de `apply-sales`, no hay línea base de consumo
- Safe degradation obligatoria: si no hay datos, responder "no tengo datos de consumo suficientes" en vez de inventar

---

## Flujo 3: Registrar ajuste o merma

**Actor:** encargado / admin  
**Trigger:** detecta faltante, daño o corrección de stock  
**Canal:** admin (`/inventario/mermas`) o admin (`/inventario/movimientos`)

**Pasos (via admin):**
1. Entra a `/inventario/mermas`
2. Crea merma: `POST /api/inventory/wastes` (insumo, cantidad, motivo)
3. Revisa el registro creado
4. Confirma: `POST /api/inventory/wastes/:id/apply` — **descuenta del stock real**
5. El movimiento queda registrado en `inventory_movements` con tipo `waste`

**Resultado esperado:** stock actualizado con historial de merma auditado.

**Errores conocidos:**
- `apply` es irreversible — la UI debe mostrar confirmación explícita antes de ejecutar
- Sin un segundo factor (PIN / confirmación), cualquier usuario con acceso puede aplicar mermas

---

## Flujo 4: Crear compra / reabastecimiento

**Actor:** dueño / compras / admin  
**Trigger:** detecta bajo inventario o prepara abastecimiento semanal  
**Canal:** admin (`/inventario/compras`) o bot WhatsApp para sugerencia

**Pasos:**
1. Bot: "¿qué necesito comprar este lunes?" → `GET /internal/bot/inventory/supplier-order`
   - Bot responde con lista por proveedor y cantidades sugeridas
2. Admin: valida la sugerencia y crea orden de compra: `POST /api/purchase-orders`
3. Agrega líneas: `POST /api/purchase-orders/:id/items`
4. Sale a comprar (o genera el viaje: `POST /api/recorridos/:weekday/generate-run`)
5. Al recibir mercancía: `POST /api/purchase-orders/:id/receive` → **mueve stock**
6. El movimiento queda en `inventory_movements` tipo `purchase`

**Resultado esperado:** flujo controlado entre sugerencia del bot → orden → recepción → stock actualizado.

**Errores conocidos:**
- Si el bot ejecutara `POST /purchase-orders` directo sin confirmación = violación de Policy Engine
- El bot debe recomendar/preparar, el usuario confirma en admin o WhatsApp reply
- `receive` sin validación de cantidades puede dejar stock inconsistente

---

## Flujo 5: Conteo rápido desde WhatsApp

**Actor:** encargado de almacén  
**Trigger:** toca hacer conteo físico semanal  
**Canal:** bot WhatsApp + admin para cierre

**Pasos:**
1. Encargado pregunta al bot "voy a hacer el conteo de hoy"
2. Bot crea conteo físico: `POST /api/stock-counts` (nivel C — requiere confirmación)
3. Encargado va insumo por insumo y reporta cantidad: "Arroz: 12 kg"
4. Bot traduce y llama: `PATCH /api/stock-counts/:id/items/:itemId`
5. Al terminar: encargado dice "cerrar conteo" → bot confirma y llama `POST /api/stock-counts/:id/close`
6. El sistema calcula diferencia stock esperado vs contado → registra ajustes

**Resultado esperado:** conteo físico completo sin necesidad de entrar al admin.

**Estado actual:** el bot **no implementa** este flujo todavía. Requiere Semana 3 del implementation plan.

**Errores conocidos:**
- `close` es nivel E (irreversible) — requiere doble confirmación
- Sin recetas, el "stock esperado" puede ser incorrecto → diferencias falsas

---

## Flujo 6: Consulta de costos

**Actor:** dueño  
**Trigger:** quiere saber cuánto le cuesta un insumo y si cambió de precio  
**Canal:** bot WhatsApp o admin

**Pasos (bot):**
1. "¿Cuánto nos cuesta el tomate?"
2. Bot consulta `GET /api/inventory/items` + `GET /api/inventory/presentations/:id/supplier-costs`
3. Retorna: presentación(es), costo actual por proveedor, unidad de medida

**Pasos (admin):**
1. Va a `/inventario/insumos` → busca el insumo
2. Abre `ItemPresentationsDrawer` → ve presentaciones con costos por proveedor

**Resultado esperado:** costo actual + comparativa por proveedor si hay varios.

**Estado actual:** los datos **sí existen** en la BD (si hay costos seeded). El bot **no implementa** la consulta de costos todavía — requiere integración en Semana 3.

---

## Flujo 7: Recepción de mercancía

**Actor:** encargado de almacén / comprador  
**Trigger:** llegó el pedido del proveedor  
**Canal:** admin (`/inventario/compras`)

**Pasos:**
1. Entra a `/inventario/compras` → busca la orden de compra correspondiente
2. Abre `PurchaseReceiveModal`
3. Verifica cantidades recibidas vs ordenadas
4. Confirma: `POST /api/purchase-orders/:id/receive`
5. El sistema:
   - Registra movimiento tipo `purchase` en `inventory_movements`
   - Actualiza stock en `inventory_stocks`
   - Cierra o parcializa la orden

**Resultado esperado:** stock actualizado con trazabilidad completa de la compra.

**Errores conocidos:**
- Si se recibe sin orden previa → debe usarse `POST /api/inventory/movements` directo (menos auditado)
- `PurchaseReceiveModal` debe bloquear recepción si la orden ya fue recibida (evitar duplicado)
- Para viajes de compra: usar `POST /api/purchase-runs/:id/close` en vez de receive de orden
