# Decision: Customer unification merged to dev/main, but treat it as core POS foundation — not the brain

**Fecha:** 2026-04-07
**Estado:** Merged in code (`pos-app` PR #54, PR #55), pending local verification on Héctor machine
**Repos:** `pos-app`, `pos-front`
**PRs:**
- `pos-app` PR #54 — `arreglosJampier62 -> dev` (merged)
- `pos-app` PR #55 — `dev -> main` (merged)

## Contexto

Se mergeó a `dev` y `main` un refactor fuerte de customer unification:
- tabla `customers` unificada
- `orders.customer_id`
- `reservations.customer_id`
- `restaurant_invoices.customer_id`
- `coupons.customer_id`
- tabla `coupon_redemptions`

La intención del cambio sí empuja la visión de GrowthSuite (CRM, historial, reservaciones, facturación, cupones, marketing futuro), pero el cambio **toca el core transaccional del POS**. Por eso no debe tratarse como "feature del cerebro", sino como **fundación de datos del core**.

## Qué se decidió

### 1. Customer unification SÍ se acepta como dirección correcta
Porque habilita:
- identidad de cliente compartida entre órdenes, reservaciones, facturación y cupones
- base para CRM/retención/segmentación
- base futura para briefings, marketing y brain read-only

### 2. Pero NO se trata como "el cerebro"
Este cambio pertenece al **Track A — Core POS seguro**.
No es:
- LLM
- briefings
- anomalías
- actions bridge

Es una **mejora fundacional del modelo de datos del POS**.

### 3. La arquitectura futura se separa en 3 tracks

#### Track A — Core POS seguro
Toca POS vivo:
- orders
- cash
- invoices
- reservations
- customers
- coupons

Regla: cambios compatibles, rollout cuidadoso, smoke tests, cero LLM aquí.

#### Track B — Brain read-only
Sistema aparte que:
- lee datos
- responde preguntas
- genera briefings
- detecta anomalías
- no modifica el POS

Regla: puede fallar sin afectar operación. Aquí vive el fallback-first con tools.

#### Track C — Actions bridge
Llega después.
Usa endpoints existentes del POS para acciones seguras con confirmación humana.
Nunca SQL directo.

## Hallazgos críticos de la revisión

### Lo bueno
- PR #54 documenta resolución explícita de 8 issues de review
- Se corrigió conflicto con `roles_controller.ts` preservando la versión correcta de Héctor
- `orders.customer_id` es nullable → buena transición
- FKs usan `SET NULL` en lugar de `RESTRICT` → reduce rigidez de borrado
- `coupon_redemptions` separada es mejor modelo que contador inline

### Riesgos
- El cambio toca core transaccional real → riesgo operacional
- La identidad por `phone` puede colisionar en casos reales (familias, asistentes, teléfonos compartidos)
- El reset local sugerido usa `DROP TABLE ... CASCADE` + borrado manual de schemas → solo seguro para DB local, jamás Railway
- Se borró la rama remota `origin/devJampier55` durante el proceso (esto va contra la preferencia del usuario de conservar ramas tras merges)

## Decisión operativa

### Para producción
El merge quedó publicado y todos los health checks observados después del merge devolvieron HTTP 200. No hay evidencia inmediata de outage por deploy.

### Para la máquina local de Héctor
No correr los `DROP TABLE` manuales a ciegas.
Usar script seguro que:
1. verifica que la DB apunte a `localhost/127.0.0.1`
2. aborta si detecta Railway / host remoto
3. hace backup rápido opcional
4. ejecuta cleanup + migraciones
5. muestra `migration:status`

## Reglas que salen de este episodio

1. **Core data ≠ brain.** Unificación de customers es base del POS, no del LLM.
2. **Todo script destructivo debe abortar fuera de localhost.**
3. **No borrar ramas tras merges** salvo decisión explícita del usuario.
4. **Los cambios de visión deben clasificarse por track**:
   - fortalece core actual
   - construye brain read-only
   - agrega acción segura

## Próximos pasos

1. Verificación local segura en la máquina de Héctor
2. Smoke tests locales:
   - crear reservación
   - listar reservaciones
   - crear factura
   - CRUD clientes
   - CRUD cupones
3. Documento separado de boundary:
   - qué vive en core POS
   - qué vive en brain read-only
   - qué vive en actions bridge

## Referencias
- `pos-app` PR #54
- `pos-app` PR #55
- `knowledge/architecture/growthsuite/cerebro-mathematical-blueprint.md`
- `projects/growthsuite/current-state.md`
