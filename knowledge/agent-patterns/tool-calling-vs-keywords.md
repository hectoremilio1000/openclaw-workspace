# Pattern: Tool-Calling nativo vs Keyword Routing

> **Cuándo usar:** cuando tienes un agente LLM que debe decidir qué acción ejecutar basándose en input de lenguaje natural.

## El anti-pattern: LLM como router de keywords

```ts
// classify.ts (lo que tiene el bot actual de GrowthSuite)
const WAITER_MANUAL_KEYWORDS = ['atender', 'atencion', 'protocolo', 'regla', ...]
const HOWTO_PATTERNS = ['como hago', 'como le doy', 'como creo', ...]
const CANCEL_KEYWORDS = ['cancela', 'cancelacion', 'anula', ...]

function classify(text: string): Intent {
  if (text.includes('como')) return 'how_to'
  if (CANCEL_KEYWORDS.some(k => text.includes(k))) return 'cancel'
  if (WAITER_MANUAL_KEYWORDS.some(k => text.includes(k))) return 'waiter_manual'
  // ... 521 líneas más
}
```

### Por qué es un anti-pattern

1. **No escala con dominios.** Cada feature nueva = +50 keywords. El archivo crece sin control.
2. **Keywords chocan entre sí.** "Cancela" puede ser cancelar orden, cancelar reserva, cancelar turno, cancelar descuento.
3. **No entiende paráfrasis.** "Elimina el producto" no activa `CANCEL_KEYWORDS`.
4. **Frágil ante typos.** "kancela" no lo ve nadie.
5. **No compone.** "Cancela la coca y aplica 10% descuento" es 2 acciones, el router solo ve 1.
6. **El LLM está esperando sin hacer nada.** Desperdicias la capacidad generativa del modelo usándolo solo para generar la respuesta final.

## El pattern correcto: Tool-Calling nativo

```ts
const tools: Tool[] = [
  {
    name: 'cancel_order_item',
    description: 'Cancel a specific item from an open order. Use when the user wants to remove, cancel, or eliminate a product from a table.',
    parameters: z.object({
      order_id: z.number().describe('ID of the open order'),
      item_id: z.number().describe('ID of the item to cancel'),
      reason: z.string().optional(),
    }),
    risk_level: 'high',
    execute: cancelOrderItem,
  },
  {
    name: 'apply_discount',
    description: 'Apply a percentage discount to an order. Valid values: 1-100.',
    parameters: z.object({
      order_id: z.number(),
      percent: z.number().min(1).max(100),
      reason: z.string(),
    }),
    risk_level: 'high',
    execute: applyDiscount,
  },
  // ... más tools
]

// El agente:
const result = await llm.chat({
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ],
  tools,
})

// El LLM decide qué tools llamar, con qué parámetros, en qué orden.
```

### Por qué funciona

1. **El LLM ve los schemas.** Decide por descripción semántica, no por keyword matching.
2. **Escalable.** Agregar una tool nueva = agregar un objeto al array. No tocas `classify.ts`.
3. **Compone.** El LLM puede llamar múltiples tools en paralelo o secuencia.
4. **Paráfrasis resuelta.** "Elimina", "cancela", "quita", "borra", "descarta" → todas activan `cancel_order_item` porque el LLM entiende el concepto.
5. **Validación de tipos gratis.** Zod/TypeBox valida los argumentos antes de ejecutar.
6. **Probado en producción.** Claude Code, ChatGPT, Cursor, todos usan este patrón.

## Diferencia en código: agregar un feature nuevo

### Con keywords (bot actual de GrowthSuite)
Para agregar "reportes de meseros":
1. Agregar keywords a `classify.ts` (+30 líneas)
2. Agregar ruta en `action_routes.ts` (+15 líneas)
3. Agregar case en `execute.ts` (+50 líneas)
4. Agregar helper `waiter_report.ts` (+200 líneas)
5. Fix de casos que chocan con keywords existentes (+tests)

**Total: ~300-500 líneas tocando 4+ archivos.**

### Con tool-calling
Para agregar "reportes de meseros":
```ts
{
  name: 'waiter_performance_report',
  description: 'Get performance metrics for waiters: sales, covers, tips, avg ticket. Use when user asks about waiter performance.',
  parameters: z.object({
    waiter_id: z.number().optional(),
    period: z.enum(['today', 'week', 'month']).default('today'),
  }),
  risk_level: 'low',
  execute: waiterPerformanceReport,
}
```

**Total: ~50 líneas en 1 archivo.**

## Limitaciones y cuándo NO usar solo tool-calling

### 1. Acciones críticas siguen necesitando Policy Engine
Tool-calling decide QUÉ tool llamar. No garantiza que sea SEGURO ejecutarla. Siempre pasa por `policy-engine.md`.

### 2. Rendimiento / latencia
Tool-calling tiene un ida-y-vuelta extra al LLM vs keywords. Para casos de alto tráfico con respuestas fijas (ej: FAQs), las keywords son más rápidas. **Solución:** usar keywords como primera línea (cache), LLM como fallback cuando las keywords no hacen match.

### 3. Casos de uso muy específicos
Si tu agente solo hace 3 cosas y las 3 son triviales, tool-calling es overkill.

## El híbrido: keywords como cache, LLM como fallback

El mejor compromiso en producción:

```ts
async function classify(text: string): Promise<Intent> {
  // Paso 1: keywords rápidas (caché)
  const quickMatch = keywordMatcher.match(text)
  if (quickMatch.confidence > 0.9) return quickMatch.intent
  
  // Paso 2: LLM tool-calling como fallback
  const llmDecision = await llmToolRouter.decide({
    userMessage: text,
    availableTools: toolRegistry.getLowRiskTools(),
  })
  
  return llmDecision.intent
}
```

**Por qué funciona:**
- 80% del tráfico lo resuelve keywords (barato, rápido)
- 20% del tráfico lo resuelve LLM (paráfrasis, edge cases)
- Alto-riesgo SIEMPRE pasa por Policy Engine antes de ejecutar

## Referencia

Claude Code usa este pattern con 40+ tools. Ver:
- `~/Downloads/src/Tool.ts` — definición base
- `~/Downloads/src/QueryEngine.ts` — el loop del agente con tool-calling
- `~/.openclaw/workspace/knowledge/claude-code-internals/architecture.md` — análisis del source

## Aplicación a GrowthSuite

Ticket #7 del sprint Track 1:
- **Branch:** `hector_dev/bot-t1-07-llm-classify-fallback`
- **Estrategia:** NO matar `classify.ts` (las 521 líneas de keywords son 2 años de aprendizaje). Agregar LLM tool-calling como fallback cuando las keywords no hacen match.
- **Feature flag:** `BOT_FF_LLM_CLASSIFY_FALLBACK=true`
- **Tools en fallback:** solo low-risk (reportes read-only). Alto-riesgo sigue por keywords obligatoriamente.

Ver detalles en: `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md` sección Ticket #7.
