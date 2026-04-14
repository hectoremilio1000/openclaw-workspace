# Bot Pipeline Diagnosis — 13 Abril 2026

## Cómo funciona el bot (de mensaje a respuesta)

```
WhatsApp msg llega
    │
    ▼
RECEIVE — valida teléfono, busca restaurante, deduplica, parsea estado
    │
    ▼
CLASSIFY (521 líneas) — primero keywords/regex, si no match → LLM con tool_use
    │                     10+ safety nets, detecta: reportes, acciones, marketing, guías
    │
    ▼
ROUTE — prioridad: acción activa > reporte > marketing > guía > QA general
    │
    ▼
EXECUTE (1,199 líneas) — el monstruo:
    │  1. Guardrails (cross-tenant, injection)
    │  2. Si es action → state machine multi-paso (confirmar, ejecutar)
    │  3. Si es reporte → query DB + formatear
    │  4. Si es QA → LLM con 7 capas de contexto (memoria + RAG + perfil)
    │  5. Si es marketing/guía → LLM especializado
    │
    ▼
PERSIST — guarda en DB: bot_runs, bot_run_events, conversation_history
    │
    ▼
REPLY — manda respuesta por WhatsApp
```

## 5 Problemas Reales

### 1. classify.ts es frágil (521 líneas de if/else)
Keywords hardcodeados. Si el usuario no dice exactamente "cuanto vendí" sino "cómo van las ventas de hoy", puede no matchear. El LLM fallback existe pero es secundario — debería ser primario.

### 2. execute.ts es un monolito (1,199 líneas)
Todo pasa por un solo archivo gigante. Cada tipo de ruta es un bloque de if/else. Difícil de mantener, difícil de testear.

### 3. No hay estado del negocio (s_t)
El bot NO construye un "restaurant state" antes de responder. No sabe que "ayer hubo 15 cancelaciones" a menos que le preguntes explícitamente.

### 4. Safe degradation inconsistente
A veces inventa datos cuando no tiene suficiente contexto. El confidence gating existe pero no es robusto.

### 5. Las 13 actions son state machines aisladas
Cada action es un archivo separado con su propia lógica. No comparten patrones. Código duplicado.

## Papers Para Leer

1. **ReAct: Synergizing Reasoning and Acting in Language Models (2023)** — https://arxiv.org/abs/2210.03629
   - Define el patrón Reason→Act→Observe. Tu bot hace Act→Reply pero le falta Reason.

2. **Toolformer: Language Models Can Teach Themselves to Use Tools (2023)** — https://arxiv.org/abs/2302.04761
   - Tu bot tiene 24 tools pero classify.ts decide con keywords. Toolformer muestra cómo el LLM decide solo.

3. **Anthropic's Tool Use Documentation** — https://docs.anthropic.com/en/docs/build-with-claude/tool-use
   - Exactamente cómo conectar tools al LLM. Tu tool_definitions.ts ya sigue este patrón.

4. **Building Effective Agents - Anthropic (2024)** — https://www.anthropic.com/research/building-effective-agents
   - Patrones de agentes: prompt chaining, routing, orchestrator-workers.

5. **LATS: Language Agent Tree Search (2024)** — https://arxiv.org/abs/2310.04406
   - Para cuando quieras que el cerebro razone sobre múltiples opciones.

## Plan de 4 Semanas

### Semana 1: Invertir classify.ts → LLM-first
El LLM con tools debe ser el router principal, no las keywords.

### Semana 2: Construir restaurant state (s_t)
buildRestaurantState() antes de cada respuesta: ventas, órdenes, cancelaciones, stock, turno.

### Semana 3: Partir execute.ts
1,199 líneas → 5-6 archivos: execute_report, execute_action, execute_qa, execute_marketing, execute_guide.

### Semana 4: Eval battery + safe degradation
Correr preguntas, medir pass/fail, mejorar iterativamente.
