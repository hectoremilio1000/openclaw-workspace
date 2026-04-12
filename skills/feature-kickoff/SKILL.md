---
name: feature-kickoff
description: Kick off implementation of a new feature in GrowthSuite. Use when starting any non-trivial feature, integration, or refactor that touches multiple files or services. Triggers on "quiero implementar", "vamos a construir", "nueva feature", "kickoff de", "plan para implementar", "cómo implementamos", "feature kickoff".
---

# Feature Kickoff

Proceso estándar para arrancar una feature nueva en GrowthSuite. Produce los documentos de contexto que Claude necesita para implementar sin inventar arquitectura.

## Por qué existe este skill

Sin kickoff, Claude improvisa: adivina el schema, duplica helpers existentes, rompe convenciones del proyecto. Este skill fuerza lectura del estado actual ANTES de escribir una sola línea de código.

## Documentos obligatorios (crear los 5 antes de implementar)

| Doc | Template | Qué captura |
|---|---|---|
| `current-capabilities.md` | `references/template-capabilities.md` | Qué puede hacer el sistema HOY relacionado con la feature |
| `system-map.md` | `references/template-system-map.md` | Archivos clave, tablas, endpoints, servicios involucrados |
| `action-layer.md` | `references/template-action-layer.md` | Acciones exactas a implementar (inputs, outputs, side effects) |
| `implementation-plan.md` | `references/template-implementation-plan.md` | Pasos ordenados, cada uno verificable, sin ambigüedad |
| `eval-battery.md` | `references/template-eval-battery.md` | Batería de preguntas para verificar que el cerebro funciona con la feature |

## Sección obligatoria en implementation-plan.md: Brain Integration

Cada `implementation-plan.md` debe incluir una sección **Brain Integration** al final (antes del checklist de commit). Esta sección conecta la feature con los tres cerebros del sistema y define el impacto medible.

### Brain Integration

#### Business Brain (estado del negocio)
- Qué variables agrega al estado del restaurante (s_t)
- Qué reglas de diagnóstico necesita
- Qué insights puede generar

#### Product Brain (conocimiento del producto)
- Qué flujos procedimentales agrega
- Qué preguntas "¿cómo hago X?" debe saber responder
- Qué pantallas/pasos del panel debe conocer
- Diferencia flujo WhatsApp vs Panel

#### Action Brain (acciones)
- Tools nuevos por nivel (A: consultar, B: sugerir, C: ejecutar seguro, D: sensible)
- Qué output genera (insight, guía, acción)
- Qué confirmaciones necesita

#### Métricas de impacto
- ΔJ (impacto en el negocio): qué mejora medible genera
- ΔP (productividad): cuánto tiempo/esfuerzo ahorra
- Cómo se mide (qué query/dato lo confirma)

---

## Eval Battery — Cómo funciona y por qué es obligatoria

### Qué es

`eval-battery.md` es la batería de preguntas que verifica que el cerebro (Business Brain, Product Brain, Action Brain) realmente funciona para esta feature — no solo "parece que funciona".

Sin eval battery, un feature puede estar "implementado" pero el cerebro no saber responder preguntas básicas de operación, no guiar al usuario correctamente, o fallar en casos borde comunes.

### 4 tipos de preguntas

| Tipo | Tag | Qué evalúa |
|---|---|---|
| Negocio | `biz` | ¿El cerebro entiende la operación de este feature? (reglas, KPIs, contexto real del restaurante) |
| Producto | `app` | ¿El cerebro sabe guiar al usuario en los flujos del panel y WhatsApp? |
| Acción | `act` | ¿El cerebro puede ejecutar las acciones correctamente? (inputs válidos, outputs esperados) |
| Borde | `edge` | ¿El cerebro maneja gracefully los casos difíciles? (datos faltantes, permisos, errores) |

### Estructura de cada pregunta

Cada fila de la batería tiene:
- **Pregunta** — lo que el usuario (o tester) pregunta al cerebro
- **Respuesta Gold** — la respuesta correcta esperada, definida antes de probar
- **Respuesta Brain** — lo que el cerebro respondió realmente (se llena al probar)
- **Pass?** — sí / no / parcial
- **Notas** — qué faltó o qué mejorar

### Regla de merge

> **Antes de mergear un feature a `dev`, la batería debe pasar al menos el 80% de las preguntas de Negocio y Producto.**
>
> Las preguntas de Acción y Borde son importantes pero no bloquean el merge — sí bloquean pasar a `main`.

### Cuándo se llena

1. **Al hacer kickoff:** se escriben las preguntas y respuestas gold (sin probar aún).
2. **Al terminar implementación:** se corre la batería y se llena Respuesta Brain + Pass.
3. **Si hay regresiones:** se agrega al bloque "Regresiones" del doc.

---

## Documentos recomendados (agregar si la feature lo amerita)

| Doc | Cuándo incluir |
|---|---|
| `user-flows.md` | Si hay UI o multi-turn conversations involucradas |
| `decision-log.md` | Si se rechazaron alternativas importantes durante el kickoff |

## Flujo del skill

### Paso 1 — Leer estado actual

Antes de crear cualquier doc, Claude debe leer:

1. `CLAUDE.md` del proyecto (reglas, arquitectura, env vars)
2. Archivos directamente relacionados con la feature (grep por keywords relevantes)
3. Schema de base de datos si la feature toca datos nuevos
4. Tests existentes si hay test suite activa

### Paso 2 — Crear `current-capabilities.md`

Usando `references/template-capabilities.md`. Responde: ¿qué existe hoy que se puede reutilizar? ¿qué gaps hay?

### Paso 3 — Crear `system-map.md`

Usando `references/template-system-map.md`. Mapea los archivos reales (con paths), tablas, endpoints. Sin inventar — solo lo que Claude verificó leyendo el código.

### Paso 4 — Crear `action-layer.md`

Usando `references/template-action-layer.md`. Lista cada acción a implementar con firma exacta, inputs/outputs tipados, side effects (DB writes, API calls, events emitidos).

### Paso 5 — Crear `implementation-plan.md`

Usando `references/template-implementation-plan.md`. Pasos numerados, cada uno con: qué archivo toca, qué cambia, cómo verificar que funcionó.

### Paso 6 — Crear `eval-battery.md`

Usando `references/template-eval-battery.md`. Escribir las preguntas y respuestas gold ANTES de implementar. No probar aún — solo definir qué se va a evaluar y cuál es el resultado correcto esperado.

### Paso 7 — Esperar aprobación

**STOP.** Presentar los 5 docs al usuario. No escribir código de producción hasta recibir OK explícito.

## Reglas de este skill

- **Nunca empezar a implementar sin los 5 docs.** Si el usuario pide "solo hazlo rápido", igual hacer los docs (pueden ser breves).
- **Los paths en system-map deben ser reales.** Verificar con Glob/Grep antes de escribir.
- **Las acciones en action-layer deben tener tipos.** No `any`, no "algo como esto".
- **El plan debe tener pasos verificables.** Cada paso termina con un comando o check que confirma que funcionó.
- **Si algo está fuera de scope, documentarlo en decision-log** — no implementarlo silenciosamente.

## Dónde guardar los docs generados

Por feature, crear carpeta:
```
~/.openclaw/workspace/features/<feature-slug>/
  current-capabilities.md
  system-map.md
  action-layer.md
  implementation-plan.md
  eval-battery.md
  user-flows.md          (opcional)
  decision-log.md        (opcional)
```

O dentro del repo si el equipo lo prefiere:
```
docs/features/<feature-slug>/
```

## Ejemplo de activación

```
Usuario: "Quiero implementar notificaciones push cuando un pedido cambia de estado"

Claude activa feature-kickoff:
1. Lee pos_order_api, bus de eventos, tablas de órdenes
2. Crea current-capabilities.md — documenta que ya hay webhooks pero no push nativo
3. Crea system-map.md — mapea order_status_controller.ts, orders table, etc.
4. Crea action-layer.md — define send_push_notification(orderId, status, deviceToken)
5. Crea implementation-plan.md — 8 pasos, cada uno verificable
6. Crea eval-battery.md — 12 preguntas con respuestas gold definidas antes de probar
7. STOP → presenta al usuario → espera OK
```
