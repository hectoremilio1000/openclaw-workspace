# Pattern: Tool-Calling Nativo vs Keyword Routing

> Copia consolidada del patron para referencia rapida.
> Detalle completo en: `knowledge/agent-patterns/tool-calling-vs-keywords.md`

---

## Resumen

| Approach | Cuando usarlo | Ejemplo |
|----------|--------------|---------|
| **Keywords** | Acciones conocidas, alto trafico, 80% del trafico | "cerrar turno", "reporte de ventas" |
| **LLM Tool-Calling** | Parafrasis, edge cases, 20% del trafico | "como les fue ayer", "que onda con los descuentos" |
| **Hibrido** | Lo correcto en produccion | keywords primero, LLM como fallback |

## El hibrido correcto

```ts
async function classify(text: string): Promise<Intent> {
  // Paso 1: keywords rapidas (cache)
  const quickMatch = keywordMatcher.match(text)
  if (quickMatch.confidence > 0.9) return quickMatch.intent
  
  // Paso 2: LLM tool-calling como fallback
  const llmDecision = await llmToolRouter.decide({
    userMessage: text,
    availableTools: toolRegistry.getTools(),
  })
  
  return llmDecision.intent
}
```

## Agregar feature nuevo con tool-calling

```ts
{
  name: 'waiter_performance_report',
  description: 'Get performance metrics for waiters.',
  parameters: z.object({
    waiter_id: z.number().optional(),
    period: z.enum(['today', 'week', 'month']).default('today'),
  }),
  risk_level: 'low',
  execute: waiterPerformanceReport,
}
```

**1 archivo, ~50 lineas.** vs 300-500 lineas en 4+ archivos con keywords.

## Regla de seguridad

Tool-calling decide QUE tool llamar. Policy Engine decide SI se puede ejecutar.
Alto-riesgo (dinero, inventario, clientes) SIEMPRE pasa por Policy Engine.
