# 🧠 Cerebro del Restaurante — El Daily Briefing

> "¿Qué debería hacer hoy en mi restaurante?"
> Esa es la pregunta que el sistema tiene que responder cada mañana.

---

## La idea

El dueño abre GrowthSuite y en lugar de ver dashboards muertos, el cerebro le dice:

> "Buenos días. Hoy tienes 14 reservas, 3 son grupos grandes. Ayer 2 mesas se fueron sin postre (ticket bajo). Tu inventario de camarón alcanza para hoy pero no para mañana. Y tienes 0 reservas para el martes — ¿activamos la promo de happy hour?"

No es un dashboard. Es un **briefing diario construido con toda la información del negocio**, que termina en acciones concretas.

---

## De dónde sale la inteligencia

El cerebro no inventa — **cruza datos que ya existen** pero que hoy nadie conecta:

### Fuentes de información (inputs)

| Fuente | Qué sabe | Status |
|--------|----------|--------|
| **Reservaciones** | Ocupación futura, no-shows, tamaño de grupos | 🟢 Existe |
| **Pedidos / órdenes** | Qué se vende, ticket promedio, platillos estrella | 🟢 Existe |
| **Inventario** | Qué hay, qué falta, qué se va a acabar | 🟢 Existe |
| **Cuentas canceladas** | Platillos devueltos, problemas recurrentes | 🟡 Parcial |
| **Encuestas / feedback** | Satisfacción, quejas, sugerencias | 🔴 No existe |
| **Marketing** | Campañas activas, respuesta, conversión | 🔴 No existe |
| **Costos / compras** | Margen real por platillo, variación de precios | 🟡 Parcial |
| **Personal** | Quién trabaja hoy, rendimiento por mesero | 🔴 No existe |
| **WhatsApp** | Mensajes de clientes, preguntas frecuentes, quejas | 🟢 Existe |
| **Historial de ventas** | Tendencias por día, hora, temporada | 🟢 Existe |

---

## Qué produce el cerebro (outputs)

### 📋 El Briefing Diario

Cada mañana, el sistema genera:

**1. Panorama de hoy**
- Reservas confirmadas y pendientes
- Eventos especiales (grupo grande, cumpleaños, VIP)
- Clima y cómo afecta la afluencia
- Personal programado vs necesario

**2. Alertas y pendientes**
- ⚠️ Inventario bajo: "Camarón para 12 porciones, ayer vendiste 18"
- ⚠️ Checklist sin completar: "No se hizo conteo de almacén ayer"
- ⚠️ Problemas recurrentes: "3er día con queja de tiempos en cocina"
- ⚠️ Cuentas canceladas ayer: "2 cancelaciones en mesa 7 — ¿problema con mesero?"

**3. Oportunidades**
- 💡 "Martes tiene 0 reservas. ¿Mandamos promo a los 47 clientes que vinieron el martes pasado?"
- 💡 "El ceviche lleva 2 semanas como #1 en ventas pero no está en el menú de la tienda online"
- 💡 "Tu ticket promedio bajó 8% esta semana — el combo que activaste no está jalando"

**4. Plan de acción sugerido**
- Checklist priorizado: qué hacer primero, qué puede esperar
- Acciones que el sistema puede ejecutar solo (con aprobación)
- Acciones que requieren al dueño

---

## La experiencia del dueño

```
┌─────────────────────────────────────────────┐
│  Buenos días, Carlos.                        │
│                                              │
│  📊 HOY EN LA LLORONA                       │
│  14 reservas (3 grupos +6 personas)          │
│  Ocupación esperada: 78%                     │
│  Inventario: 2 alertas                       │
│                                              │
│  ⚡ ACCIONES URGENTES                        │
│  □ Pedir camarón (alcanza solo para hoy)     │
│  □ Confirmar reserva grupo de 12 (8pm)       │
│  □ Conteo de almacén pendiente de ayer       │
│                                              │
│  💡 OPORTUNIDADES                            │
│  → Martes vacío: ¿activo happy hour?   [Sí] │
│  → 5 clientes cumple años esta semana  [Ver] │
│                                              │
│  📈 ESTA SEMANA VS ANTERIOR                  │
│  Ventas: +12%  Ticket: -3%  Ocupación: +8%  │
└─────────────────────────────────────────────┘
```

El dueño no tiene que buscar nada. El cerebro le dice qué importa, y él decide.

---

## Cómo se construye (con agentes)

Cada agente es dueño de una pieza del briefing:

```
                    ┌──────────────┐
                    │   CEREBRO    │
                    │ (orquestador)│
                    └──────┬───────┘
                           │ Genera el briefing diario
           ┌───────┬───────┼───────┬───────┬───────┐
           ▼       ▼       ▼       ▼       ▼       ▼
        📅        🛒      📊      📱      💰      🔍
      Reservas  Inventario Marketing WhatsApp Costos  Feedback
        │         │        │        │       │       │
        └─────────┴────────┴────────┴───────┴───────┘
                           │
              Cada agente aporta su sección
              con la MAYOR información posible
```

### Principio clave: cada agente se construye con la mayor información posible

No es "un agente que sabe un poquito de inventario". Es un agente que:
- Tiene todo el historial de compras
- Sabe los patrones de consumo por día
- Conoce los proveedores y sus tiempos de entrega
- Cruza con las reservas futuras para proyectar demanda
- Aprende de sus errores (sugirió pedir 20kg, solo se usaron 12)

**Profundidad > amplitud.** Un agente que sabe TODO de inventario es más útil que 6 agentes que saben poquito de todo.

---

## El resultado final: las 3 métricas que importan

Todo lo que hace el cerebro se mide en 3 cosas:

| Métrica | Cómo la mueve el cerebro |
|---------|-------------------------|
| **Más ventas** | Llena mesas vacías, recupera clientes, reduce demanda perdida. Ver [[Palancas de Ventas - Restaurantes]] |
| **Más utilidades** | Optimiza costos, reduce desperdicio, sube ticket promedio |
| **Más fácil de operar** | Checklists automáticos, alertas proactivas, menos decisiones manuales |

> El dueño de restaurante no quiere un POS. Quiere dormir tranquilo sabiendo que su negocio está bajo control.

---

## Roadmap de construcción

### Fase 1: Briefing básico (con lo que ya tenemos)
- [ ] Resumen de reservas del día
- [ ] Alertas de inventario bajo
- [ ] Ventas de ayer vs promedio
- [ ] Pedidos pendientes por confirmar
- *Usa: reservaciones + órdenes + inventario*

### Fase 2: Briefing inteligente (cruzando datos)
- [ ] Proyección de demanda por platillo
- [ ] Detección de patrones (qué se vende cuándo)
- [ ] Checklist dinámico basado en lo que falta
- [ ] Cuentas canceladas con análisis de causa
- *Agrega: historial + patrones + costos*

### Fase 3: Briefing accionable (agentes autónomos)
- [ ] El agente puede ejecutar acciones (pedir insumos, mandar promo, confirmar reserva)
- [ ] Calendario inteligente: integra todo y sugiere la semana
- [ ] Feedback loop: mide si sus sugerencias funcionaron
- *Agrega: encuestas + marketing + autonomía*

---

## Notas relacionadas

- [[Palancas de Ventas - Restaurantes]] — Las 7 palancas que el cerebro optimiza
- [[Agentes GrowthSuite - Vision Completa]] — Los agentes que alimentan al cerebro
- [[00 - Mapa de Vision]] — La visión completa de GrowthSuite
- [[Vision Bot - De Rigido a Agente Util]] — De reactivo a proactivo
- [[GrowthSuite - 3 Pilares Reconstruidos]] — Opera / Vende / Controla

---

*Creada: 2026-04-05*
