# 🎯 Palancas de Ventas — Restaurantes

> "Más ventas" no es una métrica. Es un resultado. Lo que mueves son palancas.

---

## La tesis

Para restaurantes, "más ventas" casi nunca significa una sola cosa. Se descompone en **7 palancas independientes**, cada una atacable con un agente o workflow diferente.

La tesis más grande: un **cerebro que controle la empresa**. Se llega construyendo muchos agentes, cada uno dueño de una palanca. Ver [[Agentes GrowthSuite - Vision Completa]].

---

## Las 7 palancas

### 1. 📅 Más reservas
- Reservaciones online (widget propio, WhatsApp, Google)
- SEO local + Google Business Profile optimizado
- Menos fricción = más conversión
- **Agente responsable:** [[Agentes GrowthSuite - Vision Completa#📊 Agente de Marketing|Agente de Marketing]] + sistema de reservaciones

### 2. 🔁 Más visitas repetidas
- CRM básico: saber quién vino, cuándo, qué pidió
- Recordatorios inteligentes: "Hace 3 semanas que no vienes, ¿reservamos tu mesa?"
- Programas de lealtad simples (no puntos complicados)
- **Agente responsable:** Agente de Atención al Cliente con memoria de clientes

### 3. 🚫 Menos demanda perdida
- Contestar WhatsApp 24/7 (no perder el cliente que escribe a las 11pm)
- Respuesta rápida en todos los canales
- Si no hay mesa, ofrecer alternativa (otra hora, lista de espera)
- **Agente responsable:** [[Agentes GrowthSuite - Vision Completa#📱 Agente de Atención al Cliente (WhatsApp)|Agente de Atención al Cliente]]

### 4. 💰 Más ticket promedio
- Sugerencias inteligentes: "¿Le añadimos guacamole?" "Esta botella va bien con lo que pidió"
- Menú diseñado para upsell (combos, extras visibles)
- Comandero que sugiere al mesero qué ofrecer
- **Agente responsable:** Agente de Pedidos / lógica en comandero

### 5. ⏰ Más ocupación en horas flojas
- Promociones dinámicas: "Martes 2x1 de 3-5pm"
- Push a clientes recurrentes cuando hay mesas vacías
- Happy hours automatizados por data real (no intuición del dueño)
- **Agente responsable:** Agente de Marketing con datos de ocupación

### 6. 🌐 Más conversión desde canales propios
- Tienda en línea propia (sin pagar 30% a Rappi)
- WhatsApp como canal de pedidos directos
- Landing del restaurante con menú, precios, botón de pedir
- Ver [[GrowthSuite - 3 Pilares Reconstruidos]] — el pilar "Vende"

### 7. 🪑 Menos no-shows / más llenado de huecos
- Confirmación automática 24h antes: "¿Sigues viniendo mañana a las 8?"
- Si cancela → liberar mesa y avisar a lista de espera
- Depósito o tarjeta para grupos grandes
- **Agente responsable:** Sistema de reservaciones + Agente de Atención

---

## De palanca a agente

```
┌──────────────────────┐
│   CEREBRO CENTRAL    │  ← La tesis final
│  (orquestador)       │
└──────┬───────────────┘
       │
  ┌────┴────┬──────────┬──────────┬──────────┐
  ▼         ▼          ▼          ▼          ▼
📅 Reservas  🔁 Retención  💰 Upsell  ⏰ Ocupación  🌐 Canales
  │         │          │          │          │
  └────┬────┴──────────┴──────────┴──────────┘
       │
  Cada palanca = un agente (o capability de un agente)
  Todos comparten CONTEXTO: inventario, calendario, historial
```

La velocidad importa. No se necesita perfección en cada palanca — se necesita que **cada una exista como agente básico** y luego iterar. Ver [[Vision - Empresa A vs Empresa B]].

---

## Cómo se conecta con lo que ya tenemos

| Palanca | ¿Ya existe algo? | Status |
|---------|-------------------|--------|
| Más reservas | `pos_reservaciones_api` + widget | 🟢 |
| Visitas repetidas | Bot con memoria parcial | 🟡 |
| Menos demanda perdida | Bot WhatsApp 24/7 | 🟢 |
| Ticket promedio | Nada aún | 🔴 |
| Horas flojas | Nada aún | 🔴 |
| Canales propios | `pos_website_api` + bot | 🟡 |
| No-shows | Confirmaciones manuales | 🔴 |

---

## Notas relacionadas

- [[Cerebro del Restaurante - Daily Briefing]] — El briefing diario que convierte datos en acciones
- [[00 - Mapa de Vision]] — La visión completa
- [[Agentes GrowthSuite - Vision Completa]] — Los agentes que ejecutan las palancas
- [[GrowthSuite - 3 Pilares Reconstruidos]] — Opera / Vende / Controla
- [[Vision Bot - De Rigido a Agente Util]] — De bot reactivo a agente proactivo
- [[Marketing con IA - Ejecucion]] — Ejecución de marketing con IA
- [[Disruption - Market Equilibrium]] — La disruption no es tech, es cambiar equilibrio

---

*Creada: 2026-04-05*
