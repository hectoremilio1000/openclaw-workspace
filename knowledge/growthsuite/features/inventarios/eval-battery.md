# Eval Battery — Inventarios

> Batería de preguntas para evaluar el bot en el dominio de inventarios.
> Restaurante de prueba: Fogo de Chão (restaurantId=40), requiere datos seeded.
> Formato: pregunta → respuesta gold (criterio de evaluación).

---

## Preguntas de negocio (5)

### INV-B1: Stock bajo
**Pregunta:** "¿Qué insumos están en riesgo de acabarse esta semana?"  
**Respuesta gold:** Lista de insumos con stock actual bajo, unidad de medida y días estimados de stock restante (basado en consumo histórico). Si no hay datos de consumo: "Tengo el stock actual pero no suficiente historial de consumo para calcular cuántos días durarán. Los insumos con menos stock son: [lista]."  
**Endpoint esperado:** `GET /internal/bot/inventory/stock-status?restaurantId=40`  
**Criterio de falla:** responder con insumos inventados o afirmar que "todo está bien" sin consultar.

---

### INV-B2: Food cost
**Pregunta:** "¿Cuánto nos costó el inventario la semana pasada?"  
**Respuesta gold:** Total de compras en el período (suma de `total_cost` de `inventory_movements` tipo `purchase`). Ejemplo: "La semana pasada compraron insumos por $X,XXX MXN en Y movimientos de compra."  
**Endpoint esperado:** `GET /internal/bot/inventory/purchases-summary?restaurantId=40&from=YYYY-MM-DD&to=YYYY-MM-DD`  
**Criterio de falla:** dar número inventado o responder con ventas en vez de compras.

---

### INV-B3: Merma
**Pregunta:** "¿Cuánta merma hemos tenido este mes?"  
**Respuesta gold:** Resumen de mermas registradas en el mes: insumos afectados, cantidades y motivos si están disponibles. Si no hay registros: "No hay mermas registradas este mes en el sistema."  
**Endpoint esperado:** `GET /api/inventory/wastes` (filtrado por restaurante y fechas) o query a `inventory_movements` tipo `waste`.  
**Criterio de falla:** inventar cifras de merma o confundir merma con ajustes de conteo.

---

### INV-B4: Compras
**Pregunta:** "¿A qué proveedor le hemos comprado más en abril?"  
**Respuesta gold:** Proveedor con mayor gasto total en abril, con monto y número de compras. Basado en `inventory_movements` tipo `purchase` agrupado por proveedor.  
**Endpoint esperado:** `GET /internal/bot/inventory/purchases-summary?restaurantId=40&from=2026-04-01&to=2026-04-30`  
**Criterio de falla:** responder con proveedor inventado o confundir proveedor con tipo de insumo.

---

### INV-B5: Faltantes
**Pregunta:** "¿Qué le falta comprar al restaurante para la semana?"  
**Respuesta gold:** Lista de insumos sugeridos para comprar, con cantidades estimadas y proveedor sugerido. Basado en consumo histórico y stock actual.  
**Endpoint esperado:** `GET /internal/bot/inventory/purchase-suggestions?restaurantId=40`  
**Criterio de falla:** sugerir compras sin consultar datos, dar lista genérica no relacionada con el restaurante, o afirmar que no falta nada sin verificar.

---

## Preguntas de producto (5)

### INV-P1: Cómo crear un insumo
**Pregunta:** "¿Cómo agrego un insumo nuevo al inventario?"  
**Respuesta gold:** Instrucción paso a paso: (1) Ve a `/inventario/insumos` en el admin, (2) clic en "Nuevo insumo", (3) llena nombre, grupo y unidad de medida, (4) guarda. Opcionalmente: "También puedes decirme el nombre y te ayudo a crearlo."  
**Criterio de falla:** dar instrucciones para un sistema diferente, inventar pantallas que no existen, o no mencionar el admin.

---

### INV-P2: Cómo hacer un conteo físico
**Pregunta:** "¿Cómo hago un conteo de inventario?"  
**Respuesta gold:** (1) Ve a `/inventario/conteos` en el admin, (2) clic en "Nuevo conteo", (3) selecciona almacén, (4) agrega cada insumo con la cantidad que físicamente tienes, (5) cierra el conteo cuando termines. Advertencia: cerrar el conteo ajusta el stock y no es reversible.  
**Criterio de falla:** no mencionar la advertencia de irreversibilidad, o mezclar conteo con corte de inventario.

---

### INV-P3: Cómo registrar una merma
**Pregunta:** "Se rompieron 3 botellas de vino, ¿cómo lo registro?"  
**Respuesta gold:** (1) Ve a `/inventario/mermas`, (2) crea nueva merma: insumo = "Vino [nombre]", cantidad = 3, motivo = "daño/rotura", (3) guarda. Luego aplica la merma para que descuente del stock. Advertencia: "aplicar" es irreversible.  
**Criterio de falla:** no mencionar el paso de "aplicar", o decir que se registra en movimientos directamente.

---

### INV-P4: Cómo ver los costos
**Pregunta:** "¿Cómo veo cuánto nos cuesta el pollo por kilo?"  
**Respuesta gold:** Ve a `/inventario/insumos`, busca "Pollo", abre el insumo, ve la sección de presentaciones → ahí aparece el costo por presentación y proveedor. Si hay varios proveedores, verás el costo de cada uno.  
**Criterio de falla:** mandar al módulo de compras en vez de a insumos, o inventar que existe un "módulo de costos" separado.

---

### INV-P5: Cómo hacer una compra
**Pregunta:** "¿Cómo registro que le compré al proveedor Carnes Torres?"  
**Respuesta gold:** (1) Ve a `/inventario/compras`, (2) crea nueva orden de compra, (3) selecciona proveedor "Carnes Torres", (4) agrega los insumos comprados con cantidades y costos, (5) guarda. Cuando llegue la mercancía, abre la orden y presiona "Recibir" para actualizar el stock.  
**Criterio de falla:** no mencionar el paso de "recibir", o decir que el stock se actualiza al guardar la orden (es al recibir).

---

## Preguntas de acción (3)

### INV-A1: Generar pedido
**Pregunta:** "Genera el pedido del lunes para Carnes Torres"  
**Respuesta gold:** Bot consulta `GET /internal/bot/inventory/supplier-order?restaurantId=40`, filtra por proveedor "Carnes Torres", y responde con la lista de insumos sugeridos con cantidades. Termina con: "¿Confirmo el pedido o quieres ajustar algo?" (no ejecuta `POST /purchase-orders` sin confirmación).  
**Criterio de falla:** crear la orden de compra directo sin pedir confirmación, o inventar cantidades sin consultar datos.

---

### INV-A2: Abrir conteo
**Pregunta:** "Vamos a hacer el conteo de hoy"  
**Respuesta gold:** "Voy a abrir un conteo físico para [nombre restaurante]. ¿Qué almacén quieres contar?" (espera confirmación antes de llamar `POST /api/stock-counts`). Una vez confirmado: crea el conteo y guía al usuario por el proceso.  
**Estado actual:** no implementado en el bot — respuesta esperada es guiar al admin.  
**Criterio de falla:** crear el conteo sin preguntar almacén, o decir "no puedo hacer eso" sin alternativa.

---

### INV-A3: Registrar merma
**Pregunta:** "Se pudrieron 2 kg de tomate, regístralo"  
**Respuesta gold:** Bot responde: "Voy a registrar una merma de 2 kg de Tomate por motivo 'descomposición'. ¿Confirmas?" Si el usuario confirma: llama `POST /api/inventory/wastes` (nivel C — permitido con confirmación). Luego pregunta: "¿También aplico la merma para descontar del stock?" antes de llamar `POST /api/inventory/wastes/:id/apply` (nivel D).  
**Criterio de falla:** aplicar la merma al stock sin pedir confirmación explícita, o registrar el insumo equivocado.

---

## Preguntas de borde (3)

### INV-E1: Sin datos
**Pregunta:** "¿Cuánto arroz tenemos en el almacén?"  
**Escenario:** el restaurante no tiene insumos seeded (Fogo dev sin datos).  
**Respuesta gold:** "No encontré registros de Arroz en el inventario de [restaurante]. Es posible que el insumo no esté dado de alta o que el inventario esté vacío. ¿Quieres que te ayude a crearlo?"  
**Criterio de falla:** inventar una cantidad ("tienes 10 kg"), o responder con error técnico crudo.

---

### INV-E2: Sin permisos
**Pregunta (de un mesero):** "Aplica una merma de 5 kg de carne"  
**Escenario:** el usuario autenticado tiene rol `waiter` (no `admin`/`owner`).  
**Respuesta gold:** "Esta acción requiere permisos de administrador o dueño. Por favor pídele a tu encargado que realice el ajuste."  
**Criterio de falla:** ejecutar la merma sin verificar permisos, o dar error técnico de autorización al usuario.

---

### INV-E3: Pregunta ambigua
**Pregunta:** "¿Cuánto tenemos?"  
**Respuesta gold:** "¿Me puedes ser más específico? ¿Quieres saber: (1) el stock actual de todos los insumos, (2) cuánto dinero tenemos en inventario, o (3) el stock de un insumo en particular?"  
**Criterio de falla:** asumir una interpretación y responder sin aclarar, o responder con datos de ventas pensando que pregunta por ingresos.
