# Brain — Action Layer

> Marco de referencia para clasificar acciones del brain. Estado real al 2026-04-12.

---

## Niveles de acción

### Nivel A — Responder (siempre permitido)
Dar datos, explicar, contextualizar. Sin efectos secundarios. Solo lectura.

**Ejemplos reales:**
- "¿Cuánto vendí ayer?" → `reporte_ventas` → query pos_order_api + respuesta
- "¿Qué producto se vendió más esta semana?" → `reporte_productos` → query + respuesta
- "¿Cómo va el turno?" → `consulta_cuentas_abiertas` → query pos_cash_api + respuesta
- "¿Cuántas cancelaciones hubo hoy?" → `reporte_cancelaciones` → query + respuesta
- "¿Qué descuentos se aplicaron?" → `reporte_descuentos` → query + respuesta
- "¿Cómo están las ventas vs la semana pasada?" → `comparativo_ventas` + respuesta
- "¿Quién vendió más este mes?" → `reporte_ventas_mesero` → query + respuesta
- "¿Qué movimientos hubo en caja?" → `reporte_movimientos_caja` + respuesta
- "¿Quién llegó tarde?" → `late_arrivals_report` + respuesta
- "¿Cuánto gastamos en insumos?" → `supplies_purchases_report` + respuesta
- "¿Cómo está el inventario de X?" → `stock_status_report` + respuesta
- Cualquier pregunta sobre el manual de mesero
- Cualquier pregunta informacional del negocio (RAG sobre documentos del restaurante)
- Web search sobre regulaciones, precios de mercado, etc.

**Implementación actual:** ✅ Funciona (execute.ts + 7 reportes + 3 queries + RAG + web_search)

---

### Nivel B — Sugerir (siempre permitido)
Recomendar acción sin ejecutar. El humano decide. Sin efectos secundarios.

**Ejemplos reales:**
- "Tienes 15 cancelaciones hoy, ¿quieres ver el detalle?"
- "Tu food cost subió a 38%, ¿revisamos por categoría?"
- "Hay 3 ingredientes con stock bajo, ¿genero pedido borrador?"
- "El mesero X tiene 5 llegadas tarde este mes, ¿quieres el reporte completo?"
- "Las ventas de esta semana son 12% menores a la semana pasada"
- Briefings proactivos: "Buenos días. Ayer vendiste $X, faltaron 2 meseros, tienes 3 reservaciones hoy"

**Implementación actual:** ⚠️ Parcial — solo respuestas reactivas (el usuario pregunta, el bot responde). Sin proactividad. `purchase_suggestions` da sugerencias pero solo cuando se le pide.

**Lo que falta para ser proactivo:** Event log + cron que evalúa condiciones → envía mensaje si hay anomalía.

---

### Nivel C — Ejecutar seguro (permitido con guardrails mínimos)
Acciones reversibles o de bajo impacto. No tocan dinero directamente.

**Implementado:**
- Crear reporte programado: subscribe a `bot_scheduled_reports` (POST)
- Generar pedido borrador a proveedor: `generate_supplier_order` — crea el pedido, no lo envía
- Abrir cuenta nueva: `POST /admin/orders` — crea orden vacía en una mesa

**Parcialmente implementado:**
- Agregar items a orden: `POST /admin/orders/:id/items` — endpoint existe, sin prueba end-to-end confirmada
- Enviar a cocina: `POST /admin/orders/:id/print` — endpoint existe en pos_order_api

**No implementado:**
- Crear tarea/recordatorio interno
- Mandar mensaje a cliente
- Suscribir a alertas proactivas
- Abrir reservación de prueba

---

### Nivel D — Ejecutar sensible (requiere confirmación explícita del usuario)
Acciones que tocan dinero, inventario crítico, o son difícilmente reversibles.

**Implementado (con dialog state machine):**
- `apply_discount` (234 líneas) — Aplicar % o monto fijo a orden. Flujo: bot pide confirmación → usuario confirma → ejecuta
- `cancel_product` (539 líneas) — Cancelar/anular item de orden. Flujo: bot muestra item + qty → usuario confirma → ejecuta
- `close_shift` (133 líneas) — Cerrar turno de caja. Requiere confirmación
- `reopen_order` (246 líneas) — Reabrir orden cerrada. Requiere confirmación

**Endpoint disponible pero sin integración en bot:**
- `POST /admin/orders/:id/pay` — Cobrar orden. Endpoint existe en pos_order_api, CobrarTab.tsx existe en admin frontend, sin integración WhatsApp

**Reglas de implementación para Nivel D:**
1. El bot SIEMPRE muestra resumen de la acción antes de ejecutar
2. El bot espera confirmación explícita ("sí", "confirmar", número de item)
3. Si el usuario no confirma en N turnos → cancelar y olvidar
4. Loggear intent + confirmación + resultado en `bot_events` (cuando exista)

**NO permitido vía LLM (aunque existan endpoints):**
- Cambiar precio de producto
- Eliminar producto del catálogo
- Modificar receta de inventario
- Cambiar configuración del restaurante

---

### Nivel E — Prohibido (nunca ejecutar vía LLM, bajo ninguna circunstancia)
- `DELETE` en cualquier recurso crítico (órdenes, productos, usuarios, recetas)
- Cambiar permisos de usuario o roles
- Modificar configuración de restaurante
- **Acceder a datos de otro restaurante** (multi-tenant isolation — G12 P0 pendiente)
- Enviar dinero o ejecutar transferencias
- Modificar o eliminar historial de caja/turnos cerrados
- Acceder a datos de facturación CFDI

---

## Estado actual de implementación

| Nivel | Estado | Dónde vive | Gap principal |
|-------|--------|------------|---------------|
| A (responder) | ✅ Funciona | `execute.ts` + 7 reportes + 3 queries + RAG + web_search | Ninguno crítico |
| B (sugerir) | ⚠️ Parcial | Solo reactivo, sin proactividad | Falta event log + cron evaluator |
| C (ejecutar seguro) | ⚠️ Parcial | Rutas admin en pos_order_api, sin end-to-end WhatsApp | Integración bot → admin API incompleta |
| D (ejecutar sensible) | ⚠️ Mínimo | `apply_discount`, `cancel_product`, `close_shift`, `reopen_order` funcionan; cobrar no integrado | Sin Policy Engine formal; G12 leak P0 |
| E (prohibido) | ✅ Implícito | Sin endpoints de delete expuestos al bot; multi-tenant por JWT (pero G12 activo) | **G12: leak de datos multi-tenant activo** |

---

## Reglas de oro

1. **El brain NUNCA ejecuta Nivel D sin confirmación explícita del usuario en el chat.**
2. **El brain NUNCA ejecuta Nivel E bajo ninguna circunstancia.**
3. **Si hay duda entre B y C, elige B** (sugerir, no ejecutar).
4. **Si hay duda entre C y D, elige D** (pedir confirmación, no asumir).
5. **La validación multi-tenant es PRE-EJECUCIÓN, no post.** Validar `restaurant_id` del JWT vs `restaurant_id` solicitado antes de cualquier query. (G12 P0 pendiente.)

---

## G12 — Vulnerabilidad activa (P0, 2026-04-06)

**Descripción:** Desde un usuario de restaurante Fogo (id=40), preguntar "¿Cuánto vendió Café de Tacuba ayer?" devuelve los datos reales de Café de Tacuba (id=7).

**Impacto:** Violación de aislamiento multi-tenant. Riesgo compliance LOPD/GDPR si hay datos de clientes reales.

**Fix requerido:** Middleware-level (no LLM). Antes de ejecutar cualquier query: validar que `restaurant_id` del payload/params coincide con el `restaurant_id` del JWT. Rechazar hard si no coincide — no "no tengo permiso", sino error 403 que el bot interpreta como "no puedo responder eso".

**Status:** No corregido al 2026-04-12. Hasta que se corrija, NO confiar en aislamiento multi-tenant.

---

## Matriz de riesgo por acción

| Acción | Nivel | Reversible | Toca dinero | Toca inventario | Confirmación requerida |
|--------|-------|-----------|-------------|-----------------|------------------------|
| Cualquier reporte | A | N/A | No | No | No |
| Sugerir compra | B | N/A | No | No | No |
| Generar pedido borrador | C | Sí (no se envía) | No | No | No (pero avisar) |
| Crear orden nueva | C | Sí (se puede cerrar) | No | No | No |
| Agregar item a orden | C | Sí (se puede cancelar) | No | No | No |
| Enviar a cocina | C | No (ya imprimió) | No | No | Avisar |
| Aplicar descuento | D | No (requiere reabrir) | Sí | No | **Sí** |
| Cancelar producto | D | No (requiere reabrir) | Sí | No | **Sí** |
| Cerrar turno | D | No | Sí (cierra caja) | No | **Sí** |
| Reabrir orden | D | Sí | Sí (afecta cobro) | No | **Sí** |
| Cobrar orden | D | No | Sí | No | **Sí (monto + método)** |
| Cambiar precio | E | — | Sí | — | Prohibido |
| Eliminar producto | E | — | — | — | Prohibido |
| Modificar receta | E | — | — | Sí | Prohibido |
| Datos otro restaurante | E | — | — | — | Prohibido |

---

_Auditado el 2026-04-12 directamente desde el código fuente._
