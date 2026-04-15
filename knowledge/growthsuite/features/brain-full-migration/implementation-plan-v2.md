# Implementation Plan v2 — Brain as Only Router (Revised)

> Date: 2026-04-14
> Revision: v2.1 — 2026-04-15
> Corrección clave: NO reescribir handlers que ya funcionan. Solo migrar el routing al brain.
> Cambios vs v2: sin BRAIN_ONLY flag (branch/local test en su lugar), 3 capas en 1.2 (no 17 dominios planos), timeline Fase 3 más realista.
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

### 1.2 — Expandir detectBrainDomain() usando 3 CAPAS

> **Por qué 3 capas y no 17 dominios planos:** 17 dominios con keywords sería otro classify.ts. El problema del routing no es "pocos dominios", es "la herramienta equivocada para cada tipo de mensaje". Las 3 capas usan la herramienta correcta para cada caso.

#### Capa 1 — Trivial (~20 líneas de keywords simples)
Mensajes sin ambigüedad. No necesitan LLM. Match inmediato.
- `greeting` — "hola", "buenas", "hey", "buenos días"
- `farewell` — "adiós", "bye", "hasta luego", "nos vemos"
- `emoji` — 👍, 👎, ❤️ (feedback puro)
- `feedback` — "gracias", "ok", "perfecto", "entendido"

#### Capa 2 — Data (determinístico, ya existe en brain)
Los handlers de datos ya existen y funcionan. El router solo asigna el dominio correcto.
- `sales` — "cuánto vendí", "ventas de hoy/ayer"
- `products` — "qué productos vendí", "producto más vendido"
- `cancellations` — "cancelaciones", "qué se canceló"
- `discounts` — "descuentos aplicados", "qué descuentos hubo"
- `report_generic` — "reporte de", "dame el resumen"
- `rag` — "cómo atender", preguntas sobre manuales, regulaciones
- `marketing` — "sugiere una promo", "campaña"
- `informational` — "qué es un corte X", preguntas conceptuales

#### Capa 3 — Actions (LLM tool_use via chatLLMWithTools)
Acciones donde keywords no alcanzan: "aplica un descuentito a la 3" tiene demasiadas variantes. El LLM infiere la intención y selecciona el tool. Reutilizar `chatLLMWithTools` que ya existe.
- Tool schema por action: `apply_discount`, `cancel_product`, `close_shift`, `reopen_order`, `generate_supplier_order`, `purchase_suggestions`
- Si el LLM no selecciona ningún tool → **Capa 4**

#### Capa 4 — Fallback
- Web search (si pregunta sobre regulaciones externas, noticias)
- "No entendí" (si nada más aplica)

**Implementación:**
- Router evalúa capas en orden: Trivial → Data → Actions (LLM) → Fallback
- Capa Trivial: O(1), sin LLM
- Capa Data: O(1), sin LLM (keywords determinísticas del dominio ya existente)
- Capa Actions: 1 llamada LLM con tool_use (solo si capas anteriores no matchean)
- Costo LLM solo cuando es necesario

**Test 1.2:**
- "hola" → Trivial → domain: greeting ✅ (sin LLM)
- "cuánto vendí ayer" → Data → domain: sales ✅ (sin LLM)
- "aplica un descuentito a la 3" → Actions LLM → tool: apply_discount ✅
- "cancela la coca de la mesa 5" → Actions LLM → tool: cancel_product ✅
- "cómo atender a un cliente difícil" → Data → domain: rag ✅
- "asdfghjkl" → Fallback ✅
- REGRESSION: todos los dominios existentes del brain → mismos resultados ✅

**Commit:** `feat(brain): 3-layer router — trivial/data/actions(tool_use)/fallback`

### 1.3 — Brain delega a execute handlers EXISTENTES
- En execute_brain.ts, agregar dispatch por dominio:
  ```
  greeting → ejecutar saludo (reusar lógica de execute_qa.ts greeting)
  farewell → "¡Hasta pronto! 👋"
  emoji/feedback → feedback handler (reusar)
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

### 1.4 — Regression completa de Fase 1 (sin feature flag)
- Todo el trabajo de Fase 1 ocurre en un **branch dedicado** (`hector_dev/brain-only-router`)
- Correr eval battery de 10+ mensajes **en local** antes de mergear
- Score mínimo: 80% (igual o mejor que hoy)
- Si score < 80% → NO mergear. Arreglar en el mismo branch.
- Si score ≥ 80% → merge directo a dev (no hace falta flag de entorno)
- **Commit:** `test(brain): regression suite — brain as only router`

> **Por qué sin BRAIN_ONLY flag:** un flag de entorno protege contra rollback en prod, pero introduce deuda (código muerto, branch logic en engine.ts, riesgo de olvidar limpiarlo). El branch + local test da el mismo safety net: si falla, no se mergea. Si pasa, se mergea y el código queda limpio desde el día 1.

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

## FASE 3 — Acciones a través del brain (~7-8 días)

### Principio: NO reescribir las actions. Llamarlas desde el brain.

> **Timeline realista:** las actions no son iguales. Dividir en simples (1-2 pasos, lectura) y complejas (multi-turn, state machine, tocan dinero). 1 día para 4 simples, 1 día para 4 complejas, 2-3 días para testing y regression. Total: 7-8 días.

### 3.1 — Brain detecta intención de acción → delega a action registry
- El brain (Capa 3, tool_use) detecta "aplica 10% mesa 3" → tool: apply_discount
- En vez de reescribir apply_discount, el brain:
  1. Parsea parámetros (porcentaje, mesa) desde el tool_call del LLM
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

### 3.3 — Día 1: Actions simples (4 acciones, ~1 día)
Actions de lectura o 1-2 pasos sin state machine compleja:
1. `late_arrivals_report` — solo lectura
2. `stock_status_report` — solo lectura
3. `supplies_purchases_report` — solo lectura
4. `xcut_report` — solo lectura

Para CADA action:
- Verificar que el brain la detecta (Capa 3 tool_use)
- Verificar que delega al handler existente
- Si algo falla → fix puntual, no reescritura
- **Commits:** uno por action migrada

### 3.4 — Día 2: Actions complejas (4 acciones, ~1 día)
Actions multi-turn o que tocan dinero/inventario:
1. `apply_discount` — confirmar antes de aplicar
2. `cancel_product` — confirmar antes de cancelar
3. `close_shift` — state machine, tocan contabilidad
4. `reopen_order` — state crítico

Para CADA action:
- Verificar detección, delegación y state machine multi-turn
- Si algo falla → fix puntual, no reescritura
- **Commits:** uno por action migrada

### 3.5 — Días 3-5: Acciones restantes + testing (2-3 días)
- `generate_supplier_order` — crea pero no envía
- `purchase_suggestions` — sugiere solo
- `sales_comparison_report` — lectura comparativa
- Actions 12-14 restantes
- Regression de TODAS las actions con suite de 20+ mensajes
- Score mínimo: 85%
- **Commits:** uno por action + commit de regression

---

## FASE 4 — Kill pipeline viejo (2-3 días)

### 4.1 — Verificar cobertura completa
- Eval battery de 30+ preguntas cubriendo TODOS los dominios
- Score mínimo: 85% en branch local
- Si no llega → NO matar el pipeline viejo. Arreglar primero.

### 4.2 — Eliminar código muerto
- `classify.ts` (521 líneas) → ELIMINAR
- `route.ts` (203 líneas) → ELIMINAR
- `action_routes.ts` (553 líneas) → ELIMINAR
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
| **Total eliminado** | **~1,300 líneas** | |
| **Líneas reusadas** | **~5,500** | actions, RAG, memory, execute handlers |

## Timeline

| Semana | Fase | Entregable |
|---|---|---|
| 1 (días 1-4) | Fase 1 (brain = only router, 3 capas) | Brain detecta todos los dominios via trivial/data/tool_use, delega a handlers existentes, mergeado si regression ≥ 80% |
| 1-2 (días 5-9) | Fase 2 (dates) | Date parsing reutilizado, comparativos |
| 2-3 (días 10-17) | Fase 3 (actions, 7-8 días) | 14 actions delegadas desde brain: 1d simples + 1d complejas + 2-3d testing |
| 3 (días 18-20) | Fase 4 (kill) | -1,300 líneas, brain es única fuente de verdad |

**Total: ~3 semanas.**

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Capa 3 (tool_use) infiere mal la acción | Tool schemas estrictos + test explícito por action antes de mergear |
| Date parser no cubre todos los casos | Reutilizar el parser viejo, no reinventar |
| Multi-turn state se pierde | Reusar activeActions existente |
| Regression en acciones que ya funcionan | NO reescribir, solo delegar |
| Action compleja falla en Día 2 | Se puede tomar Día 3 sin atrasar el total (buffer incluido en 7-8 días) |
