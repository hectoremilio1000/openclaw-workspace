# Pattern: Strangler Fig Migration

> **Cuándo usar:** refactorizar sistemas en producción sin downtime, sin regresiones masivas, sin "big bang" rewrite.

## Origen
Martin Fowler (2004). Inspirado en la higuera estranguladora que crece alrededor de un árbol viejo hasta reemplazarlo completamente, sin matarlo de golpe.

## Por qué existe este pattern
El 70% de los rewrites grandes fracasan (Joel Spolsky, *"Things You Should Never Do, Part I"*). Las 3 razones principales:
1. Perder conocimiento implícito del sistema viejo (casos borde aprendidos a las malas)
2. Imposibilidad de detener producción mientras se construye el nuevo
3. Fecha de entrega de un "rewrite completo" siempre se resbala

## Las 5 reglas no-negociables

### Regla 1: Feature flags > redeploy
Si para revertir un cambio necesitas un deploy, **no es Strangler Fig**. El rollback debe ser:
```sql
UPDATE feature_flags SET value = false WHERE key = 'new_system_for_tenant_40';
```
Inmediato. Sin restart. Sin deploy.

### Regla 2: Shadow mode > A/B mode
En shadow mode, el código nuevo corre **pero su output no llega al usuario**. Solo se loguea para comparar.

```ts
async function handleRequest(req) {
  const oldResponse = await oldSystem.handle(req)
  
  if (SHADOW_MODE_ENABLED) {
    runInBackground(async () => {
      const newResponse = await newSystem.handle(req)
      await logComparison(req, oldResponse, newResponse)
    })
  }
  
  return oldResponse  // usuario siempre recibe el viejo
}
```

**Activas para un caso solo cuando:** newResponse coincide con oldResponse en ≥95% de los casos durante ≥7 días.

### Regla 3: Migra por slice más pequeño posible
No migres por dominio. Migra por **acción individual**.

- ❌ "Esta semana migro el módulo de Operations"
- ✅ "Esta semana migro `late_arrivals_report`. Si funciona 7 días, la próxima migro `xcut_report`."

Cada migración es un experimento controlado. Si falla, afecta a 1 acción en 1 tenant.

### Regla 4: Migra de menor a mayor riesgo
Orden obligatorio:
1. Read-only (reports, queries)
2. Suggests-only (propone pero no ejecuta)
3. Creates-not-sends (crea draft pero no emite)
4. Money/state mutations (último)

Por qué: si los primeros fallan, solo ves datos mal. Si los últimos fallan, pierdes dinero o corrompes estado.

### Regla 5: Sunset del viejo SOLO después de estabilidad prolongada
Reglas concretas:
- 100% del tráfico en el nuevo sistema
- 30+ días sin incidentes
- **Entonces** marcas el viejo como deprecated
- 2 semanas más sin tocar
- **Entonces** borras el viejo

## La arquitectura del router

```
┌─────────────────────────────────┐
│  TODOS LOS REQUESTS             │
│           ↓                      │
│       Router                     │
│      ↙       ↘                   │
│  old_system  new_system          │
└─────────────────────────────────┘
```

El router decide basado en:
1. Feature flag global (`new_system_enabled`)
2. Feature flag por tenant (`new_system_for_tenant_40`)
3. Feature flag por acción (`new_system_action_late_arrivals_report`)

```ts
function route(req) {
  const useNew = 
    isFlagEnabled('new_system_enabled') &&
    isFlagEnabled(`new_system_for_tenant_${req.tenant_id}`) &&
    isFlagEnabled(`new_system_action_${req.intent}`)
  
  return useNew ? newSystem.handle(req) : oldSystem.handle(req)
}
```

## Infraestructura mínima necesaria

### 1. Feature flags table
```sql
CREATE TABLE feature_flags (
  key VARCHAR PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP
);
```

### 2. Flag cache con TTL
```ts
// Cache 30s para no pegarle a la DB en cada request
const flagCache = new LRU({ ttl: 30_000 })
async function isFlagEnabled(key: string, ctx?: object): Promise<boolean> {
  const cached = flagCache.get(key)
  if (cached !== undefined) return cached
  const value = await db.query('SELECT value FROM feature_flags WHERE key = ?', [key])
  flagCache.set(key, value)
  return value
}
```

### 3. Shadow comparisons table
```sql
CREATE TABLE shadow_comparisons (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id INT,
  input JSONB,
  old_response JSONB,
  new_response JSONB,
  match_score FLOAT,  -- 0..1
  latency_old_ms INT,
  latency_new_ms INT,
  error_old TEXT,
  error_new TEXT
);
```

### 4. Dashboard de comparación
```sql
-- % de coincidencia por acción en los últimos 7 días
SELECT 
  input->>'intent' as intent,
  AVG(match_score) as match_rate,
  AVG(latency_new_ms - latency_old_ms) as latency_delta,
  COUNT(*) as samples
FROM shadow_comparisons
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY intent
ORDER BY match_rate ASC;
```

## El costo honesto

**Costo real:** mantener 2 codebases en paralelo durante 4-6 meses.
- Bugs del sistema viejo se arreglan ahí (no en el nuevo) hasta que esa acción esté migrada
- Tests duplicados temporalmente
- Más superficie de code review

**Lo que NO cuesta:** velocidad de entrega. Cada migración es una mejora incremental visible.

## Tabla de protección

| Escenario | Sin Strangler Fig | Con Strangler Fig |
|-----------|------------------|-------------------|
| Bug en acción nueva | Todos los usuarios afectados | Solo tenant X, rollback en 1 segundo |
| Latencia nueva más alta | Todos sufren | Comparas en shadow, no migras hasta arreglar |
| Edge case no contemplado | Se descubre en prod | Se ve en shadow logs antes de activar |
| Rollback necesario | Revert + redeploy | `UPDATE feature_flag` |
| Regresión silenciosa | Difícil detectar | Aparece en el match_score de shadow |

## Anti-patterns (qué NO hacer)

- ❌ **Mezclar shadow y live en el mismo deploy.** Primero 7 días shadow, después activas.
- ❌ **Activar para todos los tenants a la vez.** Siempre 1 tenant primero.
- ❌ **Migrar varias acciones en el mismo PR.** Una acción por PR, sin excepciones.
- ❌ **"Esta acción es simple, no necesita shadow mode".** TODAS pasan por shadow mode.
- ❌ **Borrar el código viejo antes de 30+ días estable.** Lo borras cuando ya nadie se acuerda que existía.

## Cuando termina

El proceso termina cuando:
1. 100% del tráfico va al sistema nuevo
2. 30+ días sin un solo rollback
3. Código viejo marcado deprecated
4. 2 semanas más de observación
5. Código viejo se borra en 1 commit
6. Código nuevo se renombra a ocupar el lugar del viejo

## Referencia aplicada a nuestro caso

Ver `knowledge/decisions/2026-04-06-bot-track-1-sprint.md` y `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md` para la aplicación concreta al bot de GrowthSuite.
