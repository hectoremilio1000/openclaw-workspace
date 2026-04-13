# POS Bot API

> Last updated: 2026-04-13
> Purpose: paquete corto para explicarle a otro modelo cómo está construido `pos_bot_api` hoy.

## Qué es

`pos_bot_api` es el servicio conversacional de GrowthSuite POS. Recibe mensajes, resuelve a qué restaurante pertenecen, clasifica intención, enruta a reportes/acciones/QA/RAG, persiste la conversación y devuelve una respuesta lista para canal tipo WhatsApp o simulador.

No es solo un chatbot. Es una capa de orquestación entre:
- contexto del restaurante
- flows conversacionales con estado
- reportes y acciones POS
- memoria/RAG
- un brain de manager insights
- observabilidad (`bot_runs`, `bot_run_events`, stats, feedback)

## Cómo leer este feature pack

Si se lo vas a pasar a ChatGPT, este orden funciona bien:

1. `system-map.md`
2. `user-flows.md`
3. `current-capabilities.md`
4. `action-layer.md`
5. `debugging-map.md`

## Idea arquitectónica central

Hoy existen dos capas distintas dentro del servicio:

1. **Pipeline determinístico del bot**
   - `receive -> classify -> route -> execute -> persist -> reply`
   - Resuelve reportes, acciones, QA, RAG y flows con estado.

2. **Brain de insights gerenciales**
   - capa separada bajo `app/brain/*`
   - responde preguntas gerenciales como ventas, descuentos, cancelaciones, focos rojos.

La lección importante de abril 2026 es que el brain no debe tener prioridad sobre queries estructuradas de reportes con fecha. Ya se documentó el bug real: el brain interceptaba `"cuanto vendi ayer"` y respondía ventas de hoy. El fix actual es un `bail out` en `app/brain/bridge.ts` para dejar pasar esas preguntas al pipeline normal.

## Archivos más importantes

| Archivo | Rol |
|---|---|
| `pos_bot_api/app/bot/engine.ts` | entrypoint del pipeline |
| `pos_bot_api/app/bot/pipeline/stages/receive.ts` | resolución de tenant, debounce, dedup, estados previos |
| `pos_bot_api/app/bot/pipeline/stages/classify.ts` | clasificación de intent, fechas, reportes y acciones |
| `pos_bot_api/app/bot/pipeline/stages/route.ts` | router determinístico hacia action/report/fallback |
| `pos_bot_api/app/bot/pipeline/stages/execute.ts` | ejecución real de reportes, acciones, QA, RAG, memory |
| `pos_bot_api/app/controllers/bot_helpers.ts` | utility hub, report parsing, llamadas a otras APIs |
| `pos_bot_api/app/brain/bridge.ts` | puente hacia brain y guardrail de bypass |
| `pos_bot_api/app/brain/pipeline.ts` | respuesta gerencial determinística/LLM/fallback |
| `pos_bot_api/start/routes.ts` | superficie HTTP del servicio |

## Ruta física

Estos docs quedaron en:

`/Users/hectorvelasquez/.openclaw/workspace/knowledge/growthsuite/features/pos-bot-api/`

## Qué NO asumir

- `pos_bot_api` no es todo el “brain producto” de GrowthSuite. Es el runtime conversacional principal actual.
- Muchos reportes/acciones dependen de otros servicios (`pos_order_api`, `pos_auth_api`, `pos_cash_api`, `pos_inventory_api`).
- Un `health 200` no significa que toda la lógica de reportes esté bien. Ya vimos un caso donde deploy + health estaban bien pero `specific_date/type=turno` seguía devolviendo datos incorrectos.
