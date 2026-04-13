# System Map — POS Bot API

> Last updated: 2026-04-13

## Runtime

| Componente | Stack | Puerto local | URL dev/prod |
|---|---|---|---|
| `pos_bot_api` | AdonisJS 6 + Lucid ORM + PostgreSQL | 3357 | `https://pos-bot-api-dev.up.railway.app` / `https://pos-bot-api-production.up.railway.app` |
| Simulator | Node script / local harness | 5005 | local only |
| Admin front | React + Vite | 5173 | Vercel |
| OpenClaw | cron/orchestration/debug externo | — | externo al servicio |

## Endpoints públicos del servicio

Tomados de `start/routes.ts`.

### Core bot

| Método | Ruta | Controller | Uso |
|---|---|---|---|
| GET | `/` | inline | health básico |
| GET | `/api/bot/company-by-phone` | `BotController.companyByPhone` | resolver restaurante por teléfono |
| GET | `/api/bot/sales-report` | `BotController.salesReport` | reporte directo de ventas |
| POST | `/api/bot/message` | `BotMessagesController.handle` | entrada principal del bot |

### Observabilidad y contenido

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/bot/stats/intents` | agregados de intents, latencias y fallos |
| GET | `/api/bot/stats/errors` | errores recientes |
| GET | `/api/bot/stats/brain` | uso y fallos del brain |
| POST | `/api/bot/feedback` | thumbs up/down del usuario |
| GET/POST/DELETE | `/api/bot/docs*` | documentos para RAG |
| GET/POST | `/api/bot/conversations*` | recuperar o extender conversación |
| POST/GET | `/api/bot/scheduled-reports*` | suscripciones a reportes programados |

### Debug protegido

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/debug/classify` | ver output de clasificación |
| GET | `/api/debug/qa` | probar QA directo |
| GET | `/api/debug/rag-test` | probar retrieval |
| GET | `/api/debug/restaurants` | listar restaurantes debug |
| GET | `/api/debug/brain/queries` | ver estado crudo del brain |
| GET | `/api/debug/brain/state` | snapshot del estado gerencial |
| GET | `/api/debug/brain/respond` | probar respuesta brain |
| GET | `/api/debug/brain/route` | probar router del brain |

## Flujo principal

```text
channel/simulator
  -> BotMessagesController
  -> app/bot/engine.ts
  -> receiveStage
  -> tryBrainResponse (solo si no aplica bypass)
  -> classifyStage
  -> routeStage
  -> executeStage
  -> persistStage
  -> replyStage
```

## Persistencia interna importante

| Tabla/modelo | Propósito |
|---|---|
| `bot_conversations` | estado vivo por teléfono+restaurante |
| `bot_conversation_messages` | historial user/assistant |
| `bot_runs` | corrida completa por mensaje |
| `bot_run_events` | eventos por stage, latencia y errores |
| `bot_inbound_dedup` | deduplicación por provider message id |
| `bot_feedback` | utilidad percibida del usuario |
| `bot_documents` / `bot_document_chunks` | corpus RAG |
| `bot_memory` | memoria persistente útil para contexto |
| `bot_user_profiles` | señales perfiladas del usuario |
| `bot_action_logs` | rastreo de acciones ejecutadas |
| `bot_scheduled_reports` | reportes programados |

## Dependencias externas clave

| Dependencia | Para qué se usa |
|---|---|
| `pos_auth_api` | contexto AI del restaurante, resolve tenant-phone-links |
| `pos_order_api` | reportes de ventas, órdenes, cancelaciones, reopen/cancel |
| `pos_cash_api` | movimientos de caja / turno |
| `pos_inventory_api` | stock, sugerencias de compra, compras de insumos |
| PostgreSQL | conversaciones, runs, docs, memoria, feedback |
| Qdrant / embeddings | recuperación semántica para RAG |
| OpenAI/LLM provider | classify, QA, formatting, brain fallback |

## Frontera útil para otro modelo

- Si el problema es “qué quiso decir el usuario”, empieza en `classify.ts` y `bot_helpers.ts`.
- Si el problema es “por qué tomó esta ruta”, ve a `route.ts`.
- Si el problema es “por qué respondió eso”, ve a `execute.ts` y `reply.ts`.
- Si el problema es “por qué contestó como gerente”, ve a `brain/bridge.ts` y `brain/pipeline.ts`.
