# User Flows — POS Bot API

> Last updated: 2026-04-13

## 1. Mensaje normal de bot

```text
POST /api/bot/message
  -> receiveStage valida phone/text/provider/restaurant
  -> carga conversación previa y estados activos
  -> debounce + dedup
  -> intenta brain si aplica
  -> classifyStage detecta intent y entidades
  -> routeStage decide report/action/fallback
  -> executeStage ejecuta
  -> persistStage guarda conversación y run
  -> replyStage devuelve replies[]
```

## 2. Resolución de tenant

`receiveStage` puede resolver el restaurante de dos formas:

1. directo por `restaurantId`
2. por teléfono
   - primero en tabla `restaurants`
   - si no existe, fallback a `pos_auth_api/internal/tenant-phone-links/resolve`

Si no encuentra restaurante, el flujo termina con:
- `status: ignored_no_company`
- respuesta tipo “no te encontramos registrado como cliente”

## 3. Reportes

Para reportes, el flujo típico es:

```text
text -> classifyIntent / parseReportDatesFromText
     -> inferReportTipoFromText / resolveRangeFromIntent
     -> fetchOrderApiReport / fetchCashMovements / etc.
     -> buildReportReplies
     -> persist + reply
```

Ejemplos:
- ventas totales
- ventas de fecha específica
- top productos
- mesero con más ventas
- descuentos
- cancelaciones
- movimientos de caja
- cuentas abiertas
- comparativo de ventas
- llegadas tarde
- compras de insumos

## 4. Flows con estado

Si falta información, el bot no ejecuta todavía. Guarda estado y pregunta lo que falta.

Estados visibles hoy:
- `awaiting_report_type`
- `awaiting_report_date`
- `cancelar_producto`
- `reabrir_orden`
- `cerrar_turno`
- `aplicar_descuento`
- `reporte_llegadas_tarde`
- `reporte_compras_insumos`
- `comparativo_ventas`

La serialización vive en `app/bot/dialog/dialog_manager.ts`.

## 5. RAG / documentos

Si el usuario hace una pregunta informacional o de operación del sistema:
- se pueden cargar documentos por restaurante
- se indexan en chunks
- `executeStage` puede armar contexto RAG
- el bot responde con QA grounded en documentos y/o contexto del restaurante

Esto es útil para:
- manuales operativos
- políticas del restaurante
- descripciones del negocio
- uso del panel admin

## 6. Brain gerencial

El brain es otra ruta, pensada para preguntas como:
- “cómo va el restaurante”
- “qué está raro hoy”
- “qué foco rojo ves”
- descuentos/cancelaciones/ventas en tono ejecutivo

Flujo:

```text
tryBrainResponse
  -> shouldUseBrain
  -> brainResponse
  -> buildRestaurantState
  -> diagnose
  -> deterministic response OR llm prompt OR fallback
```

### Guardrail nuevo

Desde abril 2026, `bridge.ts` hace bypass del brain para queries estructuradas con fecha/reporte/acción. Ejemplo:
- `cuanto vendi ayer`
- `cuanto vendi antier`

Esas deben caer al pipeline determinístico, no a `state.salesToday`.

## 7. Observabilidad

Cada corrida importante deja rastro en:
- `bot_runs`
- `bot_run_events`
- `bot_action_logs`
- `bot_feedback`

Esto permite medir:
- intents más comunes
- latencias por stage
- brain routes y brain failures
- feedback positivo/negativo
