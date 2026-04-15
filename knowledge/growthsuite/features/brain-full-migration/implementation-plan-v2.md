# Implementation Plan v2 — Brain as Only Router (Revised)

> Date: 2026-04-14
> Revision: v2 — corregido de 4 semanas a 2.5 semanas
> Corrección clave: NO reescribir handlers que ya funcionan. Solo migrar el routing al brain.
> Branch base: dev

## Principio fundamental

```
ROUTING  = roto (classify.ts vs brain compiten) → REEMPLAZAR
HANDLERS = funcionan (14 actions, RAG, memoria, reportes) → REUSAR
```

No reescribimos 5,500 líneas de handlers. Reescribimos 1,314 líneas de routing.

## Inventario real del código

| Capa | Líneas | Estado | Acción |
|---|---|---|---|
| Brain (router + handlers) | 1,339 | Funciona para 4 dominios | Expandir routing |
| Actions (14 acciones) | 3,196 | Funcionan | Reusar |
| RAG | 693 | Funciona | Reusar |
| Memory | 869 | Funciona | Reusar |
| Pipeline stages (classify, route, action_routes) | 1,314 | Redundante con brain | ELIMINAR |
| Execute handlers (report, qa, marketing, fallback) | 739 | Funcionan | Reusar desde brain |

---

## FASE 1 — Brain se vuelve el único router (3-4 días)

### Objetivo
`detectBrainDomain()` cubre TODOS los tipos de mensaje. El classify viejo ya no decide nada.

### 1.1 — Inventariar todos los tipos de mensaje que classify.ts detecta
- Leer classify.ts (521 líneas) y listar TODOS los paths:
  - Saludos, emojis, acciones activas, reportes, business, legal, marketing, HR, informational, LLM tool_use, LLM prompt
- Documentar qué keywords/patrones activan cada uno
- **Test:** ninguno (solo lectura)
- **Commit:** ninguno

### 1.2 — Expandir detectBrainDomain() para cubrir TODOS los tipos
- Agregar dominios al brain router.ts:
  - `greeting` — "hola", "buenas", "hey" (5 líneas de matching, no LLM)
  - `farewell` — "adiós", "bye", "hasta luego" (5 líneas)
  - `emoji` — 👍, 👎 (3 líneas)
  - `action_discount` — "aplica descuento", "10% mesa 3"
  - `action_cancel` — "cancela", "quita el producto"
  - `action_close_shift` — "cierra el turno"
  - `action_reopen` — "reabre la orden"
  - `action_supplier` — "genera pedido", "compras sugeridas"
  - `report_generic` — "reporte de ventas", "cuánto vendí"
  - `rag` — preguntas sobre manuales, "cómo atender..."
  - `marketing` — "sugiere una promo", "campaña"
  - `informational` — "qué es un corte X"
  - `fallback` — todo lo demás
- **Test 1.2:**
  - "hola" → domain: greeting ✅
  - "aplica 10% mesa 3" → domain: action_discount ✅
  - "cancela la coca" → domain: action_cancel ✅
  - "cuánto vendí ayer" → domain: report_generic ✅
  - "cómo atender a un cliente difícil" → domain: rag ✅
  - "asdfghjkl" → domain: fallback ✅
  - REGRESSION: "cuánto vendí hoy" → domain: sales ✅ (sin cambio)
- **Commit:** `feat(brain): expand router to cover all message types`

### 1.3 — Brain delega a execute handlers EXISTENTES
- En execute_brain.ts, agregar dispatch por dominio:
  ```
  greeting → ejecutar saludo (reusar lógica de execute_qa.ts greeting)
  farewell → "¡Hasta pronto! 👋"
  emoji → feedback handler (reusar)
  action_* → delegar a actions/ existentes (reusar registry)
  report_generic → delegar a execute_report.ts (reusar)
  rag → delegar a execute_qa.ts RAG path (reusar)
  marketing → delegar a execute_marketing.ts (reusar)
  informational → delegar a execute_qa.ts info path (reusar)
  fallback → delegar a execute_fallback.ts (reusar)
  ```
- NO reescribir los handlers. Solo llamarlos desde el brain path.
- **Test 1.3:**
  - "hola" → misma respuesta que antes (menú opciones) ✅
  - "aplica 10% mesa 3" → misma respuesta que antes (propone descuento) ✅
  - "cómo atender a un cliente difícil" → respuesta de RAG ✅
  - REGRESSION: todos los mensajes anteriores dan la misma respuesta ✅
- **Commit:** `feat(brain): delegate all domains to existing handlers`

### 1.4 — Feature flag: BRAIN_ONLY=true
- Cuando BRAIN_ONLY=true, el engine salta classify+route y va directo al brain
- Cuando BRAIN_ONLY=false (default), sigue como hoy (brain primero, fallback a classify)
- Activar BRAIN_ONLY=true solo en Fogo para probar
- **Test 1.4:**
  - Con BRAIN_ONLY=true: 10 mensajes de prueba → todos responden correctamente
  - Con BRAIN_ONLY=false: nada cambia (regression)
- **Commit:** `feat(brain): BRAIN_ONLY feature flag`

### 1.5 — Regression completa de Fase 1
- Correr eval battery de 10+ mensajes con BRAIN_ONLY=true
- Score mínimo: 80% (igual o mejor que hoy)
- Si score < 80% → NO avanzar a Fase 2
- **Commit:** `test(brain): regression suite for brain-only mode`

---

## FASE 2 — Date parsing para brain (1 semana)

### 2.1 — Reutilizar normalizeRelativeDates()
- El pipeline viejo ya tiene date parsing en classify.ts y bot_helpers.js
- Extraer esa lógica a un utility compartido: `app/brain/utils/date_parser.ts`
- NO reescribir — mover y limpiar
- **Test 2.1:** 15+ casos unitarios (hoy, ayer, esta semana, martes, del 10 al 15)
- **Commit:** `refactor(brain): extract date parser from classify to shared utility`

### 2.2 — Brain domains aceptan fecha
- Los handlers de sales, products, cancellations, discounts reciben fecha parseada
- Nuevo getter lazy: state.getSalesForDate(start, end)
- **Test 2.2:** "cuánto vendí ayer" → datos de ayer ✅
- **Commit:** `feat(brain): date-aware domain handlers`

### 2.3 — Comparativos
- "comparar ventas hoy vs ayer" → brain carga 2 periodos, calcula delta %
- **Test 2.3:** respuesta con "$X hoy (+Y% vs ayer)" ✅
- **Commit:** `feat(brain): comparative reports`

### 2.4 — Regression Fase 2
- Todos los mensajes de Fase 1 siguen funcionando
- + mensajes con fecha: "ventas de ayer", "cancelaciones de esta semana"
- Score mínimo: 85%

---

## FASE 3 — Acciones a través del brain (1 semana)

### Principio: NO reescribir las actions. Llamarlas desde el brain.

### 3.1 — Brain detecta intención de acción → delega a action registry
- El brain detecta "aplica 10% mesa 3" → domain: action_discount
- En vez de reescribir apply_discount, el brain:
  1. Parsea parámetros (porcentaje, mesa)
  2. Llama al action handler existente con esos parámetros
  3. El action handler maneja la state machine (proponer → confirmar → ejecutar)
  4. Brain formatea la respuesta
- **Test 3.1:** "aplica 10% mesa 3" → propone → "sí" → descuento aplicado ✅
- **Commit:** `feat(brain): action dispatch via existing registry`

### 3.2 — Multi-turn conversation state
- Las actions usan state machines multi-paso
- El brain debe recordar que hay una acción en progreso
- Reutilizar activeActions de receive.ts (ya existe)
- **Test 3.2:** "aplica 10%" → "¿a qué mesa?" → "mesa 3" → "¿confirmas?" → "sí" → hecho ✅
- **Commit:** `feat(brain): multi-turn action state via activeActions`

### 3.3 — Migrar las 14 actions una por una
- Para CADA action:
  - Verificar que el brain la detecta correctamente
  - Verificar que delega al handler existente
  - Verificar que la state machine funciona
  - Si algo falla → fix puntual, no reescritura
- Orden:
  1. apply_discount (la más usada)
  2. cancel_product
  3. close_shift
  4. reopen_order
  5. generate_supplier_order
  6. purchase_suggestions
  7. late_arrivals_report
  8. stock_status_report
  9. supplies_purchases_report
  10. xcut_report
  11. sales_comparison_report
  12-14. las restantes
- **Test 3.3:** cada action testeada individualmente + regression
- **Commits:** uno por action migrada

### 3.4 — Regression Fase 3
- Todas las mensajes de Fases 1-2 siguen funcionando
- + todas las actions
- Score mínimo: 85%

---

## FASE 4 — Kill pipeline viejo (2-3 días)

### 4.1 — Verificar cobertura completa
- Eval battery de 30+ preguntas cubriendo TODOS los dominios
- Score mínimo: 85% con BRAIN_ONLY=true
- Si no llega → NO matar el pipeline viejo. Arreglar primero.

### 4.2 — Eliminar código muerto
- `classify.ts` (521 líneas) → ELIMINAR
- `route.ts` (203 líneas) → ELIMINAR
- `action_routes.ts` (553 líneas) → ELIMINAR
- `BRAIN_ONLY` flag → siempre true, luego eliminar el flag
- `shouldUseBrain()` → eliminar
- `BRAIN_DOMAINS` env var → eliminar (todo es brain)
- **Test:** build + all unit tests pass
- **Commit:** `refactor(bot): remove legacy pipeline — brain is only router`

### 4.3 — Simplificar engine.ts
- Pipeline: receive → state(lazy) → brain → persist → measure → reply
- Engine baja de ~100 a ~40 líneas
- **Test:** regression suite completa
- **Commit:** `refactor(bot): simplified engine — brain-only pipeline`

### 4.4 — Regression final
- 30+ preguntas
- Score final esperado: >85%
- Verificar en Fogo local + Railway DEV

---

## Resumen de eliminación de código

| Archivo | Líneas | Estado final |
|---|---|---|
| classify.ts | 521 | ELIMINADO |
| route.ts | 203 | ELIMINADO |
| action_routes.ts | 553 | ELIMINADO |
| BRAIN_ONLY flag | - | ELIMINADO |
| **Total eliminado** | **~1,300 líneas** | |
| **Líneas reusadas** | **~5,500** | actions, RAG, memory, execute handlers |

## Timeline

| Semana | Fase | Entregable |
|---|---|---|
| 1 (días 1-4) | Fase 1 (brain = only router) | Brain detecta todos los dominios, delega a handlers existentes |
| 1-2 (días 5-9) | Fase 2 (dates) | Date parsing reutilizado, comparativos |
| 2-3 (días 10-14) | Fase 3 (actions) | 14 actions delegadas desde brain, state machines reutilizadas |
| 3 (días 15-17) | Fase 4 (kill) | -1,300 líneas, brain es única fuente de verdad |

**Total: 2.5 semanas, no 4.**

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Action edge case no cubierto por brain routing | BRAIN_ONLY=false como fallback |
| Date parser no cubre todos los casos | Reutilizar el parser viejo, no reinventar |
| Multi-turn state se pierde | Reusar activeActions existente |
| Regression en acciones que ya funcionan | NO reescribir, solo delegar |
