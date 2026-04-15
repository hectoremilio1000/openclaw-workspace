# Implementation Plan — Full Brain Migration (Kill Pipeline Viejo)

> Date: 2026-04-14
> Goal: Migrar TODAS las capacidades del pipeline viejo al brain para que sea la única fuente de verdad
> Timeline estimado: 4 semanas (2 personas)
> Prerequisite: Pipeline refactorizado + brain products domain completado

## Estado actual

El brain maneja 4 dominios de consulta: sales, cancellations, discounts, products.
El pipeline viejo maneja: 14 actions, reportes con fechas, RAG, marketing, web search, saludos, memoria.
~70% de los mensajes todavía pasan por el pipeline viejo.

## Principio: Strangler Fig

Cada fase agrega dominios al brain. El pipeline viejo se encoge. Cuando el brain maneja todo, el pipeline viejo se elimina en un solo commit.

NO se apaga el pipeline viejo hasta que TODAS las fases estén completas y testeadas.

---

## FASE 1 — Ya completada ✅

| Dominio | Estado |
|---|---|
| sales | ✅ brain |
| cancellations | ✅ brain |
| discounts | ✅ brain |
| products | ✅ brain |

---

## FASE 2 — Consultas con fecha (1 semana)

### Objetivo
"cuánto vendí ayer", "ventas del martes", "comparar esta semana vs anterior" → el brain resuelve con date parsing.

### 2.1 — Date parser
- Crear utility `parseDateFromText(text)` → { start: Date, end: Date, label: string }
- Patrones: "hoy", "ayer", "esta semana", "semana pasada", "lunes", "martes"..., "del 10 al 15", "este mes"
- **Test:** 15+ casos unitarios de parsing
- **Commit:** `feat(brain): date parser utility`

### 2.2 — Brain sales con fecha
- El handler de sales recibe fecha parseada
- state.getSalesForDate(start, end) → nuevo getter lazy
- **Test:** "cuánto vendí ayer" → datos de ayer, no de hoy
- **Commit:** `feat(brain): sales handler accepts date ranges`

### 2.3 — Brain reports con fecha
- Extender a: "reporte de cancelaciones de ayer", "descuentos de esta semana"
- Todos los dominios existentes aceptan fecha
- **Test:** "cancelaciones de ayer" → datos correctos de ayer
- **Commit:** `feat(brain): all domains accept date ranges`

### 2.4 — Comparativos
- "comparar ventas de hoy vs ayer", "esta semana vs la anterior"
- El brain carga 2 periodos y calcula delta %
- **Test:** "comparar ventas hoy vs ayer" → "$X hoy (+Y% vs ayer)"
- **Commit:** `feat(brain): comparative reports with delta`

### Regression
- Todos los mensajes de Tier 1 siguen funcionando
- "cuánto vendí hoy" sigue respondiendo igual

---

## FASE 3 — Saludos + fallback (2 días)

### 3.1 — Greeting handler
- Brain detecta saludos: "hola", "buenos días", "hey", "buenas"
- Responde con menú de opciones (igual que hoy)
- **Test:** "hola" → menú de opciones (sin cambio visual)

### 3.2 — Farewell handler
- Brain detecta despedidas: "adiós", "bye", "hasta luego", "gracias"
- Responde con despedida amigable (HOY NO EXISTE — es un bug)
- **Test:** "adiós" → "¡Hasta pronto! 👋" (NUEVO)

### 3.3 — Fallback handler
- Si el brain no detecta ningún dominio → web search o "no entendí"
- Reutiliza la lógica de execute_fallback.ts
- **Test:** "asdfghjkl" → fallback graceful

### 3.4 — Emoji handler
- 👍 → feedback positivo, 👎 → feedback negativo
- **Test:** "👍" → "¡Gracias por tu feedback!"

---

## FASE 4 — Acciones simples (1 semana)

### Objetivo
Las 14 actions del bot viejo migran al brain como tools con confirmación.

### 4.1 — Framework de acciones en el brain
- Crear `app/brain/actions/` con interfaz estándar:
  ```typescript
  interface BrainAction {
    name: string
    description: string
    requiresConfirmation: boolean
    execute(params, restaurantId): Promise<ActionResult>
  }
  ```
- State machine para confirmación: propose → confirm → execute → result
- **Test:** unit test del framework de acciones
- **Commit:** `feat(brain): action framework with confirmation`

### 4.2 — apply_discount
- Migrar la lógica de actions/apply_discount.ts al brain
- Brain propone: "¿Aplico 10% a mesa 3? (sí/no)"
- Usuario confirma → brain ejecuta
- **Test:** "aplica 10% mesa 3" → propone → "sí" → aplicado
- **Commit:** `feat(brain): apply_discount action`

### 4.3 — cancel_product
- "cancela la coca de la mesa 5" → propone → confirma → cancela
- **Test:** flujo completo de cancelación
- **Commit:** `feat(brain): cancel_product action`

### 4.4 — close_shift
- "cierra el turno" → propone con resumen → confirma → cierra
- **Test:** flujo completo de cierre
- **Commit:** `feat(brain): close_shift action`

### 4.5 — reopen_order
- "reabre la orden de mesa 7" → propone → confirma → reabre
- **Test:** flujo completo
- **Commit:** `feat(brain): reopen_order action`

---

## FASE 5 — Acciones complejas (1 semana)

### 5.1 — generate_supplier_order
- Multi-paso: seleccionar proveedor → seleccionar productos → confirmar cantidades → generar borrador
- **Test:** flujo completo con mocks
- **Commit:** `feat(brain): supplier_order action`

### 5.2 — purchase_suggestions
- Brain analiza stock + consumo + historial → sugiere compras
- **Test:** sugerencias coherentes basadas en datos
- **Commit:** `feat(brain): purchase_suggestions`

### 5.3 — late_arrivals_report
- Brain consulta asistencias y genera reporte
- **Test:** reporte con datos reales
- **Commit:** `feat(brain): late_arrivals`

### 5.4 — Otras acciones menores
- stock_status_report, supplies_purchases_report, xcut_report, sales_comparison_report
- Migrar una por una
- **Test:** cada una por separado

---

## FASE 6 — RAG + Marketing + Memoria (1 semana)

### 6.1 — RAG como tool del brain
- Brain llama a RAG cuando la pregunta es sobre manuales/protocolos/guías
- Reutiliza el RAG engine existente (bot_documents, chunks, reranker)
- **Test:** "cómo atender a un cliente difícil" → respuesta de RAG

### 6.2 — Marketing handler
- Brain genera sugerencias de marketing basadas en datos del restaurante
- **Test:** "sugiere una promoción" → sugerencia con datos reales

### 6.3 — Memory extraction
- Después de cada respuesta del brain, extraer hechos para bot_memories
- Reutiliza extractAndSaveMemories() existente
- **Test:** conversación deja memoria persistente

### 6.4 — Informational handler
- Preguntas tipo "qué es un corte X", "cómo funciona el IVA"
- Brain usa conocimiento + RAG
- **Test:** respuesta informativa correcta

---

## FASE 7 — Matar pipeline viejo (2 días)

### 7.1 — Verificar cobertura completa
- Correr eval battery de TODOS los dominios (50+ preguntas)
- Score mínimo: 85% pass rate
- Si no llega → NO matar el pipeline viejo

### 7.2 — Eliminar código muerto
- Eliminar classify.ts (521 líneas)
- Eliminar route.ts (203 líneas)
- Eliminar execute.ts monolito y execute/ handlers que ya no se usen
- Eliminar action_routes.ts (553 líneas)
- Eliminar BRAIN_DOMAINS env var (todo es brain)
- Eliminar shouldUseBrain() — siempre usa brain
- **Estimado:** -2,000+ líneas de código

### 7.3 — Simplificar engine.ts
- Engine ya no necesita classify viejo → solo brain
- Pipeline: receive → state(lazy) → brain → persist → measure → reply
- **Estimado:** engine.ts baja de 102 a ~40 líneas

### 7.4 — Tests finales
- Re-correr TODA la eval battery (50+ preguntas)
- Re-correr todos los unit tests
- Verificar en Fogo local
- Verificar en Railway DEV
- **Score final esperado:** >85%

---

## Resumen de eliminación de código

| Archivo | Líneas | Estado final |
|---|---|---|
| classify.ts | 521 | ELIMINADO |
| route.ts | 203 | ELIMINADO |
| execute.ts (stages) | 7 | ELIMINADO |
| action_routes.ts | 553 | ELIMINADO |
| execute/shared.ts | 491 | PARCIAL (guardrails se mueven al brain) |
| execute/index.ts | 139 | ELIMINADO |
| execute/execute_*.ts | ~800 | ELIMINADOS (lógica migrada al brain) |
| **Total eliminado** | **~2,700 líneas** | |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Acción del pipeline viejo no migrada | Eval battery por dominio ANTES de eliminar |
| Brain falla en producción | Feature flag por restaurante (solo Fogo primero) |
| Performance (brain más lento que keywords) | El brain ya usa deterministic-first para 60%+ |
| Reportes con fecha se rompen | Date parser con 15+ unit tests |
| Acciones multi-paso rompen conversación | State machine con tests de flujo completo |

## Orden de ejecución semanal

| Semana | Fase | Entregable |
|---|---|---|
| 1 | Fase 2 (fechas) | Brain maneja "ventas de ayer", comparativos |
| 2 | Fase 3 + 4 (saludos + acciones simples) | 4 acciones migradas, saludos, fallback |
| 3 | Fase 5 + 6 (acciones complejas + RAG) | Todas las acciones, RAG, marketing, memoria |
| 4 | Fase 7 (kill pipeline) | -2,700 líneas, brain es única fuente de verdad |
