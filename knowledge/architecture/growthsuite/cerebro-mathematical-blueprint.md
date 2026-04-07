# Cerebro GrowthSuite — Mathematical Blueprint

> **Propósito:** Formalizar matemáticamente qué es GrowthSuite hoy, qué quiere ser, y cuál es la brecha. Este documento está escrito para que ChatGPT (u otro modelo de razonamiento) lo estudie y proponga el plan matemático completo.
>
> **Audiencia:** Héctor + agentes externos (ChatGPT, Codex, Claude) para revisión crítica.
> **Idioma:** Notación en inglés/matemático estándar; prosa en español.
> **Versión:** v0.1 — 2026-04-06
> **Estado:** Borrador para revisión. Las secciones marcadas con 🟡 tienen preguntas abiertas explícitas.

---

## 0. Cómo leer este documento

Este blueprint está organizado en **3 partes**:

1. **Estado actual del sistema** (`S0`) — qué hay hoy, instanciado con números reales de la base de datos
2. **Estado objetivo** (`S*`) — qué queremos construir, formalizado
3. **Brecha** (`Δ = S* − S0`) — qué falta y cómo cerrarlo

Cada sección sigue la convención:
- **Definición formal** (notación matemática)
- **Instanciación con datos reales** (números actuales de prod)
- **Limitaciones / supuestos** (lo que NO se puede aún)
- **Preguntas abiertas para ChatGPT** (marcadas con 🟡)

---

## 1. Glosario de notación

| Símbolo | Significado | Tipo |
|---------|-------------|------|
| `r ∈ R` | Restaurante específico, `R` = conjunto de tenants | Discreto |
| `t ∈ T` | Tiempo continuo (tick = 1 hora o menos) | Continuo |
| `s_t ∈ S` | Estado del restaurante en tiempo `t` | Vector multidim |
| `a_t ∈ A` | Acción tomada (humana o agente) en `t` | Discreto/estructurado |
| `J(t)` | Función objetivo del negocio (monetaria, escalar) | ℝ |
| `J*` | Función objetivo a maximizar a horizonte H | ℝ |
| `π(s) → a` | Política: dado un estado, qué acción tomar | Función |
| `π*` | Política óptima | argmax E[J] |
| `Γ(a, s, u)` | Restricción de policy engine: ¿está permitida la acción? | {0, 1} |
| `T(s, a) → s'` | Función de transición de estado | Estocástica |
| `R(s, a, s')` | Reward inmediato | ℝ |
| `O(s) → o` | Función de observación (qué del estado es visible) | Parcial |
| `b_t` | Bottleneck identificado en tiempo `t` | Categórico |
| `E_{≤t}` | Historial de eventos hasta `t` | Lista ordenada |
| `φ(E)` | Función que extrae estado canónico desde eventos | Reducer |
| `D` | Dataset de tuplas `(s, a, s', r)` para aprendizaje | Conjunto |
| `H` | Horizonte de planeación (en días) | ℕ |
| `γ` | Factor de descuento | ∈ (0,1] |

---

# PARTE 1 — Estado actual `S0` (formal)

## 1.1 Función objetivo del negocio `J(t)`

### Definición

```
J(r, t) = Revenue(r, t)
        + Margin(r, t)
        − Waste(r, t)
        − Leakage(r, t)
        − Friction(r, t)
```

donde:
- **Revenue(r, t)**: ingreso total en período `t` para restaurante `r`
- **Margin(r, t)**: margen bruto = Revenue − COGS (Cost of Goods Sold)
- **Waste(r, t)**: merma física (insumo comprado − insumo vendido − inventario final)
- **Leakage(r, t)**: fuga = ventas no facturadas, voids sospechosos, descuentos no autorizados, fraude interno
- **Friction(r, t)**: tiempo/costo operativo desperdiciado (cocina lenta, mesero ineficiente, errores)

### 🔴 Problema crítico: solo Revenue es directamente observable hoy

| Componente | Observabilidad actual | Por qué |
|-----------|----------------------|---------|
| Revenue(r,t) | ✅ Directa | `SUM(payments.amount)` por restaurante por período |
| Margin(r,t) | 🟡 Aproximable | Faltan precios de insumos actualizados; recetas existen (302 recetas, 672 líneas) pero incompletas |
| Waste(r,t) | ❌ No observable | Solo 7 stock counts en producción → inventario físico vs sistema está ciego |
| Leakage(r,t) | 🟡 Parcial | Tenemos `voided_at`, `cancel_reason` en orders, pero sin categorización ni baseline de "voids esperados" |
| Friction(r,t) | 🟡 Parcial | Tenemos `prepared_at` en order_items pero no se usa para nada |

### Instanciación con datos reales (snapshot 2026-04-05)

| Restaurante | Orders totales | Pagos totales (MXN) | Ticket promedio |
|------------|---------------|---------------------|-----------------|
| r40 (Fogo Santa Fe) | 123,000 | ~$155M | ~$1,260 |
| r5 | 101,000 | ~$120M (est) | ~$1,188 |
| r13 (La Llorona) | 100,000 | ~$130M (est) | ~$1,300 |
| r7 (Café de Tacuba) | 15,000 | ~$15M (est) | ~$1,000 |

**Total agregado:** 341,425 órdenes, 470,693 pagos, ~$493M MXN, datos desde 2017.

### Observación matemática clave 🟡

Hoy `J(r,t)` **no es computable**. Solo `Revenue(r,t)` lo es. Esto significa que **cualquier modelo de optimización del negocio que escribamos hoy tiene que asumir un subset observable** del verdadero `J`.

**Definimos:**
```
J_obs(r, t) = Revenue(r, t) − ProxyVoids(r, t)
```

donde `ProxyVoids(r,t) = Σ orders.cancelled × ticket_promedio` es un proxy débil de Leakage.

**Pregunta para ChatGPT:**
> 🟡 ¿Qué proxies estadísticos son válidos hoy para estimar `Margin`, `Waste`, `Leakage`, `Friction` a partir solamente de `orders`, `order_items`, `payments`, `inventory_movements`, `recipes`? ¿Cuál es la cota inferior de error razonable?

---

## 1.2 Estado del restaurante `s_t`

### Definición canónica deseada

El estado del restaurante en tiempo `t` debería ser un vector que capture **todo lo necesario para tomar decisiones**:

```
s_t = (
  // Operacional
  orders_open_t,          # órdenes abiertas (mesas activas)
  orders_today_t,         # # órdenes del día
  revenue_today_t,        # ventas del día acumuladas
  avg_ticket_t,           # ticket promedio del día
  shift_state_t,          # turno abierto/cerrado, fondo de caja
  
  // Inventario
  stock_levels_t,         # vector de stock actual por SKU
  reorder_alerts_t,       # SKUs por debajo de min
  
  // Personal
  staff_active_t,         # quién está trabajando
  staff_performance_t,    # ventas/mesero, propina/mesero
  
  // Cliente
  customers_present_t,    # # de clientes en el local
  reservations_today_t,   # reservaciones confirmadas hoy
  
  // Histórico relevante
  daily_metrics_t,        # ventas/ticket/items últimos N días
  trends_t,               # diferencial vs semana pasada
  
  // Externo
  weather_t,              # clima local
  events_t,               # eventos cerca (partidos, conciertos)
  
  // Salud del sistema
  bot_errors_t,           # errores recientes del bot
  failed_orders_t         # órdenes que fallaron en cocina/cobro
)
```

### 🔴 Estado actual `s_t^{actual}`

Lo que **realmente** tenemos hoy es mucho más limitado:

```
s_t^{actual} = (
  orders_open_t,          # ✅ via SQL
  orders_today_t,         # ✅
  revenue_today_t,        # ✅
  avg_ticket_t,           # ✅
  shift_state_t,          # ✅ via tabla shifts
  
  stock_levels_t,         # 🟡 solo si hay movements actualizados
  reorder_alerts_t,       # ❌ no hay min/max definidos en producción
  
  staff_active_t,         # ✅ via shifts.user_id
  staff_performance_t,    # 🟡 calculable pero no precalculado
  
  customers_present_t,    # ❌ no se mide
  reservations_today_t,   # ❌ tabla vacía
  
  daily_metrics_t,        # ❌ NO hay tabla materializada
  trends_t,               # ❌ se calcula on-the-fly cada vez (caro)
  
  weather_t,              # ❌ no integrado
  events_t,               # ❌ no integrado
  
  bot_errors_t,           # ❌ no hay event log
  failed_orders_t         # ❌ no se trackea
)
```

### Métrica de "completitud del estado"

Podemos definir la **completitud observable** como:

```
Completeness(s_t) = |observable(s_t)| / |s_t^{deseado}|
```

Hoy, con el conteo arriba: **`Completeness ≈ 7/16 = 43.75%`**

**Implicación matemática:** Cualquier política `π(s_t)` que escribamos hoy opera sobre un estado **fuertemente parcial**. Esto es un problema de **POMDP (Partially Observable Markov Decision Process)**, no de MDP completo.

**Pregunta para ChatGPT:**
> 🟡 ¿Cuál es el umbral mínimo de completitud del estado para que una política basada en LLM + reglas funcione razonablemente? ¿Es suficiente con el ~50% que tenemos hoy, o hay un mínimo viable más alto?

---

## 1.3 Espacio de acciones `A`

### Acciones que el sistema **podría** ejecutar (deseado)

```
A = A_query ∪ A_inform ∪ A_recommend ∪ A_execute_safe ∪ A_execute_risky

A_query        = {"qué vendí hoy", "cuánto inventario hay", "quién es el mejor mesero"}
A_inform       = {"alerta: inventario bajo", "alerta: cancelaciones altas", "alerta: turno sin abrir"}
A_recommend    = {"haz promo el martes", "cambia proveedor de pollo", "86 el ceviche"}
A_execute_safe = {"manda recordatorio reservación", "activa promo programada", "envía corte X al dueño"}
A_execute_risky= {"86 platillo automático", "cancela reservación", "ajusta precio"}
```

### Acciones que el bot **realmente** ejecuta hoy

Hoy la categoría operativa del bot es esencialmente:

```
A^{actual} = A_query (mayormente) ∪ {pequeño subset de A_inform}
```

El bot responde preguntas. Casi no toma acciones. **Es reactivo, no proactivo.**

**Cuantitativamente** (estimado del test suite v2):
- |A_query implementado| ≈ 30-40 intents
- |A_inform implementado| ≈ 5 alertas tipo cron
- |A_recommend implementado| ≈ 0
- |A_execute_safe implementado| ≈ 2 (recordatorios)
- |A_execute_risky implementado| ≈ 0

---

## 1.4 Política actual `π_0`

### Caracterización formal

La política actual del bot es:

```
π_0(o_t) = LLM_classify(o_t) → intent → action_handler[intent](o_t)
```

donde:
- `o_t` es la observación = mensaje del usuario (texto)
- `LLM_classify` = clasificador de intent vía LLM
- `intent ∈ I` con `|I| ≈ 30-40`
- `action_handler[intent]` = función hardcodeada en TypeScript

### Propiedades de `π_0`

| Propiedad | Estado | Implicación |
|----------|--------|-------------|
| **Reactiva** | Sí (solo responde a `o_t`, no inicia) | No optimiza `J(t)` proactivamente |
| **Determinística por intent** | Sí (mismo intent → mismo handler) | Sin razonamiento real |
| **Sin memoria de estado** | Casi (`bot_memory` parcial) | No aprende, no acumula |
| **Sin restricciones formales** | Sí 🔴 | G12 ocurre porque no hay `Γ` |
| **Sin medición de impacto** | Sí 🔴 | No sabe si lo que dice ayuda al negocio |

### Modelo formal del bug G12 (cross-tenant leak)

Lo que pasa hoy en G12:

```
Usuario u con permisos {r=r13}
o_t = "ventas de Fogo de Chão"
π_0(o_t) = LLM_classify("ventas") → action_sales_report
action_sales_report(o_t) = SQL("WHERE name LIKE '%Fogo%'") → datos de r40
respuesta = formato(datos de r40)
```

**El bug formal:** la política `π_0` no aplica restricciones por tenant. Lo correcto sería:

```
π_safe(o_t, u) = π_0(o_t) si Γ(action, s_t, u) = 1, else "no autorizado"
Γ(action, s_t, u) = 1 ⇔ scope(action) ⊆ permissions(u)
```

**Donde está el problema en código:** el `scope(action)` se determina dentro del SQL del action handler, no en una capa anterior. **No hay un policy engine que valide ANTES de ejecutar.**

---

## 1.5 Función de transición `T`

### Estado actual

Hoy **no existe** una función de transición explícita. El sistema no piensa en términos de "estado actual → acción → estado siguiente". Cada interacción del bot es independiente.

```
T_actual(s_t, a_t) = s_t   // las acciones del bot NO modifican el estado del restaurante
```

Esto significa que `(s_t, a_t, s_{t+1})` no se registra → **no hay dataset para aprendizaje**.

**Pregunta para ChatGPT:**
> 🟡 ¿Cuál es el mínimo viable de telemetría para empezar a registrar tuplas `(s_t, a_t, s_{t+1}, ΔJ)` que permitan después aprender una política mejor? ¿Necesitamos event sourcing completo, o basta con un log de "antes/después" por acción?

---

## 1.6 Resumen de `S0`

```
S0 = (
  J_obs:    Revenue parcialmente observable, Margin/Waste/Leakage/Friction casi ciegos,
  s_t:      ~44% del estado canónico observable,
  A:        ~80% queries, ~20% acciones simples, casi 0 razonamiento,
  π_0:      reactiva, determinística por intent, sin Γ formal,
  T:        no existe (no hay event log de transiciones),
  D:        prácticamente vacío (no hay tuplas (s, a, s', r))
)
```

**Diagnóstico formal:** GrowthSuite hoy es un sistema de **respuesta a queries con clasificación basada en LLM**, no un sistema de control. No optimiza ninguna función objetivo explícita. No tiene loop de feedback. No mide su propio impacto.

---

# PARTE 2 — Estado objetivo `S*` (formal)

## 2.1 Función objetivo formal

### Definición del problema de optimización

```
Maximize:    J*(r) = Σ_{t=0}^{H} γ^t · J(r, t)
Subject to:  s_{t+1} = T(s_t, a_t)
             a_t = π(s_t)
             Γ(a_t, s_t, u) = 1                   // policy/safety constraints
             π(s_t) ∈ A_approved(s_t, u)          // solo acciones permitidas
```

donde:
- `H` = horizonte (típicamente 30 días)
- `γ` = factor de descuento (sugerido: γ = 0.95 a nivel diario)

### Política óptima

```
π*(s) = argmax_{a ∈ A_approved(s, u)}  E[ J*(r) | s_t = s, a_t = a ]
```

Esto es **optimal control** o **Reinforcement Learning** en su forma más general.

### Versión práctica (con la realidad de `S0`)

Como `T` no existe y `J` solo es parcialmente observable, la versión "honesta" del objetivo es:

```
π_practical(s) = argmax_{a ∈ A_approved(s, u)}  Score(a | s)

Score(a | s) = E[Δ J_obs(r, t+δ) | s, a]   ← lo que esperamos mejorar
             − Cost(a)                       ← lo que cuesta ejecutar
             − Risk(a) · Severity(a)         ← prob fallo · costo del fallo
```

Esta es la formulación que **sí podemos implementar incrementalmente**.

---

## 2.2 Las 5 capas como composición de funciones

La visión que tenemos del cerebro se puede formalizar como una **pipeline composicional**:

```
π* = O ∘ G ∘ D ∘ M ∘ φ
```

donde:

| Símbolo | Nombre | Tipo | Qué hace |
|---------|--------|------|----------|
| `φ` | Sensors | `E_{≤t} → s_t` | Reduce eventos a estado canónico |
| `M` | Memory/Context | `s_t → c_t` | Enriquece estado con histórico, embeddings, perfil |
| `D` | Diagnose | `c_t → b_t` | Detecta bottleneck (qué está mal hoy) |
| `G` | Generate | `b_t → A_candidate` | Genera acciones candidatas |
| `O` | Optimize | `(A_candidate, s_t, u) → a_t*` | Selecciona la mejor acción permitida |

### Cada capa formalmente

#### Capa 1 — Sensors `φ`

```
φ: E_{≤t} → s_t
φ(E_{≤t}) = reducer(E_{≤t}, s_0)
```

**Implementación práctica:** event sourcing lite con tabla `restaurant_events` y proyecciones materializadas en `daily_restaurant_metrics`.

#### Capa 2 — Memory/Context `M`

```
M: s_t → c_t = (s_t, history_t, embeddings_t, user_profile_t)
```

**Implementación práctica:** vector store (pgvector) + RAG sobre `bot_conversations` + `daily_metrics` históricos.

#### Capa 3 — Diagnose `D`

```
D: c_t → b_t ∈ B
B = {revenue_drop, cost_spike, waste_high, churn_risk, ops_friction, ...}
```

`D` puede ser:
- **Reglas duras** (z-score, umbral): `b_t = "revenue_drop" si Revenue(t) < μ_{30d} − 2σ`
- **LLM diagnoser** con tools: el LLM consulta métricas y elige `b_t`
- **Modelo ML** entrenado (Fase 3)

#### Capa 4 — Generate `G`

```
G: b_t → A_candidate ⊂ A
```

Mapa bottleneck → acciones candidatas. Implementación inicial: tabla `playbook[bottleneck] → [actions]` curada por el equipo de producto.

#### Capa 5 — Optimize `O`

```
O: (A_candidate, s_t, u) → a_t*
a_t* = argmax_{a ∈ A_candidate ∩ A_approved(s_t, u)}  Score(a | s_t)
```

Donde `A_approved` aplica el **policy engine**:

```
A_approved(s_t, u) = { a ∈ A : Γ(a, s_t, u) = 1 }
Γ(a, s, u) = ∏_i constraint_i(a, s, u)      // todas las restricciones deben pasar
```

---

## 2.3 Policy Engine formal

### Definición

```
Γ: A × S × U → {0, 1}
Γ(a, s, u) = 1 ⇔ ∀ c ∈ Constraints: c(a, s, u) = 1
```

### Tipos de restricciones

```
Constraints = {
  c_tenant:      scope(a) ⊆ permissions(u),                          // multi-tenant
  c_role:        required_role(a) ⊆ roles(u),                        // RBAC
  c_business:    business_rule(a, s) = 1,                            // ej. no cancelar turno con orders abiertas
  c_temporal:    time(a) ∈ allowed_window(a),                        // ej. promo solo en horario
  c_safety:      severity(a) ≤ threshold(u),                         // ej. solo humano puede 86
  c_rate_limit:  count(a, last_window) ≤ max(a),                     // anti-spam
  c_quorum:      a ∈ A_risky ⇒ approved_by ≥ 1,                      // doble check
}
```

**Insight clave:** el policy engine es una capa **separada del LLM**. El LLM propone, el engine decide si se ejecuta. Esto es **defensa en profundidad** contra alucinaciones.

### Por qué G12 ocurre matemáticamente

G12 ocurre porque `c_tenant` no existe como restricción explícita previa a la ejecución de la acción. Está implícita en el SQL del handler, lo cual es un **single point of failure**.

**Fix matemático:**
```
ANTES:  bot_response = handler[intent](o_t)        // SQL con o sin tenant filter
DESPUÉS: a = handler[intent](o_t)
         if Γ(a, s_t, u) = 1: ejecutar(a)
         else: rechazar(a, razón)
```

---

## 2.4 Loop de aprendizaje

### Dataset que se construye con cada interacción

```
D = { (s_t, a_t, s_{t+1}, r_t) }_{t=1}^{N}

donde:
  r_t = ΔJ_obs(t, t+δ) − Cost(a_t) − Risk_realized(a_t)
```

### Métricas de aprendizaje

**Online (durante operación):**
```
EmpiricalScore(a | s, ctx) = E_{(s', a, s'', r) ∈ D, similar(s, s')}[r]
```

Es decir: "para acciones similares en estados similares, qué reward observamos."

**Offline (revisión periódica):**
```
PolicyEvaluation(π) = E_{s ∼ D}[ J(s, π(s)) ]
```

### Curva esperada de mejora

```
Score_{t+Δ}(π) = Score_t(π) · (1 + α · log(|D| + 1))
```

donde `α` es la "tasa de aprendizaje" del sistema. Empíricamente para sistemas LLM+rules tipo Toast/Square, `α ≈ 0.05-0.1` por mes con datos consistentes.

**Pregunta para ChatGPT:**
> 🟡 ¿Cuál es el `|D|` mínimo (cantidad de tuplas (s,a,s',r)) para empezar a hacer offline policy evaluation razonable? ¿Hay alternativas estadísticas más eficientes en datos para validar la política antes de tener miles de muestras?

---

## 2.5 Modelo de incertidumbre

### Por qué importa

Como `J` solo es parcialmente observable, **toda decisión del cerebro tiene incertidumbre**. Necesitamos modelarla, no ignorarla.

### Formalización

Para cada acción `a` propuesta, queremos:

```
Score(a | s) ± σ(a | s)
```

donde `σ(a | s)` es la incertidumbre estimada (de los datos, del modelo, del contexto).

**Política bajo incertidumbre (CVaR-aware):**

```
a* = argmax_{a}  Score(a | s) − λ · σ(a | s)
```

con `λ ≥ 0` el "factor de aversión al riesgo". Para acciones de alto impacto (ej. cambiar precio de un platillo), `λ` debería ser alto.

**Conexión con el policy engine:**
```
Γ_uncertainty(a, s) = 1 ⇔ σ(a | s) ≤ σ_max(a)
```

Es decir: si la incertidumbre supera un umbral por tipo de acción, la acción no se ejecuta automáticamente — se escala a humano.

---

# PARTE 3 — La brecha `Δ = S* − S0` y cómo cerrarla

## 3.1 Brechas matemáticas concretas

| # | Brecha | Hoy `S0` | Objetivo `S*` | Métrica de progreso |
|---|--------|---------|---------------|---------------------|
| 1 | **`J` observable** | ~20% (solo Revenue) | ≥80% (Revenue, Margin, Leakage, partial Waste) | `Completeness(J) = |observable| / |componentes|` |
| 2 | **`s_t` observable** | ~44% | ≥85% | `Completeness(s_t)` arriba definido |
| 3 | **`A` ejecutable** | ~10% (queries casi solamente) | ≥60% (queries + recommend + execute_safe) | `|A_implemented| / |A_target|` |
| 4 | **`Γ` formal** | 0% (implícito en handlers) | 100% (todas acciones validadas) | % acciones validadas por policy engine |
| 5 | **`T` registrado** | 0% (no event log) | ≥90% (todas acciones del bot loggeadas con before/after) | % acciones con tupla `(s, a, s', r)` |
| 6 | **`D` (dataset)** | <100 conversaciones útiles | ≥10,000 tuplas con reward | `|D|` |
| 7 | **`σ` (incertidumbre)** | No modelada | Modelada por tipo de acción | % acciones con `σ` estimada |

---

## 3.2 Variables que necesitamos empezar a medir HOY

### Variables observables que aún no aprovechamos

| Variable | Tabla actual | Falta para ser útil |
|---------|--------------|---------------------|
| `prepared_at` (item) | `order_items.prepared_at` | Calcular prep time, agregar a `daily_metrics` |
| `cancel_reason` | `orders.cancel_reason` | Categorizar (no_supply, customer_unhappy, payment, error) |
| `void_at` | `order_items.voided_at` | Asociar a usuario, tipificar |
| `phone` | `orders.delivery_customer_phone` + `bot_conversations.phone` | Cruzar para llenar `customers` |

### Variables nuevas que hay que empezar a capturar

| Variable | Cómo capturar | Beneficio |
|---------|---------------|-----------|
| `clima_diario(r, t)` | Cron diario → wttr.in | Correlación con ventas |
| `eventos_locales(r, t)` | Google Calendar API o tabla manual | Ajuste de demanda |
| `bot_event(t, type, payload)` | Tabla nueva `bot_events` (ya en Track 1 #9) | Observabilidad del bot |
| `policy_decision(t, action, allowed, reason)` | Tabla nueva `policy_decisions` | Auditoría del Γ |
| `customer_feedback(visit_id, score, text)` | WhatsApp post-visita automático | Signal de calidad real |

---

## 3.3 Datasets que necesitamos construir

### Dataset 1: `daily_restaurant_metrics`

```sql
CREATE MATERIALIZED VIEW daily_restaurant_metrics AS
SELECT
  o.restaurant_id,
  date_trunc('day', o.opened_at) AS day,
  COUNT(*) AS orders_count,
  SUM(o.total) AS revenue,
  AVG(o.total) AS avg_ticket,
  SUM(CASE WHEN o.cancel_at IS NOT NULL THEN 1 ELSE 0 END) AS cancelled_count,
  SUM(CASE WHEN o.cancel_at IS NOT NULL THEN o.total ELSE 0 END) AS cancelled_value,
  ...
FROM orders o
GROUP BY o.restaurant_id, date_trunc('day', o.opened_at);
```

**Para qué sirve:** insumo de Capa 1 (`φ`). Hace que `s_t` sea calculable en milisegundos en lugar de segundos.

### Dataset 2: `bot_events`

```sql
CREATE TABLE bot_events (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL,
  user_phone TEXT,
  event_type TEXT NOT NULL,    -- 'message_in', 'intent_classified', 'tool_called', 'response_sent', 'policy_blocked'
  event_at TIMESTAMP NOT NULL DEFAULT now(),
  payload JSONB,
  trace_id TEXT,                -- para correlacionar todos los eventos de un turn
  ...
);
```

**Para qué sirve:** insumo de Capa 5 (registro de `(s_t, a_t)`). Ya está priorizado como Track 1 #9.

### Dataset 3: `customers` poblada

```sql
INSERT INTO customers (phone, name, first_seen_at, last_seen_at, visit_count, total_spent, restaurant_id)
SELECT
  phone,
  MAX(name) FILTER (WHERE name IS NOT NULL),
  MIN(opened_at),
  MAX(opened_at),
  COUNT(DISTINCT id),
  SUM(total),
  restaurant_id
FROM orders
WHERE delivery_customer_phone IS NOT NULL
GROUP BY phone, restaurant_id;
```

**Para qué sirve:** habilita análisis RFM, churn, segmentación, retention. Es el **insumo #1** que falta.

---

## 3.4 Plan de cierre de brecha en 4 fases

### Fase 0 — Observabilidad mínima (semanas 1-3) [Track 1 actual]

**Brechas que cierra:** #5 (T parcial), #4 (Γ inicio)

**Entregables:**
- Tabla `bot_events` (Track 1 #9)
- Policy engine MVP que aplica `c_tenant` y `c_role` (resuelve G12 → Track 1 #1)
- Tabla `policy_decisions` para auditoría
- Materialized view `daily_restaurant_metrics`

**Métrica de éxito:**
- `% acciones bot loggeadas en bot_events ≥ 95%`
- `% acciones validadas por Γ ≥ 100%`
- G12 cerrado (test Cat G pasa)

### Fase 1 — Estado canónico (mes 1-2)

**Brechas que cierra:** #1 (J observable parcial), #2 (s_t)

**Entregables:**
- Función `φ(E_{≤t}) → s_t` implementada como query optimizada
- `customers` poblada vía cron diario
- `J_obs(r, t)` calculable con Revenue + ProxyVoids + ProxyMargin (basado en recetas existentes)

**Métrica de éxito:**
- `Completeness(s_t) ≥ 70%`
- `Completeness(J) ≥ 50%`
- `customers count > 5000` (cruzando órdenes históricas)

### Fase 2 — Razonamiento determinístico (mes 2-4)

**Brechas que cierra:** #3 (A), #7 (σ)

**Entregables:**
- Tool registry tipado (cada tool con metadata: scope, severity, σ esperada)
- Capa `D` (Diagnose) basada en reglas + LLM
- Capa `G` (Generate) con playbooks por bottleneck
- Capa `O` (Optimize) con `Score(a|s) − λσ(a|s)`

**Métrica de éxito:**
- `|A_implemented| ≥ 25` tools
- `|A_recommend| ≥ 10` recomendaciones distintas
- `|A_execute_safe| ≥ 5` acciones seguras automatizadas

### Fase 3 — Loop de aprendizaje (mes 4-8)

**Brechas que cierra:** #6 (D dataset), refinamiento de #1 y #7

**Entregables:**
- Pipeline para construir `D = {(s_t, a_t, s_{t+1}, r_t)}` desde `bot_events`
- Evaluator: cada semana corre offline policy evaluation
- Adjustment loop: actualizar pesos del playbook según `EmpiricalScore`

**Métrica de éxito:**
- `|D| ≥ 5,000` tuplas por mes a través de todos los restaurantes
- `EmpiricalScore` mejora demostrable mes a mes
- Detecta automáticamente acciones del playbook con bajo impacto

---

## 3.5 Mapping concepto matemático ↔ código real

| Concepto | Archivo / tabla actual | Acción requerida |
|---------|------------------------|------------------|
| `J(r,t)` | Cálculos ad-hoc en SQL | Definir como vista `restaurant_objective_daily` |
| `s_t` | Distribuido en 9 microservicios | Implementar `φ` como service en `pos_bot_api` o nuevo `pos_brain_api` |
| `a_t` | Hardcoded en handlers de `pos_bot_api` | Centralizar en `tool_registry` con metadata |
| `π_0` | `pos_bot_api/app/services/intent_classifier.ts` | Refactor con tool-calling de LLM (Track 1 #7) |
| `Γ` | No existe | Crear `pos_bot_api/app/policy_engine/` (Track 1 #1) |
| `T` registrada | No existe | Crear tabla `bot_events` + middleware (Track 1 #9) |
| `D` (dataset) | No existe | Crear pipeline ETL desde `bot_events` |
| `R(s,a,s')` | No existe | Definir esquema de reward por tipo de acción |

---

## 3.6 Métricas globales del proyecto en términos matemáticos

Para monitorear el progreso del cerebro como un todo:

```
Maturity(t) = 0.20 · Completeness(J)
            + 0.20 · Completeness(s_t)
            + 0.15 · |A_implemented| / |A_target|
            + 0.15 · % acciones validadas por Γ
            + 0.10 · % acciones loggeadas en bot_events
            + 0.10 · log(|D| + 1) / log(|D_target| + 1)
            + 0.10 · % acciones con σ modelada
```

**Lectura:**
- `Maturity(t) < 0.30`: sistema inmaduro, principalmente reactivo
- `Maturity(t) ∈ [0.30, 0.60]`: en transición, capas básicas instaladas
- `Maturity(t) ∈ [0.60, 0.85]`: cerebro funcional con datos
- `Maturity(t) > 0.85`: cerebro autónomo con loop de aprendizaje

**Hoy estimado:** `Maturity ≈ 0.18`. Track 1 lo lleva a `~0.35`.

---

## 4. Preguntas abiertas para ChatGPT (consolidadas)

> Pásale este documento a ChatGPT (o a O4/o5/Claude Opus) y pídele que responda específicamente estas preguntas:

### 🟡 Q1 — Sobre proxies de J
¿Qué proxies estadísticos son válidos hoy para estimar `Margin`, `Waste`, `Leakage`, `Friction` a partir solamente de `orders`, `order_items`, `payments`, `inventory_movements`, `recipes`? ¿Cuál es la cota inferior de error razonable?

### 🟡 Q2 — Sobre completitud del estado
¿Cuál es el umbral mínimo de completitud del estado `s_t` para que una política basada en LLM + reglas funcione razonablemente? ¿Es suficiente con el ~50% que tenemos hoy, o hay un mínimo viable más alto?

### 🟡 Q3 — Sobre telemetría mínima
¿Cuál es el mínimo viable de telemetría para empezar a registrar tuplas `(s_t, a_t, s_{t+1}, ΔJ)` que permitan después aprender una política mejor? ¿Necesitamos event sourcing completo, o basta con un log de "antes/después" por acción?

### 🟡 Q4 — Sobre tamaño de dataset para evaluación
¿Cuál es el `|D|` mínimo (cantidad de tuplas (s,a,s',r)) para empezar a hacer offline policy evaluation razonable? ¿Hay alternativas estadísticas más eficientes en datos para validar la política antes de tener miles de muestras?

### 🟡 Q5 — Sobre POMDP vs heurísticas
Dado que el sistema es claramente un POMDP (estado parcialmente observable), ¿conviene formalizarlo como tal y usar técnicas de POMDP solving (point-based VI, QMDP, deep Q POMDP), o es más realista quedarnos en heurísticas LLM + reglas con bandits contextuales por acción?

### 🟡 Q6 — Sobre incertidumbre
¿Cuál es la mejor forma de modelar `σ(a | s)` en la práctica cuando `s` es de baja dimensionalidad pero rico en contexto textual? ¿Conformal prediction sobre el LLM? ¿Bootstrap sobre métricas históricas? ¿Algo más simple?

### 🟡 Q7 — Sobre función de reward
¿Cómo definir `R(s, a, s')` cuando las acciones tienen efectos retardados (ej. una promo el martes afecta el viernes)? ¿Convolución de impacto sobre ventana? ¿Asignación de crédito tipo TD-learning?

### 🟡 Q8 — Sobre la migración del bot v1 → v2
Dado que el bot v1 es monolítico y reactivo, y el v2 es composicional y proactivo, ¿conviene seguir Strangler Fig (Track 1) reemplazando intent por intent, o vale más la pena pausar el v1 y construir v2 paralelo? ¿Qué decisiones de continuidad técnica recomienda?

### 🟡 Q9 — Sobre el modelo de datos de `customers`
Dado que `customers` está vacío hoy y los teléfonos están en `orders.delivery_customer_phone` y `bot_conversations.phone`, ¿cuál es el approach correcto para deduplicar identidades cuando una persona puede aparecer con teléfonos distintos (extraviado el celular, número de marido, etc.)? ¿Probabilistic matching tipo Splink?

### 🟡 Q10 — Sobre las prioridades absolutas
Si tuvieras que ordenar las 7 brechas (#1-#7 en sección 3.1) por importancia para que el cerebro empiece a funcionar, ¿en qué orden las atacarías? ¿Por qué? ¿Hay dependencias estrictas entre ellas?

---

## 5. Anexos

### Anexo A — Referencias a notas existentes

- [`notas/00 - Mapa de Vision.md`](../../../notas/00%20-%20Mapa%20de%20Vision.md) — visión completa del producto
- [`notas/Cerebro Tecnico - LLM vs Deep Learning vs Hibrido.md`](../../../notas/Cerebro%20Tecnico%20-%20LLM%20vs%20Deep%20Learning%20vs%20Hibrido.md) — opciones de implementación
- [`notas/Cerebro del Restaurante - Daily Briefing.md`](../../../notas/Cerebro%20del%20Restaurante%20-%20Daily%20Briefing.md) — qué produce el cerebro
- [`notas/Vision Bot - De Rigido a Agente Util.md`](../../../notas/Vision%20Bot%20-%20De%20Rigido%20a%20Agente%20Util.md) — bot rígido vs agente
- [`notas/Agentes GrowthSuite - Vision Completa.md`](../../../notas/Agentes%20GrowthSuite%20-%20Vision%20Completa.md) — los 6 agentes
- [`knowledge/agent-patterns/strangler-fig.md`](../../agent-patterns/strangler-fig.md) — patrón de migración
- [`knowledge/agent-patterns/policy-engine.md`](../../agent-patterns/policy-engine.md) — separación LLM/policy
- [`knowledge/agent-patterns/multi-tenant-isolation.md`](../../agent-patterns/multi-tenant-isolation.md) — fix G12
- [`knowledge/decisions/2026-04-06-strangler-fig-approach.md`](../../decisions/2026-04-06-strangler-fig-approach.md) — decisión de no reescribir

### Anexo B — Queries SQL que generan los números reales del Parte 1

```sql
-- Revenue por restaurante (últimos 30 días)
SELECT restaurant_id, SUM(total) AS revenue, COUNT(*) AS orders_count, AVG(total) AS avg_ticket
FROM orders
WHERE opened_at > now() - interval '30 days'
GROUP BY restaurant_id;

-- Tasa de cancelación por restaurante (proxy de Leakage parcial)
SELECT restaurant_id,
  COUNT(*) FILTER (WHERE cancel_at IS NOT NULL)::float / NULLIF(COUNT(*), 0) AS cancel_rate,
  SUM(total) FILTER (WHERE cancel_at IS NOT NULL) AS cancelled_value
FROM orders
WHERE opened_at > now() - interval '30 days'
GROUP BY restaurant_id;

-- Stock counts coverage (cuán ciegos estamos de Waste)
SELECT restaurant_id, COUNT(*) AS counts_done, MAX(created_at) AS last_count
FROM stock_counts
GROUP BY restaurant_id;

-- Customers totales (debería ser 0 hoy → confirmar)
SELECT COUNT(*) FROM customers;

-- Conversaciones de bot (signal de uso del bot v1)
SELECT COUNT(*) FROM bot_conversations;
SELECT COUNT(*) FROM bot_messages;
```

### Anexo C — Convenciones para revisores externos (ChatGPT, etc.)

Si vas a estudiar este documento como agente externo:

1. **Asume contexto:** GrowthSuite es un POS para restaurantes en CDMX, Mexico, ~30 clientes pagando, monorepo Adonis + React + PostgreSQL en Railway/Vercel.
2. **Asume restricciones de implementación:** equipo pequeño (1-2 devs + agentes IA), no podemos hacer rewrite, prefiere Strangler Fig.
3. **Asume restricciones de producto:** el cliente final es un restaurantero, no un data scientist. La interfaz primaria es WhatsApp.
4. **Tu output deseado:** respuestas a las preguntas Q1-Q10 con razonamiento explícito, ecuaciones cuando aplique, ejemplos concretos de implementación.
5. **No reinventes la rueda:** si una técnica establecida resuelve un problema (ej. RFM para segmentación, Prophet para forecasting), recomiéndala, no propongas algo exótico solo por sofisticación.
6. **Sé honesto sobre incertidumbre:** si una propuesta requiere más datos de los disponibles, dilo. No "hagas magia" con poca data.

---

## 6. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v0.1 | 2026-04-06 | Borrador inicial creado por Claude Opus 4.6 con feedback de Codex pendiente |
