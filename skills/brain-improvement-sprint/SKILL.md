---
name: brain-improvement-sprint
description: "Sprint nocturno para mejorar el cerebro de GrowthSuite en un feature específico. TRIGGER: 'corre sprint nocturno', 'mejora el cerebro', 'brain sprint', 'sprint de inventario', 'sprint de 4 horas', 'overnight improvement', 'evalúa y mejora'. Este skill ejecuta un loop de evaluación y mejora continua: corre la eval-battery del feature, identifica fails, mejora tools/prompts/routing, y repite hasta alcanzar el score target o agotar el tiempo. Produce un reporte final con score antes/después y PRs sugeridos."
---

# Brain Improvement Sprint

Sprint autónomo para mejorar la inteligencia del cerebro de GrowthSuite en un feature específico. Diseñado para correr durante la noche (2-6 horas) sin supervisión humana.

## Cuándo usarlo

Cuando el usuario dice "corre sprint nocturno de [feature]" o "mejora el cerebro de [feature] por X horas".

## Inputs requeridos

1. **Feature name** — ej: "inventarios", "operacion", "reservaciones"
2. **Duración máxima** — ej: "4 horas" (default: 4h)
3. **Score target** — ej: "85% pass rate" (default: 80%)

## Paso 0 — Preparación

1. Leer los feature docs en `/Users/hectorvelasquez/.openclaw/workspace/knowledge/growthsuite/features/[feature]/`
   - `current-capabilities.md` — qué existe hoy
   - `system-map.md` — qué vive dónde
   - `action-layer.md` — qué puede hacer el brain
   - `eval-battery.md` — las preguntas de prueba con gold answers
   - `implementation-plan.md` — el plan de construcción

2. Leer el código relevante del feature en el repo de growthsuite
3. Registrar timestamp de inicio y score baseline

## Paso 1 — Evaluar (correr la battery)

Para cada pregunta en `eval-battery.md`:

1. Simular el estado del negocio (s_t^biz) usando datos reales de Fogo dev
2. Simular el contexto de app (s_t^app) si la pregunta es de admin panel
3. Ejecutar la pregunta contra el brain/bot actual
4. Comparar respuesta del brain vs gold answer
5. Asignar pass/fail por pregunta
6. Calcular score total: pass_count / total_count

Guardar resultados en: `features/[feature]/eval-results/sprint-[fecha].md`

## Paso 2 — Diagnosticar

Para cada pregunta que falló:
1. Identificar la causa raíz:
   - **Falta tool** — el brain no tiene una herramienta para responder esto
   - **Tool existe pero mal conectada** — el endpoint existe pero el brain no lo llama
   - **Falta datos** — no hay datos en dev para probar
   - **Prompt débil** — el system prompt no guía bien la respuesta
   - **Routing incorrecto** — classify.ts o el intent router no clasifica bien
   - **Safe degradation falta** — el brain inventa en vez de degradar

2. Agrupar fails por causa raíz
3. Priorizar: las causas que arreglan más preguntas van primero

## Paso 3 — Mejorar (iterar)

Para cada causa raíz, en orden de impacto:

### Si falta tool:
- Crear el tool en `pos_bot_api/app/brain/tools/` o en el pipeline relevante
- El tool debe llamar a endpoints EXISTENTES (verificar en system-map.md)
- NO crear endpoints nuevos en el backend
- Agregar tests unitarios para el tool

### Si tool mal conectada:
- Verificar que el endpoint existe (curl de prueba)
- Arreglar el import/routing en el pipeline
- Verificar que el auth (JWT/kiosk) es correcto

### Si faltan datos:
- Seedear datos en Fogo dev via API (curl con JWT admin)
- Documentar qué datos se crearon

### Si prompt débil:
- Mejorar el system prompt del brain para este dominio
- Agregar instrucciones específicas del feature
- NO cambiar el prompt global — solo agregar prompt del dominio

### Si routing incorrecto:
- Mejorar classify.ts o el intent router para este tipo de preguntas
- Agregar keywords/patterns si es regex-based
- Si es LLM-based, mejorar la descripción del tool

### Si safe degradation falta:
- Agregar fallback que responda algo útil en vez de inventar
- "No tengo esa información exacta, pero puedo decirte [X alternativa]"

## Paso 4 — Re-evaluar

Después de cada mejora:
1. Correr la battery de nuevo (solo las preguntas que fallaron)
2. Verificar que no rompió preguntas que antes pasaban (regresión)
3. Actualizar score
4. Si score >= target → pasar a Paso 5
5. Si score < target Y queda tiempo → volver a Paso 2
6. Si score < target Y no queda tiempo → pasar a Paso 5 con lo que hay

## Paso 5 — Reportar

Generar reporte final en: `features/[feature]/eval-results/sprint-[fecha]-report.md`

```markdown
# Sprint Report — [Feature] — [fecha]

## Resumen
- Duración: Xh Xm
- Score inicial: X/Y (Z%)
- Score final: X/Y (Z%)
- Mejora: +N puntos porcentuales
- Iteraciones: N

## Preguntas mejoradas
| # | Pregunta | Antes | Después | Causa raíz | Fix aplicado |
|---|---|---|---|---|---|

## Preguntas que siguen fallando
| # | Pregunta | Causa raíz | Por qué no se arregló | Siguiente paso |
|---|---|---|---|---|

## Regresiones (antes pasaban, ahora fallan)
| # | Pregunta | Causa de regresión |
|---|---|---|

## Archivos tocados
| Archivo | Tipo de cambio | Líneas +/- |
|---|---|---|

## PRs o commits sugeridos
- [ ] PR 1: [descripción]
- [ ] PR 2: [descripción]

## Recomendaciones para el siguiente sprint
-
```

## Guardrails (lo que NUNCA debe hacer el sprint)

- NO deployar a producción
- NO cambiar schemas de base de datos
- NO tocar auth/permisos globales
- NO mutar datos de nivel D/E sin confirmación
- NO editar archivos fuera del scope del feature
- NO crear endpoints nuevos en el backend (usar los existentes)
- NO hacer git push a main (solo a branches de feature)
- Si algo no está claro, dejar TODO en el reporte en vez de asumir

## Ejemplo de uso

```
Usuario: "corre sprint nocturno de inventarios por 4 horas"

Sprint inicia:
- Lee docs de features/inventarios/
- Lee código de pos_inventory_api y pos_bot_api
- Corre eval-battery: 16 preguntas → 6 pass, 10 fail (37%)
- Diagnostica: 4 faltan tools, 3 datos faltantes, 2 prompt débil, 1 routing
- Itera:
  - Crea 4 tools → re-eval → 10 pass (62%)
  - Seedea datos → re-eval → 12 pass (75%)
  - Mejora prompts → re-eval → 14 pass (87%)
- Score final: 14/16 (87%) > target 80% ✓
- Genera reporte con archivos tocados y PRs sugeridos
```
