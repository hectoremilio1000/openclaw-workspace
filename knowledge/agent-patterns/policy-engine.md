# Pattern: Policy Engine (Separación Razonamiento / Control / Ejecución / Aprendizaje)

> **Cuándo usar:** cuando un agente LLM toma decisiones que afectan dinero, inventario, datos de clientes, o cualquier estado crítico.

## El problema

Si dejas que el LLM proponga y ejecute directamente:
```
usuario → LLM → acción
```
Entonces un prompt malicioso o una alucinación del modelo puede:
- Cancelar 40 productos de la mesa equivocada
- Aplicar un descuento de 90% por error
- Mandar 800 WhatsApps a clientes
- Filtrar datos de otro tenant (ver `multi-tenant-isolation.md`)

## La solución: 4 capas separadas

```
┌─────────────────────────────────────────────────┐
│ 1. LLM Planner (probabilístico)                 │
│    → propone: "cancel_item(order=X, item=Y)"    │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 2. Policy Engine (determinístico, NO LLM)       │
│    → valida permisos, contexto, riesgo          │
│    → aprueba o rechaza con razón                │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 3. Domain Service (determinístico, puro)        │
│    → ejecuta lógica de negocio                  │
│    → idempotente, testeable, reversible         │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 4. Evaluator (cierra el loop)                   │
│    → registra state_before, action, state_after │
│    → mide ΔJ (impacto en función objetivo)      │
└─────────────────────────────────────────────────┘
```

## Qué hace cada capa

### Capa 1: LLM Planner
**Responsabilidad:** entender la intención del usuario y proponer una o más acciones tipadas.

**Input:** texto del usuario + contexto (estado, historial).
**Output:** plan estructurado de acciones.

```ts
interface ActionPlan {
  intent: string
  tools: ToolCall[]
  reasoning: string
}
```

**Importante:** el planner NO ejecuta. Solo propone.

### Capa 2: Policy Engine
**Responsabilidad:** validar que la acción propuesta sea legal, segura y dentro del contexto permitido del usuario.

**Input:** `plan`, `user`, `state`.
**Output:** `approved` | `rejected(reason)`.

Un Policy Engine determinístico puede verificar:

```ts
function validate(plan: ActionPlan, user: User, state: SystemState): Decision {
  // 1. Permisos del rol
  if (!user.role.canPerform(plan.intent)) {
    return reject('role_not_allowed')
  }
  
  // 2. Tenant isolation
  if (plan.tools.some(t => t.params.tenant_id !== user.tenant_id)) {
    return reject('cross_tenant_attempt')
  }
  
  // 3. Límites de monto
  for (const tool of plan.tools) {
    if (tool.name === 'apply_discount' && tool.params.percent > user.role.maxDiscount) {
      return reject('discount_exceeds_role_limit')
    }
  }
  
  // 4. Consistencia con el estado
  if (plan.intent === 'cancel_item') {
    const order = state.orders.find(o => o.id === plan.tools[0].params.order_id)
    if (!order || order.status !== 'OPEN') {
      return reject('order_not_open')
    }
  }
  
  // 5. Idempotencia
  const idempotencyKey = hash(plan)
  if (state.recentActions.has(idempotencyKey)) {
    return reject('duplicate_action_within_window')
  }
  
  // 6. Requiere confirmación humana?
  if (plan.tools[0].risk_level === 'high') {
    return requireConfirmation()
  }
  
  return approve()
}
```

**Este código NO tiene LLM.** Es determinístico, testeable, auditable.

### Capa 3: Domain Service
**Responsabilidad:** ejecutar la lógica de negocio pura, de forma idempotente y reversible.

**Input:** plan aprobado.
**Output:** nuevo estado + resultado.

```ts
interface DomainService {
  execute(plan: ApprovedPlan): Promise<Result>
  rollback(plan: ApprovedPlan): Promise<void>  // si es reversible
  idempotencyKey(plan: ApprovedPlan): string
}
```

**Importante:** los servicios NO toman decisiones. Solo ejecutan lo que ya fue aprobado.

### Capa 4: Evaluator
**Responsabilidad:** cerrar el loop de aprendizaje. Registrar qué pasó y cuánto impacto tuvo.

```ts
interface EvaluatorEvent {
  timestamp: Date
  tenant_id: number
  user_id: number
  state_before: SystemSnapshot
  plan: ActionPlan
  policy_decision: Decision
  state_after: SystemSnapshot
  delta_J: number  // cambio en función objetivo (ventas, margen, etc.)
  observed_outcome: 'success' | 'partial' | 'failure'
}
```

Con suficientes eventos, puedes:
- Medir qué acciones funcionan
- Entrenar un planner mejor
- Detectar acciones que el planner propone pero el policy engine rechaza frecuentemente (= señal de mejorar el planner o relajar reglas)

## Ejemplo completo: cancelar un producto de una orden

### Sin Policy Engine (peligroso)
```ts
// LLM clasifica y ejecuta directo
if (text.includes('cancela')) {
  const orderId = extractOrderId(text)
  const itemId = extractItemId(text)
  await db.query('DELETE FROM order_items WHERE order_id = ? AND id = ?', [orderId, itemId])
}
```

**Problemas:**
- No valida si el user puede cancelar
- No valida si la orden está abierta
- No valida tenant
- Sin log de auditoría
- Sin reversibilidad

### Con Policy Engine
```ts
// Capa 1: Planner
const plan = await planner.propose({
  userMessage: "cancela la coca de la mesa 5",
  state: currentState,
})
// → { intent: 'cancel_order_item', tools: [{ name: 'cancel_order_item', params: { order_id: 1234, item_id: 5678 } }] }

// Capa 2: Policy Engine
const decision = await policy.validate(plan, user, state)
if (decision.rejected) {
  return replyWithReason(decision.reason)
}

// Capa 3: Domain Service
const result = await cancelOrderItemService.execute(plan)

// Capa 4: Evaluator
await evaluator.record({
  plan,
  decision,
  result,
  state_before,
  state_after,
  delta_J: computeImpact(state_before, state_after),
})
```

## Riesgo por tool (metadata)

Cada tool se registra con un `risk_level`:

```ts
const tools = {
  late_arrivals_report: { risk: 'low', reversible: true, mutates: false },
  sales_report: { risk: 'low', reversible: true, mutates: false },
  apply_discount: { risk: 'high', reversible: true, mutates: true, requires_auth_code: 'manager' },
  cancel_order: { risk: 'high', reversible: true, mutates: true, requires_confirmation: true },
  close_shift: { risk: 'critical', reversible: false, mutates: true, requires_auth_code: 'owner' },
}
```

El Policy Engine lee este metadata y aplica reglas automáticas según el nivel de riesgo.

## Ventajas del patrón

1. **Auditoría completa.** Cada decisión del policy engine queda registrada con razón.
2. **Testeable.** El policy engine se testea sin LLM (tests unitarios normales).
3. **LLM puede alucinar sin consecuencias.** Si propone algo absurdo, el policy lo rechaza.
4. **Compliance-friendly.** Puedes demostrar a un auditor exactamente qué regla aplicó cuándo.
5. **Evolución independiente.** Puedes cambiar el planner (LLM) sin tocar el policy engine, y viceversa.
6. **Permite aprendizaje.** El evaluator construye el dataset necesario para mejorar.

## Anti-patterns

- ❌ **Policy Engine que usa LLM.** Si la capa de control depende del LLM, no es determinística. No sirve.
- ❌ **Planner que ejecuta.** Si el LLM tiene acceso directo a la base de datos, no hay control.
- ❌ **Domain Service con lógica de permisos.** Los permisos son responsabilidad del Policy Engine, no del servicio.
- ❌ **Evaluator opcional.** Si no cierras el loop de medición, no puedes aprender.

## Cuándo NO usar este patrón

- **Agentes solo de lectura** (ej: un chatbot que solo responde preguntas sobre documentación). No necesitas policy engine porque no hay nada que proteger.
- **Prototipos rápidos**. Overkill para un MVP. Pero en cuanto empieces a tocar dinero real, cambias.

## Aplicación a GrowthSuite

Ver `~/proyectos/growthsuite/CLAUDE.md` sección "POS Bot v2 Blueprint" y `knowledge/decisions/2026-04-06-strangler-fig-approach.md`.
