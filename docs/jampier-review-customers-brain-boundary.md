# Review — Jampier customer unification and brain boundary

**Fecha:** 2026-04-07
**Scope revisado:**
- `pos-app` PR #54 (`arreglosJampier62 -> dev`)
- `pos-app` PR #55 (`dev -> main`)
- `pos-front` `origin/devJampier54`

## TL;DR

### Mi dictamen
- **Sí empuja la visión** → porque unifica identidad de cliente entre órdenes, reservaciones, facturas y cupones.
- **Sí es mergeable como dirección** → ya está mergeado y prod no muestra outage inmediato (todos los health endpoints en 200).
- **Pero NO es “el cerebro”** → es una mejora de modelo de datos del core POS.
- **El riesgo real está en migración/compatibilidad**, no en la idea.

## Qué cambia de verdad

### pos-app PR #54 / #55
Cambio fuerte en dominio:
- nueva tabla `customers`
- nueva tabla `coupons`
- tabla `coupon_redemptions`
- `orders.customer_id`
- `reservations.customer_id`
- `restaurant_invoices.customer_id`
- controllers de reservaciones/facturación apuntando a customer unificado

### pos-front devJampier54
Cambio chico:
- agrega rutas `/clientes` y `/cupones`
- agrega menú/sidebar para esas pantallas

## Qué sí me gustó

1. `customer_id` nullable en `orders` → transición más segura
2. `SET NULL` en FKs en lugar de `RESTRICT`
3. separación `coupon_redemptions` → modelo más limpio
4. el PR #54 documenta los 8 issues del review y cómo se resolvieron
5. producción está saludable post-merge (health checks 200)

## Qué me preocupa

1. **Toca core transaccional real**
   - orders
   - reservations
   - invoices
   - customers
   - coupons

2. **La identidad por phone puede colisionar**
   Casos reales:
   - familias comparten número
   - secretaria/asistente hace la reserva
   - teléfono mal capturado o con formato distinto
   - cliente cambia número

3. **El reset local sugerido es muy destructivo**
   Hace `DROP TABLE ... CASCADE` + manipulación manual de tablas de migración.
   Seguro solo si DB = localhost.

4. **Se borró la rama remota `origin/devJampier55`**
   Eso va contra la preferencia explícita de Héctor de conservar ramas tras merge.

## Boundary correcto hacia futuro

### Track A — Core POS seguro
Aquí entra customer unification.
Objetivo: que el POS quede más fuerte.
No meter LLM aquí.

### Track B — Brain read-only
Sistema aparte que:
- lee datos
- responde preguntas
- genera briefings
- detecta anomalías
- no toca operación del POS

### Track C — Actions bridge
Después:
- acciones seguras
- siempre con confirmación
- usando endpoints existentes del POS

## Recomendación operacional inmediata

### Ya NO discutir si mergear o no
Eso ya pasó.
La pregunta correcta ahora es:

> **¿Cómo verificamos que el merge no rompió compatibilidad y cómo usamos esto como fundación sin mezclarlo con el brain?**

## Checklist inmediato

### A. Local machine (Héctor)
- [x] Confirmado: `.env` local apunta a `127.0.0.1`
- [ ] Ejecutar script seguro: `scripts/reset-local-customer-unification.sh`
- [ ] Ver `migration:status` en ambos servicios
- [ ] Smoke tests manuales

### B. Smoke tests mínimos
- [ ] Crear reservación
- [ ] Listar reservaciones
- [ ] Crear/editar cliente
- [ ] Crear/editar cupón
- [ ] Facturar una order
- [ ] Validar eliminación de cliente con facturas (400, no 500)

### C. Arquitectura
- [ ] No meter todavía LLM/brain dentro de este refactor
- [ ] Tratar `customers` como base de CRM/core
- [ ] Construir brain como read-only encima

## Recomendación final

**Customer unification sí. Brain mezclado aquí no.**

Esto sirve si lo entiendes como:
- base del CRM
- base de reservaciones/facturación/cupones
- base futura para marketing y briefing

Pero el siguiente paso NO es “meter agentes aquí”.
El siguiente paso es:
1. estabilizar el core
2. validar local
3. construir tools read-only encima

## Archivos relacionados
- `knowledge/decisions/2026-04-07-customer-unification-merge-boundary.md`
- `scripts/reset-local-customer-unification.sh`
- `projects/growthsuite/current-state.md`
