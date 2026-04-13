# Current Capabilities — POS Bot API

> Last updated: 2026-04-13

## Sí hace (funcionando hoy)

- [x] recibir mensajes conversacionales por `/api/bot/message`
- [x] resolver restaurante por teléfono o `restaurantId`
- [x] deduplicar mensajes entrantes por `providerMessageId`
- [x] hacer debounce de mensajes consecutivos
- [x] clasificar intents con LLM/tool calling
- [x] manejar reportes operativos y financieros básicos
- [x] ejecutar varias acciones POS con state machine conversacional
- [x] guardar conversación, runs y eventos por stage
- [x] guardar feedback del usuario
- [x] cargar documentos y responder con RAG/QA
- [x] exponer rutas debug y stats
- [x] responder preguntas gerenciales vía brain

## Parcial (funciona pero con limitaciones)

| Capacidad | Qué falta | Workaround actual |
|---|---|---|
| Brain gerencial | todavía convive antes del pipeline en `engine.ts`; depende de bypasses | usar guardrails en `bridge.ts` y mover más casos al pipeline |
| Permisos por rol | existe `checkIntentPermission`, pero la identidad real del usuario por teléfono no siempre está resuelta | degradar con allow si no hay `roleId` |
| RAG | útil para manuales y contexto, pero no es un knowledge graph fuerte | subir docs buenas y usar rutas debug |
| QA informacional | mezcla contexto AI, RAG y LLM, todavía sensible a redacción | revisar `classifyPath`, confidence y docs cargados |
| Reportes | varios funcionan, pero no todos están igual de sólidos | probar siempre contra endpoint real y DB |

## No hace (gap conocido)

- [ ] router 100% “tool/data first” como producto maduro
- [ ] tool calling formal unificado para todas las acciones
- [ ] identidad fuerte usuario→rol→permisos por canal
- [ ] separación perfecta entre “brain ejecutivo” y “pipeline operacional”
- [ ] cobertura homogénea de pruebas end-to-end para todos los intents

## Riesgos activos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Brain intercepta queries estructuradas si falta bypass | P1 | mantener `shouldBypassBrain`, probar frases con fecha/rango |
| Reporte por fecha específica puede devolverse mal aunque clasificación sea correcta | P1 | validar contra DB + `pos_order_api`, no confiar solo en health 200 |
| `bot_helpers.ts` concentra demasiada lógica | P2 | seguir extrayendo a módulos por dominio |
| Dependencia de otros microservicios | P1 | validar endpoints internos y tokens antes de culpar al bot |
| Usuario no registrado por teléfono | P2 | usar `restaurantId` explícito o resolver tenant-phone-links |

## Caso real documentado

En abril 2026 se confirmó este bug real:
- DB local sí tenía ventas distintas para hoy/ayer/antier
- el bot respondía “Hoy llevas ...” para `ayer` y `antier`
- causa raíz: el brain tomaba prioridad y respondía con `state.salesToday`
- fix aplicado: bypass del brain para queries estructuradas con fecha
- bug restante: la capa de reporting por `specific_date/type=turno` todavía puede fallar abajo
