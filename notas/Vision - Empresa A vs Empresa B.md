# Visión: Empresa A vs Empresa B — El "Cerebro"

> Nota guardada: 2026-04-03

## El concepto

Un **cerebro** al que le dices "quiero hacer inventarios" y te arma el wizard. Le dices "quiero vender más" y te arma la campaña. Cada tema es un **agente especializado**. Y ese cerebro después lo conectas a **cualquier plataforma**, no solo a GrowthSuite.

Esto es una **visión de plataforma de agentes verticales para negocios**, no solo un SaaS de restaurantes.

---

## El problema: son dos empresas diferentes

### Empresa A: GrowthSuite
- POS + inventario + bot para restaurantes en México
- $799/mes
- Concreta, vendible hoy

### Empresa B: Cerebro de IA
- Se conecta a cualquier plataforma para operar cualquier negocio
- Empresa de infraestructura de IA
- Ambiciosa, cara, nadie la compra hasta que demuestres que funciona en un vertical

---

## La estrategia correcta

> La Empresa B es la visión correcta a largo plazo. Pero si intentas construirla desde el día 1, no vas a llegar.

Las empresas que lo lograron (Salesforce, HubSpot, Shopify) empezaron resolviendo **UN problema para UN tipo de cliente**, y después abrieron la plataforma.

### El plan:
1. **Construye la Empresa A** (GrowthSuite para restaurantes)
2. **Pero arquitectúrala como si fuera la Empresa B** — que los agentes sean modulares, que el "cerebro" sea desacoplable del POS
3. **Cuando tengas 50-100 restaurantes pagando** y el cerebro esté probado, ENTONCES lo abres como plataforma

---

## Qué se necesita (ya lo tienes diseñado)

El pipeline actual (`receive → classify → route → execute`) ya es la **semilla del cerebro**. No necesitas reescribirlo como un "swarm". Necesitas:

- Que cada **action sea un agente autocontenido** con su prompt + tools
- Que el **contexto de industria sea inyectable** (hoy restaurante, mañana hotel)
- Que el **sistema de permisos filtre por rol**

> Eso ya está diseñado en VISION.md. No hace falta más arquitectura, hace falta **ejecutar**.

---

## Links
- [[00 - Mapa de Vision]]
- [[GrowthSuite - 3 Pilares Reconstruidos]]
- [[Agentes GrowthSuite - Vision Completa]]
