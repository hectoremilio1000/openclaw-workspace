# Debugging Map — POS Bot API

> Last updated: 2026-04-13

## Si falla “no te encontramos registrado como cliente”

Revisar:
- `app/bot/pipeline/stages/receive.ts`
- `app/utils/phone.ts`
- tabla `restaurants`
- fallback a `pos_auth_api/internal/tenant-phone-links/resolve`

Pregunta útil:
- ¿entró con `restaurantId` correcto?
- ¿el teléfono existe realmente en dev/prod?

## Si clasifica mal una pregunta

Revisar:
- `app/bot/pipeline/stages/classify.ts`
- `app/controllers/bot_helpers.ts`
- `/api/debug/classify?text=...`

Especialmente:
- `classifyIntent`
- `normalizeRelativeDates`
- `parseReportDatesFromText`
- `inferReportTipoFromText`

## Si toma la ruta equivocada

Revisar:
- `app/bot/pipeline/stages/route.ts`
- `app/bot/pipeline/stages/action_routes.ts`

Pregunta útil:
- ¿cayó en report, action, greeting, feedback, pos guide o fallback?

## Si responde algo raro pero el intent estaba bien

Revisar:
- `app/bot/pipeline/stages/execute.ts`
- `app/bot/reports/index.ts`
- `app/controllers/bot_helpers.ts`

Muchas veces el problema no es el classify sino:
- range mal resuelto
- helper downstream malo
- formatter LLM
- microservicio externo

## Si el brain se atraviesa donde no debe

Revisar:
- `app/bot/engine.ts`
- `app/brain/bridge.ts`
- `app/brain/router.ts`
- `app/brain/pipeline.ts`

Caso real ya visto:
- query: `cuanto vendi ayer`
- intent correcto: fecha específica
- bug: brain contestaba ventas de hoy
- fix: bypass en `bridge.ts`

## Si el reporte por fecha no cuadra con DB

No culpar al bot de inmediato. Revisar en este orden:

1. `/api/debug/classify`
   - confirmar `fecha_especifica`
2. `/api/bot/message`
   - confirmar intent final
3. `bot_helpers.ts`
   - `resolveRangeFromIntent`
   - `resolveRangeFromTypeReport`
4. `pos_order_api`
   - endpoint de reportes real
   - `type=turno` vs `periodo`
5. DB
   - query directa por fecha local (`America/Mexico_City`)

## Si RAG no responde bien

Revisar:
- `app/controllers/bot_documents_controller.ts`
- `app/bot/rag/documents.ts`
- `app/bot/rag/tfidf.ts`
- `app/bot/rag/query_rewriter.ts`
- `app/bot/rag/reranker.ts`
- `/api/debug/rag-test`

Preguntas útiles:
- ¿sí existe documento para ese restaurante?
- ¿los chunks son buenos o basura?
- ¿la query se reescribió demasiado?

## Si una acción falla

Revisar:
- `actions/<nombre>.ts`
- `actions/registry.ts`
- `actions/guardrails.ts`
- `auth/permissions.ts`
- `bot_action_logs`
- microservicio downstream real

## Rutas/debugs que más sirven

| Ruta | Para qué sirve |
|---|---|
| `/api/debug/classify` | intent, fecha y classify path |
| `/api/debug/brain/state` | ver el estado armado para brain |
| `/api/debug/brain/respond` | probar texto brain aislado |
| `/api/bot/stats/intents` | volumen, latencia, fails por intent |
| `/api/bot/stats/brain` | runs brain, domains, failures |
| `/api/bot/docs` | inspección de documentos RAG |

## Regla práctica

Cuando algo falle, distingue primero entre estas capas:
- **tenant/auth**
- **classify**
- **route**
- **execute**
- **brain**
- **downstream service**
- **DB real**

Ese corte evita perder horas culpando al LLM por bugs que en realidad viven en reportes o integraciones.
