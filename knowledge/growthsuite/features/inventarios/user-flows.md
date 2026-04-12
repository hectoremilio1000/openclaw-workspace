# User Flows — Inventarios

> Last updated: 2026-04-12

## Flujo 1: Ver estado actual de inventario

**Actor:** dueño / admin  
**Trigger:** quiere saber si hay riesgo operativo en inventario hoy

**Pasos:**
1. Entra al admin o pregunta por bot.
2. El sistema consulta stock, movimientos recientes y señales de riesgo.
3. El brain responde resumen ejecutivo o lookup directo.
4. Si no hay soporte fino, degrada sin inventar.

**Resultado esperado:** el usuario entiende si hay foco rojo, faltantes o normalidad.

**Errores conocidos:**
- Si la query no soporta granularidad por ingrediente, no se debe inventar precisión.
- Si faltan datos consolidados, responder señal general y no detalle falso.

---

## Flujo 2: Detectar insumo con consumo atípico

**Actor:** dueño / gerente  
**Trigger:** pregunta qué ingrediente se está consumiendo más rápido o si hay algo raro

**Pasos:**
1. Hace la pregunta por bot.
2. El brain intenta clasificar `inventory_health` o subclase específica.
3. Si existe soporte fuerte, responde con señal concreta.
4. Si no, usa safe degradation y redirige a una señal útil.

**Resultado esperado:** evitar alucinación y dar una pista operativa real.

**Errores conocidos:**
- Riesgo alto de falsa precisión si no existe query robusta.
- Puede requerir recetas/movimientos consistentes para ser fiable.

---

## Flujo 3: Registrar ajuste o merma

**Actor:** encargado / admin  
**Trigger:** detecta faltante, daño o corrección de stock

**Pasos:**
1. Selecciona insumo/almacén.
2. Captura cantidad, motivo y contexto.
3. El sistema valida permisos y registra movimiento.
4. Queda trazabilidad para auditoría.

**Resultado esperado:** stock actualizado con historial claro.

**Errores conocidos:**
- Si se permite write sin validación, se vuelve un agujero operativo.
- Debe evitarse ejecución libre desde LLM.

---

## Flujo 4: Crear compra / reabastecimiento

**Actor:** dueño / compras / admin  
**Trigger:** detecta bajo inventario o prepara abastecimiento

**Pasos:**
1. Revisa faltantes o sugerencia del sistema.
2. Selecciona proveedor e insumos.
3. Captura cantidades/costos.
4. Confirma creación de orden.
5. Después registra recepción.

**Resultado esperado:** flujo controlado entre sugerencia, compra y recepción.

**Errores conocidos:**
- Si no hay policy engine, el brain no debe mutar esto automáticamente.
- Requiere idempotencia y autorización por tocar dinero e inventario.
