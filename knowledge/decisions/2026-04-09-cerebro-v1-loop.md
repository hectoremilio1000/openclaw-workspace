# Decision: El cerebro usa el loop datos→estado→diagnostico→respuesta→impacto

- **Fecha:** 2026-04-09
- **Decidido por:** Hector
- **Estado:** APROBADO

---

## Contexto

El bot actual de GrowthSuite es reactivo: pregunta → intent → query → respuesta.
No tiene estado del restaurante, no diagnostica, no sugiere, no mide impacto.
El deck promete cosas que no existen: proactividad, alertas, anomalias.

## Decision

Toda feature del cerebro debe caber en este loop:

```
datos (E) → estado (s_t) → diagnostico (b_t) → respuesta (o_t) → impacto (ΔJ_t)
```

Si algo no cabe en una de estas 5 cajas, no se construye.

## Implicaciones tecnicas

| Caja | Implementacion | Responsable |
|------|----------------|-------------|
| Datos | `business_events` table + cron backfill | Jampier |
| Estado | `daily_metrics` + `buildRestaurantState()` | Jampier |
| Diagnostico | reglas de anomalia en `app/brain/rules/` | Jampier |
| Respuesta | `brainResponse()` con LLM + tools | Hector |
| Impacto | `logBrainInteraction()` + metricas dia siguiente | Ambos |

## Que se descarto

- **LLM como cerebro completo desde el inicio:** demasiado riesgo de respuestas bonitas sin base
- **ML/aprendizaje desde el inicio:** no hay dataset aun
- **Rewrite completo del bot:** se usa Strangler Fig, coexisten viejo y nuevo

## Reglas derivadas

1. Primero verdad estructurada (datos+estado), despues LLM
2. El LLM es sintetizador/router/explicador, NO la verdad del negocio
3. Lo aprendido conviene para clasificacion, forecasting, anomalias, priorizacion
4. Lo determinístico protege: permisos, validacion, multi-tenant, ejecucion sensible
5. Empezar a loguear interacciones desde dia 1 para futuro ML

## Documentos de referencia

- `knowledge/architecture/growthsuite/roadmap-cerebro-v1.md`
- `knowledge/architecture/growthsuite/cerebro-mathematical-blueprint.md`
- `knowledge/architecture/growthsuite/cerebro-database-diagram.md`
