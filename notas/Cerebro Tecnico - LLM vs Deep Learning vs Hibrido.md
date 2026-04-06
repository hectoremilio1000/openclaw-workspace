# 🔬 Cerebro Técnico — LLM vs Deep Learning vs Híbrido

> ¿Cómo se construye un cerebro de restaurante en la práctica? ¿LLM puro, deep learning, o híbrido?

---

## Lo que dice la base de datos hoy (revisada 2026-04-05)

### Lo que SÍ tienes (y es valioso)

| Dato | Volumen | Desde cuándo |
|------|---------|--------------|
| Órdenes | 341,425 | 2017 |
| Order items | 2,484,725 | 2017 |
| Pagos | 470,693 ($493M MXN) | 2017 |
| Turnos | 6,982 | — |
| Inventario items | 2,382 | — |
| Movimientos inventario | 19,520 | — |
| Órdenes de compra | 2,182 | — |
| Bot conversaciones | 342 (8,840 mensajes) | — |
| Bot memories | 189 | — |
| Recetas | 302 (672 líneas) | — |
| Productos | 1,755 | — |

**4 restaurantes con datos reales**: r40 (123K orders), r5 (101K), r13 (100K), r7 (15K).

### Lo que NO tienes (huecos críticos)

| Dato | Rows | Impacto |
|------|------|---------|
| **Customers** | **0** | No sabes quién compra. Sin CRM no hay retención, no hay patrones de cliente, no hay "visitas repetidas". Este es el hueco #1. |
| **Reservaciones** | **0** | El módulo existe pero nadie lo usa aún. Sin datos, no hay predicción de demanda. |
| **Encuestas / feedback** | **19** | Prácticamente nada. Sin feedback no hay señal de calidad. |
| **Stock counts** | **7** | Solo 7 conteos en 2 semanas. Inventario físico vs sistema está ciego. |
| **Bot user profiles** | **8** | El bot no conoce a casi nadie. |
| **Promotions applied** | **0** | No hay data de qué promos funcionan. |
| **Website insights** | **0** | Tienda online sin analytics. |

---

## La respuesta honesta: cómo construir el cerebro

### Opción 1: LLM puro (agentes con RAG)
**Qué es:** Cada agente es un LLM que consulta la base de datos en tiempo real, razona, y genera recomendaciones.

**Pros:**
- Puedes empezar HOY con lo que tienes
- No necesitas miles de restaurantes para que funcione
- Maneja el "long tail" — preguntas raras, situaciones nuevas
- El dueño habla en lenguaje natural: "¿cómo vamos?" → respuesta inteligente

**Contras:**
- Caro en tokens si se consulta mucho
- No aprende patrones estadísticos profundos (no detecta que "cuando llueve, baja el ceviche 30%")
- Cada consulta es "desde cero" — no acumula conocimiento implícito

**Cuándo usarlo:** Para el briefing diario, responder preguntas, generar checklists, alertas básicas. **Es tu punto de partida.**

### Opción 2: Deep Learning / ML clásico
**Qué es:** Modelos entrenados con datos históricos que predicen demanda, detectan anomalías, optimizan precios.

**Pros:**
- Detecta patrones que un LLM no ve (estacionalidad, correlaciones)
- Una vez entrenado, es barato de ejecutar
- Mejora con más datos y más restaurantes
- Es lo que hacen los grandes (Toast, Square, Lightspeed)

**Contras:**
- **Necesitas MUCHO más data de la que tienes hoy**
- Requiere feature engineering (preparar los datos, limpiar, normalizar)
- Un modelo por problema (demanda ≠ anomalía ≠ churn)
- No genera texto ni interactúa en lenguaje natural

**Cuándo usarlo:** Cuando tengas 50+ restaurantes con datos limpios. Para: forecasting de demanda, detección de anomalías, pricing dinámico.

### Opción 3: Híbrido (la correcta) ✅
**Qué es:** LLM como capa de razonamiento e interacción + modelos ML/estadísticos como "cerebelo" que detecta patrones y alimenta al LLM.

```
┌─────────────────────────────────────┐
│         CAPA DE INTERACCIÓN         │
│     LLM (agentes, briefing, NL)     │  ← Habla con el dueño
└───────────────┬─────────────────────┘
                │ consulta
┌───────────────▼─────────────────────┐
│         CAPA DE INTELIGENCIA        │
│  Reglas + Estadística + ML ligero   │  ← Detecta patrones
│  (promedios, tendencias, alertas)   │
└───────────────┬─────────────────────┘
                │ lee
┌───────────────▼─────────────────────┐
│         CAPA DE DATOS               │
│  PostgreSQL + embeddings + logs     │  ← Tu DB actual
└─────────────────────────────────────┘
```

---

## En la práctica: el plan por fases

### Fase 1: Reglas + LLM (AHORA, con lo que tienes)

No necesitas ML todavía. Con SQL + reglas simples + LLM ya generas valor:

```sql
-- Ticket promedio bajando
SELECT AVG(total) FROM orders 
WHERE opened_at > now() - interval '7 days'
-- vs
SELECT AVG(total) FROM orders 
WHERE opened_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
```

```sql
-- Inventario que se va a acabar
SELECT ii.name, is2.qty_on_hand_base,
  (SELECT AVG(abs(quantity_base)) FROM inventory_movements im 
   WHERE im.inventory_item_id = ii.id 
   AND im.movement_at > now() - interval '7 days') as avg_daily_use
FROM inventory_items ii
JOIN inventory_stocks is2 ON is2.inventory_item_id = ii.id
WHERE is2.qty_on_hand_base > 0
```

El LLM toma estos números y genera el briefing en lenguaje natural. **Esto ya lo puedes hacer.**

Lo que necesitas construir PRIMERO:
- **Llenar la tabla `customers`** — Conectar orders → phone/customer. Cada orden con delivery_customer_phone o waiter que tomó nota = un cliente potencial.
- **Materializar métricas diarias** — Una tabla `daily_metrics` que precalcule por restaurante: ventas, ticket promedio, # órdenes, top productos, etc.
- **Event log unificado** — Todo lo que pasa en el restaurante (orden, cancelación, void, check-in, stock count) en un solo timeline.

### Fase 2: Estadística + features (3-6 meses, 10+ restaurantes)

Cuando tengas más restaurantes con datos limpios:

- **Forecasting de demanda** — Prophet o similar, por platillo/hora/día. No necesitas deep learning, time series clásico funciona bien con los datos que ya tienes de r13 y r5 (100K+ órdenes cada uno).
- **Detección de anomalías** — Z-score simple: "hoy vendiste 40% menos que el promedio de este día de la semana". No es ML, es estadística.
- **Clustering de clientes** — RFM (Recency, Frequency, Monetary). Con K-means básico identificas: VIP, regulares, en riesgo, perdidos.
- **Basket analysis** — "Quién pide ceviche también pide michelada". Association rules. Alimenta sugerencias de upsell.

### Fase 3: Deep Learning real (1-2 años, 50+ restaurantes)

Aquí sí necesitas escala:

- **Modelo de demanda multi-restaurante** — Un modelo que aprende de TODOS los restaurantes. "Los restaurantes de mariscos en CDMX venden 30% menos en lunes". Transfer learning: restaurante nuevo hereda conocimiento de los existentes.
- **Embeddings de productos** — Representación vectorial de cada platillo. Permite: "este platillo es similar a estos otros en restaurantes similares, y allá les funciona esto".
- **Recomendación de acciones** — "Restaurantes similares al tuyo que activaron happy hour los martes vieron +18% de ocupación". Esto es reinforcement learning lite.

---

## Lo que deberías hacer con tu DB para preparar el camino

### Tablas que necesitas crear/llenar YA

**1. `daily_restaurant_metrics`** (vista materializada o cron)
```
restaurant_id, date, 
orders_count, items_count, revenue, avg_ticket,
cancelled_orders, void_items, 
top_product_id, top_product_qty,
unique_customers (cuando exista CRM)
```

**2. Llenar `customers`**
- Cruzar `orders.delivery_customer_phone` con `bot_conversations.phone`
- Cada teléfono único = un customer
- Calcular: visit_count, last_visit, avg_ticket_per_customer

**3. `restaurant_events` (event sourcing lite)**
```
restaurant_id, event_type, event_at, payload_json
-- tipos: order_opened, order_cancelled, item_voided, 
--        shift_opened, stock_alert, bot_conversation, 
--        purchase_received, stock_counted
```

**4. `product_daily_sales`** (para forecasting futuro)
```
restaurant_id, product_id, date, qty_sold, revenue
```

### Datos que deberías empezar a capturar

| Dato | Por qué | Cómo |
|------|---------|------|
| Clima diario por ubicación | Correlaciona con ventas | API wttr.in, guardar en tabla |
| Eventos locales | "Hoy hay partido = más chelas" | Google Calendar API o manual |
| Tiempo de preparación real | Eficiencia de cocina | Timestamps en monitor (ya tienes `prepared_at` en order_items) |
| Satisfacción post-visita | Signal de calidad | WhatsApp bot: "¿cómo estuvo todo?" automático después de cada visita |
| Razones de cancelación | Categorizar: "no le gustó" vs "tardó mucho" vs "error de cocina" | Ya tienes `cancel_reason` pero necesitas categorías estandarizadas |

---

## Cómo lo hacen los pros

| Empresa | Approach | Escala |
|---------|----------|--------|
| **Toast** | ML para demanda + reglas para ops + LLM reciente para insights | 100K+ restaurantes |
| **Square** | Estadística pesada, ML para fraude y forecasting | Millones de merchants |
| **Lightspeed** | Adquirió Ecwid y Upserve, usa ML para menu insights | 150K+ locations |
| **Olo** | Rules engine + data analytics, recientemente añadiendo AI | 80K+ restaurantes |
| **Owner.com** | Simple: SEO + canal directo. Casi nada de ML | 10K+ restaurantes |

**Patrón:** Todos empezaron con reglas y estadística. ML vino cuando tenían datos de miles de restaurantes. LLM es la capa más nueva, encima de todo.

---

## Resumen ejecutivo

```
HOY (4 restaurantes):
  LLM + reglas SQL + métricas precalculadas
  → Briefing diario que ya es útil
  → PRIORIDAD: llenar customers, materializar métricas

6 MESES (10-20 restaurantes):  
  + Forecasting (Prophet/time series)
  + Clustering de clientes (RFM)
  + Basket analysis
  → El cerebro predice y sugiere

1-2 AÑOS (50+ restaurantes):
  + Modelos multi-restaurante
  + Transfer learning (restaurante nuevo hereda)
  + Reinforcement learning (aprende qué acciones funcionan)
  → El cerebro optimiza solo
```

**La base de datos que estás construyendo HOY es el asset más valioso.** Cada orden, cada movimiento de inventario, cada conversación de bot es un dato de entrenamiento futuro. La clave es **estructurarlo bien ahora** para que cuando llegue la escala, ya tengas el dataset listo.

---

## Notas relacionadas

- [[Cerebro del Restaurante - Daily Briefing]] — Qué produce el cerebro (el output)
- [[Palancas de Ventas - Restaurantes]] — Las 7 palancas que optimiza
- [[Agentes GrowthSuite - Vision Completa]] — Los agentes que ejecutan
- [[00 - Mapa de Vision]] — La tesis completa
- [[Vision - Empresa A vs Empresa B]] — Construir A pensando en B

---

*Creada: 2026-04-06 — Basada en revisión real de la DB de producción*
