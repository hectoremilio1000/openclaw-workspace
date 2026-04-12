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
4. **Eval battery disponible** — `eval-battery.md` debe existir para el feature; si no existe, el sprint no arranca y debe reportar bloqueo

## Paso 0 — Preparación

1. Leer los feature docs en `/Users/hectorvelasquez/.openclaw/workspace/knowledge/growthsuite/features/[feature]/`
   - `current-capabilities.md` — qué existe hoy
   - `system-map.md` — qué vive dónde
   - `action-layer.md` — qué puede hacer el brain
   - `eval-battery.md` — las preguntas de prueba con gold answers
   - `implementation-plan.md` — el plan de construcción

2. Si `eval-battery.md` no existe:
   - NO arrancar el sprint
   - generar reporte corto de bloqueo
   - indicar que primero hay que crear la batería con el protocolo del feature kickoff

3. Leer el código relevante del feature en el repo de growthsuite
4. Identificar primero dónde vive realmente la capacidad a mejorar:
   - query layer
   - pipeline routing / clasificación
   - state / diagnosis
   - prompt / instrucciones del dominio
   - adapter/tooling auxiliar
5. Registrar timestamp de inicio y score baseline

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
   - **Falta datos** — no hay datos suficientes o confiables para probar/responder
   - **Falta capacidad** — falta query, helper, ruta deterministic o adapter para responder esto
   - **Routing incorrecto** — classify.ts, intent router o precedencia no clasifica bien
   - **Safe degradation falta** — el brain inventa en vez de degradar útilmente
   - **Prompt débil** — el prompt del dominio no guía bien la respuesta una vez que la capacidad ya existe
   - **Capacidad existente mal conectada** — la query/adapter/tool existe pero el brain no la usa bien

2. Agrupar fails por causa raíz
3. Priorizar en este orden:
   - datos
   - capacidad/query
   - routing/clasificación
   - safe degradation
   - prompt
   - conexiones auxiliares

## Paso 3 — Mejorar (iterar)

Para cada causa raíz, en orden de impacto:

### Si faltan datos:
- Preparar datos usando el mecanismo existente más seguro para ese feature
- Opciones válidas: simulador, script, fixture, API existente, o estado dev/local ya disponible
- NO inventar datos si eso distorsiona la evaluación
- Documentar qué datos se prepararon y por qué

### Si falta capacidad:
- Resolver con la pieza correcta según la arquitectura real:
  - query
  - helper
  - ruta deterministic
  - clasificación
  - adapter/tool solo si realmente aplica
- NO asumir que todo problema se resuelve con `app/brain/tools/`
- NO crear endpoints nuevos en el backend
- Agregar tests unitarios o validación equivalente para la capacidad añadida

### Si routing incorrecto:
- Mejorar classify.ts, intent router o precedencia para ese tipo de preguntas
- Agregar patterns/subclases si aplica
- Si hay LLM routing, mejorar descripción de la capacidad, no solo el wording

### Si safe degradation falta:
- Agregar fallback que responda algo útil en vez de inventar
- Priorizar una alternativa operativa real, no una disculpa genérica

### Si prompt débil:
- Mejorar el prompt del dominio solo después de confirmar que datos, capacidad y routing ya existen
- NO cambiar el prompt global salvo instrucción explícita

### Si la capacidad existe pero está mal conectada:
- Verificar que la query/adapter/tool/endpoint ya existe
- Arreglar import, wiring o uso en el pipeline
- Verificar auth y contexto si aplica

## Paso 4 — Re-evaluar

Después de cada mejora:
1. Correr la battery de nuevo (solo las preguntas que fallaron)
2. Verificar que no rompió preguntas que antes pasaban (regresión)
3. Actualizar score
4. Si score >= target → pasar a Paso 5
5. Si score < target Y queda tiempo → volver a Paso 2
6. Si score < target Y no queda tiempo → pasar a Paso 5 con lo que hay

### Stop conditions (detener y reportar)
- El siguiente fix requiere endpoint nuevo
- El siguiente fix requiere schema change
- Aparecen 2 regresiones fuertes seguidas
- El score no es confiable por falta de datos
- El problema ya es de producto/UX, no de implementación del brain
- El feature docs contradicen el código real y falta definición humana

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
