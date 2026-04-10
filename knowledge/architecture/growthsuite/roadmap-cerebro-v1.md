# GrowthSuite — Roadmap del Cerebro v1

> **Proposito:** Documento maestro que guia TODA decision de codigo (front o back).
> Antes de escribir una tabla, endpoint, componente o prompt: revisa si esta alineado con este documento.
> Si no lo esta, pregunta antes de construir.
>
> **Audiencia:** Hector (CEO) + Jampier (CTO)
> **Version:** v1.0 — 2026-04-09
> **Estado:** ACTIVO — usar como referencia en cada sprint

---

## 1. Que es GrowthSuite

Un cerebro operativo para restaurantes que:
- **Responde** preguntas con datos reales (no respuestas genericas)
- **Detecta** anomalias antes de que el dueno pregunte
- **Recomienda** acciones con base en diagnostico
- **Ejecuta** tareas con confirmacion del dueno

Todo desde WhatsApp. $799 MXN/mes.

---

## 2. El loop central (TODA feature debe caber aqui)

```
datos → estado → diagnostico → respuesta/sugerencia/accion → impacto
  E       s_t       b_t              o_t                      ΔJ_t
```

**Regla de oro:** Si lo que estas construyendo no alimenta una de estas 5 cajas, PARA y pregunta.

| Caja | Que es | Ejemplo |
|------|--------|---------|
| **Datos (E)** | Eventos del negocio capturados | order_created, discount_applied, shift_closed |
| **Estado (s_t)** | Foto resumida del restaurante ahora | ventas hoy $45K, descuentos 22, stock camarón 800g |
| **Diagnostico (b_t)** | Que esta bien, que esta raro, que es urgente | "descuentos 78% arriba de lo normal" |
| **Respuesta (o_t)** | Lo que el cerebro le dice/hace al usuario | dato + diagnostico + sugerencia de accion |
| **Impacto (ΔJ_t)** | Que cambio despues de la intervencion | al dia siguiente bajaron los descuentos |

---

## 3. Los 3 pilares (TODA feature debe servir a uno)

| Pilar | Pregunta que responde | Ejemplos de features |
|-------|----------------------|---------------------|
| **Aumentar ventas** | Como hago que entren mas pedidos/reservaciones/frecuencia? | Reservaciones WhatsApp, tienda en linea, reactivacion de clientes, sugerencias de promo |
| **Proteger utilidad** | Como gano mas dinero neto? | Alertas de descuentos anomalos, control de merma, margen por producto, alerta de cancelaciones |
| **Facilitar operacion** | Como opero con menos friccion? | Reportes por WhatsApp, briefing diario, wizard de inventario, alta de productos por chat |

---

## 4. Taxonomia (no mezclar)

| Categoria | Que es | Ejemplos |
|-----------|--------|----------|
| **Canales** | Por donde entra/sale la interaccion | WhatsApp, POS Admin, Llamadas, Web, Email |
| **Dominios** | Sobre que area del negocio razona | Ventas, Reservaciones, Inventario, Productos, Descuentos, Cancelaciones, Caja, Clientes, Marketing |
| **Sistemas conectados** | Que software alimenta o ejecuta | POS propio, OpenTable, Delivery apps, CRM, Pagina web |

---

## 5. Division de trabajo Hector + Jampier

```
JAMPIER (CTO) = DATOS + REGLAS
├── Tablas y migraciones
├── Queries limpias (app/brain/queries/)
├── Reglas de anomalia (app/brain/rules/)
├── Crons de backfill y calculo
├── Tests de cada query
└── NO toca: prompts, LLM, WhatsApp

HECTOR (CEO) = CEREBRO + UX
├── Brain pipeline (app/brain/pipeline.ts)
├── Tools (wraps de queries de Jampier)
├── System prompts
├── Briefings y alertas formateados
├── Flows/wizards conversacionales
└── NO toca: esquemas de DB, queries SQL directas
```

**Frontera:** Jampier expone funciones tipadas en `app/brain/queries/`. Hector las consume como tools. Si Hector necesita un dato nuevo, le PIDE a Jampier una funcion nueva.

---

## 6. Plan de construccion — Prioridades ordenadas

### PRIORIDAD 1: Proactividad (hacer que el deck sea verdad)
**Pilar:** Facilitar operacion + Proteger utilidad
**Loop:** datos → estado → diagnostico → alerta proactiva → impacto

| Tarea | Quien | Caja del loop | Archivo |
|-------|-------|--------------|---------|
| Tabla `business_events` | Jampier | Datos (E) | `database/migrations/xxx_create_business_events.ts` |
| Tabla `daily_metrics` | Jampier | Estado (s_t) | `database/migrations/xxx_create_daily_metrics.ts` |
| Cron backfill cada 15min | Jampier | Datos (E) | `commands/brain_backfill_events.ts` |
| Cron calculo nocturno | Jampier | Estado (s_t) | `commands/brain_compute_metrics.ts` |
| `buildRestaurantState()` | Jampier | Estado (s_t) | `app/brain/state/build_state.ts` |
| 5 reglas de anomalia | Jampier | Diagnostico (b_t) | `app/brain/rules/*.ts` |
| Briefing diario 8am | Hector | Respuesta (o_t) | `app/brain/briefing/daily.ts` |
| Alertas anomalia cada hora | Hector | Respuesta (o_t) | `app/brain/briefing/anomaly_alert.ts` |

**Entregable:** El dueno de Fogo recibe WhatsApp a las 8am con resumen + anomalias.

### PRIORIDAD 2: LLM con tools como cerebro
**Pilar:** Los 3
**Loop:** usuario pregunta → estado → diagnostico → LLM responde con contexto → log

| Tarea | Quien | Caja del loop | Archivo |
|-------|-------|--------------|---------|
| 20-30 query functions | Jampier | Estado (s_t) | `app/brain/queries/*.ts` |
| `brainResponse()` pipeline | Hector | Todo el loop | `app/brain/pipeline.ts` |
| Tools wrapping queries | Hector | Respuesta (o_t) | `app/brain/tools/*.ts` |
| System prompt gerente | Hector | Respuesta (o_t) | `app/brain/prompts/gerente.ts` |
| Feature flag BRAIN_ENABLED | Hector | Infra | `app/brain/config.ts` |
| `logBrainInteraction()` | Hector | Impacto (ΔJ) | `app/brain/log/interaction_log.ts` |

**Entregable:** El bot responde CUALQUIER pregunta sin "no entiendo", con dato + diagnostico + sugerencia.

### PRIORIDAD 3: Wizards de accion
**Pilar:** Facilitar operacion
**Loop:** usuario pide → wizard guiado → confirmacion → ejecucion → log

| Tarea | Quien | Pilar | Archivo |
|-------|-------|-------|---------|
| `create_product_flow` | Ambos | Facilitar operacion | `app/bot/actions/create_product.ts` |
| `inventory_count_flow` | Ambos | Proteger utilidad | `app/bot/actions/inventory_count.ts` |
| Flujo del camaron (cross-domain) | Ambos | Los 3 | `app/brain/flows/ingredient_check.ts` |

**Entregable:** El demo del camaron funciona en vivo.

### PRIORIDAD 4: Reservaciones como canal de venta
**Pilar:** Aumentar ventas
**Loop:** cliente reserva → estado actualizado → diagnostico de ocupacion → sugerencias al dueno

| Tarea | Quien | Notas |
|-------|-------|-------|
| Confirmacion por WhatsApp | Hector | Ya existe widget, falta confirmacion WhatsApp |
| Recordatorio 2hrs antes | Hector | Cron + WhatsApp |
| No-show tracking | Jampier | Regla en diagnostico |
| Widget en Google Business | Jampier | SEO boost |

### PRIORIDAD 5: Tienda en linea
**Pilar:** Aumentar ventas
Viene despues de P1-P4. No antes.

---

## 7. Regla de alineacion (checklist para cada PR)

Antes de hacer merge de cualquier PR, responder estas 3 preguntas:

- [ ] **¿A que caja del loop pertenece?** (datos/estado/diagnostico/respuesta/impacto)
- [ ] **¿A que pilar sirve?** (ventas/utilidad/operacion)
- [ ] **¿Quien lo construye?** (Jampier=datos/reglas, Hector=cerebro/UX)

Si no puedes responder las 3, el PR no esta alineado.

---

## 8. Lo que NO hacer (anti-patrones)

- ❌ Construir features que no caben en el loop
- ❌ Tocar `app/bot/pipeline/stages/classify.ts` o `execute.ts` (el bot viejo no se toca)
- ❌ Hacer queries directas a la DB desde el pipeline del cerebro (usar funciones de Jampier)
- ❌ Prometer "autonomia total" cuando es "sugerencia con confirmacion"
- ❌ Construir la tienda en linea antes de que la proactividad funcione
- ❌ Agregar modulos al deck que no estan construidos
- ❌ Intentar ML/aprendizaje antes de tener 10,000+ interacciones logueadas

---

## 9. Metricas de exito por fase

| Fase | Metrica | Target |
|------|---------|--------|
| P1 (proactividad) | Briefings enviados sin error | 7 dias seguidos a Fogo |
| P1 | Anomalias detectadas correctamente | 80%+ precision |
| P2 (LLM cerebro) | Preguntas respondidas sin "no entiendo" | 95%+ |
| P2 | Tiempo de respuesta | <5 segundos |
| P3 (wizards) | Productos creados por wizard | 10+ en Fogo |
| P3 | Demo del camaron end-to-end | 1 video funcionando |
| P4 (reservaciones) | Reservaciones confirmadas por WhatsApp | 50+ en 1 mes |

---

## 10. Estructura de archivos del cerebro

```
app/brain/                          ← TODO lo nuevo va aqui
├── pipeline.ts                     ← brainResponse() principal
├── config.ts                       ← feature flags
├── state/
│   └── build_state.ts              ← buildRestaurantState()
├── queries/                        ← JAMPIER: funciones puras
│   ├── sales.ts
│   ├── discounts.ts
│   ├── cancellations.ts
│   ├── inventory.ts
│   ├── reservations.ts
│   ├── waiters.ts
│   └── shifts.ts
├── rules/                          ← JAMPIER: anomaly detection
│   ├── discount_anomaly.ts
│   ├── cancellation_anomaly.ts
│   ├── sales_drop.ts
│   ├── critical_stock.ts
│   └── unclosed_shift.ts
├── diagnosis/
│   └── diagnose.ts                 ← corre todas las rules
├── tools/                          ← HECTOR: wraps para LLM
│   ├── sales_tools.ts
│   ├── discount_tools.ts
│   ├── inventory_tools.ts
│   └── reservation_tools.ts
├── prompts/
│   └── gerente.ts                  ← system prompt del cerebro
├── briefing/
│   ├── daily.ts                    ← briefing matutino
│   └── anomaly_alert.ts            ← alertas por anomalia
├── flows/
│   ├── create_product.ts           ← wizard alta de producto
│   ├── inventory_count.ts          ← wizard conteo fisico
│   └── ingredient_check.ts         ← flujo del camaron
├── log/
│   └── interaction_log.ts          ← guarda (s_t, q_t, o_t)
└── types.ts                        ← RestaurantState, Diagnosis, etc.
```

---

## 11. Vision largo plazo (para inversionistas, no para el sprint)

```
HOY (2026):
  Cerebro programado: reglas + LLM como interfaz
  → 20 restaurantes, $799/mes, CDMX

AÑO 1 (2027):
  Cerebro hibrido: reglas + componentes aprendidos
  → 200+ restaurantes, Mexico
  → Primeros cadenas (5-10 sucursales)
  → Computer use para conectar POS terceros (Soft Restaurant)

AÑO 2 (2028):
  Cerebro parcialmente aprendido: diagnostico + scoring
  → Multi-industria: hoteles, spas
  → API del cerebro para terceros
  → Dataset de 100K+ interacciones
```

---

_Ultima actualizacion: 2026-04-09 (Hector + Claude session)_
_Documento vivo: actualizar con cada sprint completado_
