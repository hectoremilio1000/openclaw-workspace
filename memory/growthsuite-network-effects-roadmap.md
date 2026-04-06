# GrowthSuite POS — Network Effects & Data Intelligence Roadmap

> Fecha: 2026-03-02
> Status: Pendiente — implementar cuando haya más restaurantes activos

---

## Visión

De POS → Plataforma de Inteligencia para Restaurantes. La ventaja competitiva no es el POS en sí, sino la capa de inteligencia que se alimenta de la red de restaurantes. Más restaurantes → mejores recomendaciones → más valor → más restaurantes (data flywheel).

---

## 7 Network Effects identificados

### 1. Network effect de datos (el más poderoso)

Mientras más restaurantes usan el POS, más datos reales para comparar, detectar patrones y recomendar.

**Qué mejora con más restaurantes:**
- Benchmarks por zona y tipo (Coyoacán / Del Valle / Polanco, etc.)
- Efectividad real de promos (2x1, combos, happy hour, descuento por horario)
- Horarios pico por colonia (no por "promedio general")
- Ticket promedio realista por segmento (tacos vs café vs mariscos)
- Rotación de productos (qué se vende de verdad en cada zona)
- Temporadas y eventos locales (quincenas, partidos, ferias, vacaciones)

**Ejemplo real:**
- Pregunta: "¿Qué promo me conviene para los martes?"
- Con pocos datos → respuesta genérica
- Con red → "En tu zona y tu tipo de negocio, los martes funciona mejor combo que descuento directo. El 2x1 en bebidas funciona si tu % bebidas/venta es > X. En tu colonia, de 18:00–20:00 sube el flujo con promo 'early'."

### 2. Network effect de aprendizaje operativo (playbooks)

No solo números. Con más restaurantes se descubren procedimientos ganadores.

**Qué mejora:**
- Playbooks por tipo de negocio: "Cómo aumentar ticket sin bajar margen", "Cómo bajar cancelaciones", "Cómo reducir merma"
- Plantillas de promos que funcionan (con copy, horarios, reglas)
- Checklists de configuración del POS (menú, categorías, modificadores) que evitan errores comunes

### 3. Network effect del assistant (respuestas cada vez más útiles)

El bot mejora porque tiene mejores fuentes (métricas, benchmarks, históricos), aprende intenciones reales, y se mejora el enrutado.

**Qué mejora con red:**
- Mejor clasificación de preguntas
- Mejor "memoria" por restaurante (lo que realmente vende y cuándo)
- Mejor "respuesta con números" (menos texto, más acción)
- Mejores recomendaciones por similitud ("restaurantes como el tuyo")

### 4. Network effect de detección de anomalías (fraude/errores)

Con más restaurantes, se detectan patrones raros más fácil.

**Qué mejora:**
- Alertas: "Tus cancelaciones hoy están 3x arriba de lo normal vs tu histórico"
- "En negocios similares, ese % de descuentos es inusual"
- "Esta caja está cerrando con diferencias atípicas"
- Comparación contra su propio histórico + su grupo comparable (zona + tipo + tamaño)

### 5. Network effect de inventario y compras

**Qué mejora:**
- Predicción de demanda por zona (insumos y productos)
- Recomendación de reorden (cuándo comprar y cuánto)
- Estacionalidad real: "esta semana sube X producto"
- Futuro marketplace: mejores precios por volumen
- "A restaurantes similares se les acaba más rápido X los fines de semana; sube par level."

### 6. Network effect de menu engineering

**Qué se descubre con red:**
- Qué combinaciones elevan ticket
- Qué productos venden pero dejan poco margen
- Qué categorías empujan más upsell
- Qué nombres/formatos funcionan mejor

**Bot puede sugerir:**
- "Tu producto estrella es X; arma combo con Y para subir margen"
- "Este ítem vende pero te mata en merma; ajusta porción o precio"

### 7. Network effect de clientes finales (B2C loyalty) — FASE POSTERIOR

Conectar restaurantes (B2B) con consumidores (B2C). Cada restaurante nuevo hace más atractiva la app, y más consumidores hacen más atractivo el POS.

- "Promos cerca de mí"
- Stamp cards / puntos
- Happy hour por zona
- **Nota:** Este es el más sexy pero más caro de operar. Dejarlo para después.

---

## Regla de oro: Privacidad

### A) Dato privado (por restaurante)
- Ventas, tickets, staff, recetas, etc.
- Solo lo ve ese restaurante

### B) Dato agregado anónimo (de red)
- Benchmarks por zona/tipo
- Promos más efectivas, horarios pico, tendencias
- Condiciones:
  - Mínimo N restaurantes para mostrar datos
  - Rangos en vez de números exactos si hace falta
  - Sample size visible

---

## Prioridad de implementación

| # | Feature | Descripción | Esfuerzo |
|---|---------|-------------|----------|
| 1 | `restaurant_metrics` tabla + cron diario | Base de todo. Calcular métricas diarias por restaurante | 1-2 días |
| 2 | Dashboard "¿Cómo voy?" | El dueño ve valor inmediato al abrir el admin | 2-3 días |
| 3 | `industry_benchmarks` agregado anónimo | Aunque sean 3 restaurantes, ya mostrar rangos | 1 día |
| 4 | Intent `consulta_inteligencia` en el bot | El dueño pregunta y recibe datos reales | medio día |
| 5 | Alertas de anomalías | "Tus cancelaciones hoy están 3x arriba" | 1 día |
| 6 | Promo builder con recomendación | Elige objetivo → sugiere mejor promo basada en data | 2-3 días |
| 7 | Predicción de demanda | Por día/hora + temporada | 3-5 días |

---

## Tablas propuestas

### `restaurant_metrics` (cálculo diario)
```sql
restaurant_metrics
├── restaurant_id
├── date
├── total_sales
├── avg_ticket
├── top_products (jsonb)
├── peak_hours (jsonb)
├── promo_performance (jsonb)
├── cancellation_rate
├── staff_efficiency (ventas/mesero)
└── computed_at
```

### `industry_benchmarks` (agregado anónimo)
```sql
industry_benchmarks
├── zone (colonia/delegación/ciudad)
├── restaurant_type (mexicano, italiano, café, bar)
├── date_range
├── avg_ticket_range
├── peak_hours_pattern
├── top_category_trends
├── promo_effectiveness (jsonb)
├── seasonal_patterns
└── sample_size
```

---

## Features que nacen del network effect

- "¿Cómo voy vs mi zona?" (benchmark dashboard)
- "Promo builder con recomendación" (elige objetivo y sugiere mejor promo)
- "Calendario inteligente" (días malos → acciones sugeridas)
- "Alertas" (variaciones raras en cancelaciones, descuentos, faltantes)
- "Sugerencia de combos" (subir ticket / margen)
- "Predicción de demanda" (por día/hora + temporada)

---

## Notas estratégicas

- **No necesitas "muchos" restaurantes para empezar.** Con 5-10 del mismo tipo en la misma zona ya hay benchmarks útiles.
- **Vertical primero > cobertura amplia.** Restaurantes mexicanos en CDMX con 15-20 ya da benchmarks brutales.
- **B2C loyalty (punto 7) dejarlo para después.** Los puntos 1-4 dan ventaja competitiva sin adquirir consumidores.
- **Referencia:** Así lo hacen Stripe (benchmarks de conversión) y Toast (restaurant benchmarks).
