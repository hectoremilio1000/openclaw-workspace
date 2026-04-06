# 🧠 Visión: GrowthSuite como plataforma de Agentes para Restaurantes

## La idea central
GrowthSuite no es un POS con bot. Es una **plataforma de agentes de IA especializados en restaurantes** — igual que Relay.app pero vertical para food service.

Cada "módulo" de GrowthSuite en realidad es un **agente con responsabilidades, workflows y memoria**.

---

## Agentes identificados

### 🛒 Agente de Pedidos (Compras/Insumos)
**Responsabilidad:** Asegurar que el restaurante nunca se quede sin insumos

**Comportamiento proactivo (no solo reactivo):**
- Detecta patrones: "Todos los martes pides pollo y camarón"
- Alerta: "Oye, te faltó hacer tu pedido de pollo y camarón que usualmente haces los martes. ¿Ya lo hiciste? ¿Lo hacemos?"
- Sugiere cantidades basado en historial de ventas
- Avisa cuando un proveedor no ha confirmado
- Compara precios entre proveedores

**Diferencia bot vs agente:**
- Bot: "¿Qué quieres pedir?" (reactivo, espera que le hablen)
- Agente: "Vi que mañana tienes 3 reservaciones grandes y tu stock de camarón está bajo. ¿Hago el pedido?" (proactivo, tiene contexto y memoria)

---

### 📱 Agente de Atención al Cliente (WhatsApp)
**Responsabilidad:** Atender clientes 24/7

- Responde preguntas (menú, horarios, ubicación)
- Toma reservaciones
- Maneja quejas y las escala si es necesario
- Manda confirmaciones y recordatorios
- Memoria: sabe que el cliente X siempre pide la mesa del fondo

---

### 📊 Agente de Marketing
**Responsabilidad:** Atraer y retener clientes

- Segmenta clientes por frecuencia de visita
- Envía promos personalizadas ("No te hemos visto en 2 semanas, ¿vienes este viernes? 10% en tu platillo favorito")
- Detecta clientes en riesgo de churn
- Sugiere campañas basadas en datos de venta
- Mide ROI de cada promo

---

### 🪑 Agente de Reservaciones
**Responsabilidad:** Optimizar ocupación

- Toma y confirma reservaciones
- Sugiere horarios cuando el preferido está lleno
- Manda recordatorios automáticos
- Detecta no-shows recurrentes
- Overbooking inteligente basado en tasa de no-show

---

### 💰 Agente de Caja/Finanzas
**Responsabilidad:** Control financiero diario

- Alerta discrepancias en cortes
- Resumen diario automático al dueño
- Compara ventas vs mismo día semana pasada
- Detecta anomalías (turno con muchas cancelaciones, descuentos excesivos)

---

### 👨‍🍳 Agente de Operaciones (Cocina/Piso)
**Responsabilidad:** Eficiencia operativa

- Tiempos de preparación por platillo
- Alerta cuando un platillo tarda más de lo normal
- Sugiere 86 (sacar del menú) cuando un insumo está bajo
- Coordina entre cocina y meseros

---

## Modelo Relay.app aplicado

| Concepto Relay | Equivalente GrowthSuite |
|---|---|
| Agent | Cada módulo con IA proactiva |
| Workflow | Automatizaciones por agente (pedir insumos, enviar promo, etc.) |
| Historial | Memory del agente (sabe qué pasó antes) |
| Responsabilidades | Roles definidos por agente |
| Puesto | "Agente de Pedidos", "Agente de Marketing", etc. |

## El pitch
> "No contratas un sistema POS. Contratas un equipo de 6 agentes de IA que trabajan 24/7 para tu restaurante. Cada uno tiene su puesto, sus responsabilidades, y aprenden de tu negocio."

---

## Prioridad de desarrollo
1. 🛒 **Agente de Pedidos** — alto valor, diferenciador real (nadie lo tiene)
2. 📱 **Agente de Atención** — ya existe como bot, evolucionar a agente
3. 📊 **Agente de Marketing** — segundo paso natural
4. 🪑 **Agente de Reservaciones** — ya existe, agregar proactividad
5. 💰 **Agente de Caja** — alertas automáticas
6. 👨‍🍳 **Agente de Operaciones** — más complejo, fase posterior

## Tags
#vision #agentes-ia #growthsuite #producto #relay #pedidos #estrategia
