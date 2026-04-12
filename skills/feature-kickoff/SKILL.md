---
name: feature-kickoff
description: Kick off implementation of a new feature in GrowthSuite. Use when starting any non-trivial feature, integration, or refactor that touches multiple files or services. Triggers on "quiero implementar", "vamos a construir", "nueva feature", "kickoff de", "plan para implementar", "cómo implementamos", "feature kickoff".
---

# Feature Kickoff

Proceso estándar para arrancar una feature nueva en GrowthSuite. Produce los documentos de contexto que Claude necesita para implementar sin inventar arquitectura.

## Por qué existe este skill

Sin kickoff, Claude improvisa: adivina el schema, duplica helpers existentes, rompe convenciones del proyecto. Este skill fuerza lectura del estado actual ANTES de escribir una sola línea de código.

## Documentos obligatorios (crear los 4 antes de implementar)

| Doc | Template | Qué captura |
|---|---|---|
| `current-capabilities.md` | `references/template-capabilities.md` | Qué puede hacer el sistema HOY relacionado con la feature |
| `system-map.md` | `references/template-system-map.md` | Archivos clave, tablas, endpoints, servicios involucrados |
| `action-layer.md` | `references/template-action-layer.md` | Acciones exactas a implementar (inputs, outputs, side effects) |
| `implementation-plan.md` | `references/template-implementation-plan.md` | Pasos ordenados, cada uno verificable, sin ambigüedad |

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

### Paso 6 — Esperar aprobación

**STOP.** Presentar los 4 docs al usuario. No escribir código de producción hasta recibir OK explícito.

## Reglas de este skill

- **Nunca empezar a implementar sin los 4 docs.** Si el usuario pide "solo hazlo rápido", igual hacer los docs (pueden ser breves).
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
6. STOP → presenta al usuario → espera OK
```
