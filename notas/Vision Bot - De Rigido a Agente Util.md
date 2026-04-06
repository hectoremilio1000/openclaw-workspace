# 🧠 Visión Bot — De Rígido a Agente Útil

> Nota guardada: 2026-04-03
> La pregunta más importante: ¿Dónde estamos realmente con IA para restaurantes?

---

## La verdad incómoda

### Lo que la IA hace BIEN hoy (2026)
- **Responder preguntas con datos.** "¿Cuánto vendí ayer?" → query a DB → número. Funciona perfecto.
- **Clasificar y rutear.** "Cancela la mesa 7" → entiende intent → ejecuta acción hardcodeada.
- **Generar texto.** Posts, emails, resúmenes.
- **Detectar patrones simples.** "15 cancelaciones vs promedio de 4" — ni necesitas IA para eso.

### Lo que la IA NO hace bien hoy
- **Tomar decisiones de negocio reales.** No sabe si debes cambiar proveedor o despedir al mesero.
- **Aprender de la operación.** Cada conversación empieza de cero. La "memoria" es texto guardado, no aprendizaje real.
- **Ejecutar procesos complejos autónomamente.** "Haz el inventario" = contar físicamente + comparar + investigar + decidir + ajustar + negociar.

---

## El espectro real

```
100% HUMANO ◄──────────────────────────► 100% AGENTE

IMPOSIBLE HOY          DIFÍCIL HOY              FUNCIONA HOY
│                      │                        │
│ Negociar con         │ "Haz el inventario"    │ "¿Cuánto vendí?"
│ proveedor            │ (wizard guiado,        │ "Cancela mesa 7"
│                      │  humano valida)        │ "¿Qué se vendió más?"
│ Decidir despedir     │                        │ Alertas automáticas
│ a alguien            │ "Arma campaña de       │ Confirmar reservación
│                      │  marketing"            │ Recordatorios WhatsApp
│ Cambiar el menú      │ (sugiere, humano       │ Reportes de ventas
│                      │  aprueba)              │
│ Resolver conflicto   │ Detectar fraude        │
│ con staff            │ (detecta, humano       │
│                      │  investiga)            │
```

---

## Bot rígido (hoy) vs Agente útil (alcanzable)

### Hoy: Bot rígido con acciones predefinidas
```
Usuario: "¿Cuánto vendí ayer?"
  → Classify: intent = "sales_report"
  → Execute: sales_report_action.ts (query hardcodeado)
  → Respuesta: "$45,000 en 127 órdenes"
```
¿Inteligencia? Ninguna. El LLM solo clasifica el intent. La acción es un script.

### Lo que queremos: Agente que razone
```
Usuario: "Mis costos están muy altos"
  → Agente piensa:
    1. ¿Qué costos? → food cost actual: 38%
    2. ¿Cuál es el target? → histórico: 32%
    3. ¿Dónde subió? → proteínas +22%
    4. ¿Por qué? → precio del pollo subió 15%
    5. ¿Qué más? → merma en cortes: 8% (alto)
  → Respuesta:
    "Tu food cost está en 38% (target 32%).
     Dos problemas:
     1. Pollo subió 15%. ¿Busco cotización alternativa?
     2. Merma en cortes es 8%. Revisa porcionado.
     ¿Empezamos por proveedor o por merma?"
```

**Esto SÍ es posible hoy.** Pero lo que realmente pasa:
- LLM recibe system prompt + tools (query_food_cost, query_purchases, query_waste, query_suppliers)
- LLM decide en qué orden llamar los tools
- Tools hacen queries reales a la DB
- LLM sintetiza resultados

**Lo que NO pasa:** El LLM no "aprende" ni tiene criterio propio. Sigue instrucciones que TÚ escribiste.

---

## Qué falta para pasar de bot rígido a agente útil

| Aspecto | Bot rígido (hoy) | Agente útil (alcanzable) |
|---------|------------------|--------------------------|
| Tools | 5-10 acciones hardcodeadas | 30-50 tools que cubran toda la operación |
| Prompts | Genérico: "eres asistente de restaurante" | Específico por dominio: analista de costos, gerente de ops, marketing |
| Memoria | Guarda texto suelto | Guarda decisiones pasadas, preferencias, patrones |
| Iniciativa | Solo responde | Revisa periódicamente y avisa si encuentra algo |
| Ejecución | El humano hace todo | Agente hace lo mecánico, humano valida lo importante |

**No es un cambio de arquitectura.** Es:
1. **Más tools** — de 10 a 30-50 que cubran costos, merma, proveedores, comparativos, alertas, staff, marketing
2. **Mejores prompts por dominio** — no un prompt genérico, sino uno de "analista de costos", otro de "gerente de ops", otro de "marketing"
3. **Proactividad** — cron que cada mañana revise anomalías y mande WhatsApp al dueño sin que pregunte
4. **Memoria de decisiones** — no solo "el dueño se llama Ricardo", sino "la última vez que subió el pollo, cambió a Proveedor B y funcionó"

---

## Timeline realista

### Ya funciona (2026)
- Agente que analiza datos y sugiere (costos, ventas, anomalías)
- Agente que ejecuta tareas mecánicas (pedir a proveedor, confirmar reservación)
- Agente que genera contenido (copy, posts, emails)
- Agente proactivo que revisa y alerta

### Funciona parcial (2026-2027)
- Wizard que guía procesos complejos (inventario, onboarding de platillo)
- Agente que negocia con proveedor por WhatsApp (manda mensaje, humano valida)
- Agente que optimiza precios basado en demanda

### Todavía no (2027+)
- Agente que toma decisiones estratégicas autónomamente
- Agente que "aprende" del negocio sin que le digas cómo
- AGI que opera todo sin supervisión

---

## La recomendación brutal

> Deja de pensar en "agentes autónomos que toman decisiones" y empieza a pensar en **"agente que hace el trabajo aburrido y te presenta las decisiones masticadas"**.

El restaurantero no quiere que una IA decida por él. Quiere que le digan:

> *"Tienes un problema en costos. Es el pollo. Aquí hay dos opciones. ¿Cuál prefieres?"*

**Tu producto real es: convertir 4 horas de trabajo en 30 segundos de decisión.**

- ❌ 4 horas: revisar ventas, comparar con semana pasada, revisar cancelaciones, llamar al gerente, revisar inventario
- ✅ 30 segundos: leer el WhatsApp que tu agente te mandó con todo masticado y responder "sí" o "no"

**ESO vende. ESO es real. Y ESO lo puedes construir HOY.**

---

## Propuesta para cadenas (enterprise)

### El problema de las cadenas
No van a cambiar su POS (Oracle, Soft Restaurant, Toast). Ya invirtieron millones.

**Lo que les vendes:** El cerebro como capa de inteligencia que se conecta a SU infraestructura.

```
CADENA DE 50 SUCURSALES
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Oracle   │ │ Soft     │ │ Toast    │  ← Ya tienen su POS
└────┬─────┘ └────┬─────┘ └────┬─────┘
     └────────────┼────────────┘
                  │
          ┌───────▼────────┐
          │ CEREBRO        │
          │ GROWTHSUITE    │  ← Tu producto enterprise
          │ Se conecta a   │
          │ cualquier POS  │
          └───────┬────────┘
     ┌────────────┼────────────┐
┌────▼─────┐ ┌───▼─────┐ ┌───▼──────┐
│ WhatsApp │ │Dashboard│ │ Alertas  │
│ del CEO  │ │ multi-  │ │ automá-  │
│          │ │sucursal │ │ ticas    │
└──────────┘ └─────────┘ └──────────┘
```

### Ejemplo de agente para cadena
El agente le escribe al director de ops por WhatsApp:
> "Buenos días. Resumen de tus 50 sucursales:
> 47 operando normal
> 🔴 Polanco: 23 cancelaciones (vs promedio 4). Revisar.
> 🟡 Satélite: no abrió turno. ¿Problema de staff?
> 🟡 Roma: food cost subió a 38% (target 32%). Posible desperdicio."

### Pricing enterprise

| Tier | Sucursales | Precio | Qué incluye |
|------|-----------|--------|-------------|
| GrowthSuite | 1 | $799 MXN/mes | POS + bot + inventario |
| GrowthSuite Pro | 2-10 | $15,000-30,000 MXN/mes | Cerebro multi-sucursal + dashboard + alertas |
| GrowthSuite Enterprise | 11-100+ | $50,000-150,000 MXN/mes | Todo Pro + integración con SU POS + SLA |

### Roadmap enterprise

```
AHORA (0-6 meses):
  Vende a independientes. $799/mes.
  Llega a 20-30 restaurantes pagando.

EN PARALELO (mes 3-6):
  Busca UNA cadena de 5-10 sucursales.
  Que ya use GrowthSuite POS.
  Ofréceles dashboard multi-sucursal + WhatsApp.
  Cobra $15,000-20,000/mes.

DESPUÉS (6-12 meses):
  Con ese caso de éxito, busca cadenas grandes.
  AHORA SÍ construye integración con POS terceros.
  Ya sea por API o computer use (como Lance).
```

---

## Links
- [[00 - Mapa de Vision]]
- [[GrowthSuite - 3 Pilares Reconstruidos]]
- [[Agentes GrowthSuite - Vision Completa]]
- [[Referente - Lance AI]]
- [[Marketing con IA - Ejecucion]]
