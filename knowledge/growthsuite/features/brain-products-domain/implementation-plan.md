# Implementation Plan — Brain Products Domain

> Date: 2026-04-14
> Branch: hector_dev/brain-products-domain
> Goal: El brain maneja "productos más/menos vendidos" con state lazy + diagnóstico + contexto
> Prerequisite: Pipeline refactorizado (engine puro, state lazy, execute partido, brain por guardrails)

## Etapa A — Brain reconoce dominio "products"

### A.1 — Identificar dónde el brain decide qué dominio manejar
- Leer el código del brain routing (bridge.ts, shouldUseBrain, domain detection)
- Documentar: qué dominios existen hoy (sales, cancellations, discounts)
- Documentar: qué keywords/patrones activan cada dominio
- **Test:** ninguno (solo lectura)
- **Commit:** ninguno

### A.2 — Agregar keywords de "products" al brain domain detector
- Agregar patrones: "productos", "más vendidos", "menos vendidos", "top productos", "bottom", "qué se vende más", "qué se vende menos"
- NO tocar los patrones de sales/cancellations/discounts
- **Test A.2:**
  - `"productos más vendidos"` → brain detecta domain: products ✅
  - `"cuánto vendí hoy"` → brain detecta domain: sales (SIN CAMBIO) ✅
  - `"cancelaciones"` → brain detecta domain: cancellations (SIN CAMBIO) ✅
  - `"hola"` → NO entra al brain (SIN CAMBIO) ✅
- **Commit:** `feat(brain): add products domain keywords`

### A.3 — Crear handler vacío para domain "products" en el brain
- Nuevo archivo o función que solo retorna: `{ handled: true, domain: 'products', reply: 'TODO: productos', mode: 'deterministic' }`
- **Test A.3:**
  - `"productos más vendidos"` → bot responde "TODO: productos" ✅
  - Confirmar que pasó por brain path en logs ✅
  - `"cuánto vendí hoy"` → respuesta normal de ventas (SIN CAMBIO) ✅
- **Commit:** `feat(brain): empty products handler`

---

## Etapa B — Brain usa state.getTopProducts()

### B.1 — Verificar que getTopProducts() funciona aislado
- Escribir un test unitario que llama state.getTopProducts() con restaurantId de Fogo
- Verificar que devuelve un array de productos con: id, name, quantity, total
- **Test B.1:**
  - `getTopProducts(40)` → array con 10+ productos ✅
  - Cada producto tiene name, quantity, total ✅
  - Si falla → el getter del state o la query están rotos
- **Commit:** `test(state): verify getTopProducts returns valid data`

### B.2 — El handler de products llama getTopProducts()
- En el handler de A.3, reemplazar "TODO" por: llamar state.getTopProducts() y formatear la lista
- Console.log: `[BRAIN:PRODUCTS] loaded ${products.length} products`
- **Test B.2:**
  - `"productos más vendidos"` → lista de 5-10 productos con nombres y totales ✅
  - Console muestra `[BRAIN:PRODUCTS] loaded N products` ✅
  - `"cuánto vendí hoy"` → SIN CAMBIO ✅
- **Commit:** `feat(brain): products handler uses state.getTopProducts()`

### B.3 — Verificar que NO se hace query HTTP duplicada
- Agregar console.log temporal en reports/index.ts fetchOrderApiReport
- Mandar "productos más vendidos"
- Verificar que fetchOrderApiReport NO se llama (el brain lo resuelve antes)
- **Test B.3:**
  - NO aparece log de fetchOrderApiReport ✅ (reports no se invocó)
  - SÍ aparece log de `[STATE] getTopProducts called` ✅
- **Commit:** ninguno (solo verificación)

---

## Etapa C — Sort correcto (ASC/DESC)

### C.1 — Detectar "más" vs "menos" en el texto
- Función `detectSortOrder(text)` → 'asc' | 'desc' | 'desc' (default)
- Patrones:
  - "menos vendidos", "bottom", "peor", "qué no se vende" → ASC
  - "más vendidos", "top", "mejor", "qué se vende más" → DESC (default)
- **Test C.1 (unitario, sin bot):**
  - `detectSortOrder("productos menos vendidos")` → 'asc' ✅
  - `detectSortOrder("productos más vendidos")` → 'desc' ✅
  - `detectSortOrder("top productos")` → 'desc' ✅
  - `detectSortOrder("qué no se vende")` → 'asc' ✅
  - `detectSortOrder("productos")` → 'desc' (default) ✅
- **Commit:** `feat(brain): detectSortOrder utility + unit tests`

### C.2 — Aplicar sort en el handler
- El handler llama getTopProducts(), luego sortea según detectSortOrder()
- Limita a top 5 (no 86)
- **Test C.2:**
  - `"productos más vendidos"` → primer producto tiene más ventas que el segundo ✅
  - `"productos menos vendidos"` → primer producto tiene MENOS ventas que el segundo ✅
  - Verificar que son 5 productos, no 86 ✅
- **Commit:** `feat(brain): sort products ASC/DESC based on user intent`

---

## Etapa D — Contexto con diagnóstico

### D.1 — Cruzar con ventas totales
- El handler también llama state.getSalesToday()
- Calcula porcentaje de cada producto vs total
- **Test D.1:**
  - `"productos menos vendidos"` → cada producto muestra "X% de ventas" ✅
  - La suma de porcentajes de los 5 productos < 100% (lógico) ✅
  - Console: `[BRAIN:PRODUCTS] totalSales=$782771, product1Share=0.2%` ✅
- **Commit:** `feat(brain): cross products with total sales for percentage context`

### D.2 — Agregar insight/diagnóstico al reply
- Si un producto lleva 3+ días en bottom 5 → marcar como "persistente"
- Si un producto tiene margen alto → sugerir promoverlo
- Si un producto tiene margen bajo → sugerir considerarlo para quitar
- **Test D.2:**
  - `"productos menos vendidos"` → al menos 1 producto tiene un 💡 con sugerencia ✅
  - La sugerencia es coherente (no inventa datos) ✅
  - NO sugiere acción si no tiene datos de margen (safe degradation) ✅
- **Commit:** `feat(brain): add diagnostic insights to products response`

### D.3 — Formatear respuesta final para WhatsApp
- Formato: emoji + nombre + cantidad + total + porcentaje + insight
- Max 5 productos, max ~500 caracteres
- **Test D.3:**
  - La respuesta tiene máximo 500 caracteres ✅
  - Cada línea tiene nombre + número + $ ✅
  - Se lee bien en WhatsApp (bold, emojis, estructura clara) ✅
- **Commit:** `feat(brain): WhatsApp-friendly formatting for products`

---

## Etapa E — Regression tests

### E.1 — Re-correr mensajes anteriores (NO cambia código)
```
"hola"                       → saludo ✅ (sin cambio)
"cuánto vendí hoy"           → brain:sales con $782K ✅ (sin cambio)
"adiós"                      → saludo ✅ (bug pre-existente, sin cambio)
"cómo van las cancelaciones" → brain:cancellations ✅ (sin cambio)
"cómo vamos"                 → fallback correcto ✅ (sin cambio)
"asdfghjkl"                  → web search ✅ (sin cambio)
```

### E.2 — Probar casos NUEVOS
```
"productos más vendidos"     → brain:products, lista DESC ✅ (NUEVO)
"productos menos vendidos"   → brain:products, lista ASC ✅ (NUEVO)
"qué se vende más"           → brain:products, lista DESC ✅ (NUEVO)
"qué no se vende"            → brain:products, lista ASC ✅ (NUEVO)
```

### E.3 — Score final
- Antes: 6/8 (62%)
- Esperado después: 8/10 (80%) con 2 tests nuevos
- Si score bajó → algo se rompió, revisar logs por etapa
- **Commit:** `test(brain): regression + new product domain tests`

---

## Console logs por etapa (para debugging)

| Etapa | Log | Qué indica |
|---|---|---|
| A.2 | `[BRAIN] domain detected: products` | Brain reconoce el dominio |
| B.2 | `[STATE] getTopProducts called` | State lazy se ejecuta |
| B.2 | `[BRAIN:PRODUCTS] loaded N products` | Handler recibió datos |
| B.3 | ausencia de `[REPORTS] fetchOrderApiReport` | Reports NO se invocó |
| C.2 | `[BRAIN:PRODUCTS] sort=ASC query="menos vendidos"` | Sort correcto |
| D.1 | `[BRAIN:PRODUCTS] totalSales=$782K, share=0.2%` | Cruce de datos |
| D.2 | `[BRAIN:PRODUCTS] insight: persistent_bottom` | Diagnóstico |

Si algo falla:
- Falla en A → classify/brain no detecta el dominio
- Falla en B → state lazy no se llama o query vacía
- Falla en C → sort incorrecto
- Falla en D → cruce de datos o cálculo malo
- Falla en E → algo se rompió de lo anterior

---

## Commits en orden (10 total, cada uno revertible)

```
hector_dev/brain-products-domain
  ├── 1. A.2 — brain keywords for products domain
  ├── 2. A.3 — empty handler returns TODO
  ├── 3. B.1 — unit test getTopProducts
  ├── 4. B.2 — handler calls getTopProducts
  ├── 5. C.1 — detectSortOrder function + unit tests
  ├── 6. C.2 — apply sort in handler
  ├── 7. D.1 — cross with getSalesToday for percentages
  ├── 8. D.2 — insights/diagnostics
  ├── 9. D.3 — WhatsApp formatting
  └── 10. E.1-E.3 — regression + new tests
```
