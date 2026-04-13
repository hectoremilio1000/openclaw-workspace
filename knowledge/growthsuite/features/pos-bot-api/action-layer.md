# Action Layer — POS Bot API

> Last updated: 2026-04-13
> Niveles de riesgo: A (solo lectura) → E (irreversible, dinero real)

## Nivel A — Solo lectura

| Acción | Ruta lógica | Reversible |
|---|---|---|
| Consultar ventas | reportes en `reports/index.ts` + `bot_helpers.ts` | N/A |
| Ver descuentos/cancelaciones | reportes | N/A |
| Ver movimientos de caja | reportes | N/A |
| Ver cuentas abiertas | reportes | N/A |
| Ver top productos / top mesero | reportes | N/A |
| Consultar docs cargados / RAG | `bot_documents_controller` / `rag/*` | N/A |
| Preguntas gerenciales al brain | `brain/*` | N/A |

## Nivel B — Escribe pero reversible

| Acción | Handler | Cómo revertir |
|---|---|---|
| Guardar feedback | `bot_feedback_controller.ts` | borrar registro/manual DB |
| Guardar conversación y runs | `persistStage` | cleanup manual si hiciera falta |
| Guardar memoria de usuario | `memory/*` | editar/borrar memoria |
| Subir documentos RAG | `bot_documents_controller.upload` | `DELETE /api/bot/docs/:id` |

## Nivel C — Escribe con efectos secundarios menores

| Acción | Handler | Efecto secundario |
|---|---|---|
| Programar reportes | `bot_scheduled_reports_controller.ts` | notificaciones/reenvíos futuros |
| Sugerencias de contexto AI | `queueAuthApiRestaurantAiSuggestion` | crea recomendación pendiente en auth/context |
| Actualizar perfil inferido del usuario/restaurante | `user_profile.ts` | contexto futuro cambia |

## Nivel D — Toca dinero / inventario (requiere guardrails)

| Acción | Módulo | Validaciones requeridas |
|---|---|---|
| Aplicar descuento | `actions/apply_discount.ts` | permisos, monto, contexto correcto |
| Cancelar producto | `actions/cancel_product.ts` | permisos, cuenta/ítem correcto |
| Reabrir orden | `actions/reopen_order.ts` | permisos, orden válida |
| Cerrar turno | `actions/close_shift.ts` | permisos, turno correcto |
| Reporte de compras de insumos | `actions/supplies_purchases_report.ts` | rango y tenant correctos |
| Estado de inventario / stock | `actions/stock_status_report.ts` | tenant y servicio inventory |
| Sugerencia de compra | `actions/purchase_suggestions.ts` | inventory disponible |
| Generar pedido a proveedor | `actions/generate_supplier_order.ts` | datos completos, validación previa |

## Nivel E — Irreversible / crítico

| Acción | Riesgo | Quién debería ejecutarlo |
|---|---|---|
| Cancelaciones o descuentos con impacto económico real | toca operación y dinero | owner/manager con permiso explícito |
| Cerrar turno en producción | altera caja/operación | rol autorizado |
| Cualquier acción futura con write externo no idempotente | riesgo operativo | policy engine + permisos |

## Notas prácticas

- El registro de acciones vive en `app/bot/actions/registry.ts`.
- El guardrail de permisos vive en `app/bot/auth/permissions.ts`.
- No todas las acciones están igual de “production-grade”; algunas ya son flows serios, otras siguen siendo evolución iterativa.
- Para auditar una acción concreta, sigue este orden:
  1. `classify.ts`
  2. `route.ts`
  3. handler en `actions/*`
  4. helper real en `bot_helpers.ts`
  5. microservicio downstream
