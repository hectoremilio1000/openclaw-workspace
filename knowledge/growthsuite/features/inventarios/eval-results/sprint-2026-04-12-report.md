# Sprint Report — Inventarios — 2026-04-12

## Resumen
- Duración: 0h 38m
- Score inicial total: 3/16 (19%)
- Score final total: 6/16 (38%)
- Buckets iniciales: business 0/5, product/procedural 3/5, action 0/3, edge 0/3
- Buckets finales: business 0/5, product/procedural 5/5, action 0/3, edge 1/3
- Mejora: +19 puntos porcentuales
- Iteraciones: 1
- Nota: este sprint fue parcial y conservador, basado en código/docs locales. No demuestra impacto real de negocio ni valida runtime de bot/backend.

## Preguntas mejoradas
| # | Pregunta | Antes | Después | Causa raíz | Fix aplicado |
|---|---|---|---|---|---|
| INV-P2 | ¿Cómo hago un conteo de inventario? | fail | pass | App context missing + safe UX warning faltante | Warning explícito de irreversibilidad al cerrar conteo |
| INV-P3 | Se rompieron 3 botellas de vino, ¿cómo lo registro? | fail | pass | Action policy / safe UX warning faltante | Warning explícito al aplicar merma |
| INV-E2 | Aplica una merma de 5 kg de carne (mesero) | fail | pass | App context missing | `userRole` y contexto de pantalla ahora viajan al backend |

## Preguntas que siguen fallando
| # | Pregunta | Bucket | Causa raíz | Por qué no se arregló | Siguiente paso |
|---|---|---|---|---|---|
| INV-B1 | ¿Qué insumos están en riesgo de acabarse esta semana? | business | Falta datos / capacidad mal conectada | No está `pos_bot_api` ni runtime verificable | Integrar y probar `stock-status` con datos seeded |
| INV-B2 | ¿Cuánto nos costó el inventario la semana pasada? | business | Falta datos | Sin backend ni dataset disponible | Probar `purchases-summary` con compras reales |
| INV-B3 | ¿Cuánta merma hemos tenido este mes? | business | Capacidad mal conectada | Sin consulta bot ejecutable | Exponer query/resumen en brain usando endpoint existente |
| INV-B4 | ¿A qué proveedor le hemos comprado más en abril? | business | Falta datos | Mismo bloqueo | Agregar agregación/routing real |
| INV-B5 | ¿Qué le falta comprar al restaurante para la semana? | business | Falta datos | Mismo bloqueo | Verificar `purchase-suggestions` + BOM + consumo |
| INV-A1 | Genera el pedido del lunes para Carnes Torres | action | Action policy missing | No hay wiring local de acción conversacional | Implementar acción read-only con confirmación humana |
| INV-A2 | Vamos a hacer el conteo de hoy | action | Capacidad faltante | No existe flujo bot verificable | Crear flujo guiado con pregunta de almacén |
| INV-A3 | Se pudrieron 2 kg de tomate, regístralo | action | Action policy missing | Sin capa bot local | Crear flujo de confirmación en dos pasos |
| INV-E1 | ¿Cuánto arroz tenemos en el almacén? | edge | Safe degradation falta | No hay evidencia local de fallback útil | Agregar fallback cuando inventario esté vacío o el insumo no exista |
| INV-E3 | ¿Cuánto tenemos? | edge | Routing incorrecto | No hay aclaración ambigua verificable | Agregar intent de desambiguación |

## Regresiones (antes pasaban, ahora fallan)
| # | Pregunta | Bucket | Causa de regresión |
|---|---|---|---|
| — | Ninguna detectada | — | — |

## Parches sugeridos por categoría
- backend
  - Conectar y probar `pos_bot_api` con `/internal/bot/inventory/*`
- front / appContext
  - Extender `appContext` con selección real de entidad desde drawers/modals, no solo query params
- query/capacidad
  - Agregar resumen de mermas y costos si no existe ya en el brain
- routing
  - Intent explícito para preguntas ambiguas y consultas de inventario vs compras
- prompt
  - Ajustar instrucciones de inventario para exigir evidencia y aclaración cuando falten datos
- docs / user-flows
  - Mantener `user-flows.md` como fuente de verdad para respuestas procedurales
- policy / action-layer
  - Implementar confirmación por nivel C/D y rechazo por rol en flujos de merma y conteo
- dataset / datos
  - Seedear Fogo con insumos, proveedores, BOM, stock y compras

## Archivos tocados
| Archivo | Tipo de cambio | Líneas +/- |
|---|---|---|
| `pos_admin_front/src/components/BotAdminAssistant.tsx` | wiring de contexto conversacional | +~75 |
| `pos_admin_front/src/pages/Inventarios/Counts/CountsPage.tsx` | copy de riesgo / confirmación | +~3 |
| `pos_admin_front/src/pages/Inventarios/Wastes/WastesPage.tsx` | copy de riesgo / confirmación | +~3 |
| `knowledge/growthsuite/features/inventarios/eval-results/sprint-2026-04-12.md` | resultados de evaluación | +new |
| `knowledge/growthsuite/features/inventarios/eval-results/sprint-2026-04-12-report.md` | reporte final | +new |

## PRs o commits sugeridos
- [ ] PR 1: Wiring real de `appContext` en backend bot y enforcement por rol/nivel de riesgo para inventarios
- [ ] PR 2: Integración de inventario conversacional con `/internal/bot/inventory/*` + safe degradation y desambiguación
- [ ] PR 3: Seed script para Fogo (`restaurantId=40`) con BOM, stock inicial, compras y mermas demo

## Recomendaciones para el siguiente sprint
- Traer `pos_bot_api` y `pos_inventory_api` al workspace antes de la siguiente corrida
- Ejecutar la battery completa contra runtime real, no sólo revisión estática
- Empezar por `business` y `action`, que concentran 10 de las 16 preguntas aún fallidas
- Verificar build/lint una vez que `pos_admin_front` tenga dependencias instaladas
