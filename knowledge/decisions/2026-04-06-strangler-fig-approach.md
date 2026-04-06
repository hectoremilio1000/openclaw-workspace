# Decision: Strangler Fig para migrar el bot de GrowthSuite

**Fecha:** 2026-04-06
**Estado:** Aprobado — no iniciado aún
**Dueño:** Héctor
**Alcance:** refactor del bot de `~/proyectos/growthsuite/pos-app/pos_bot_api`

## Contexto

El bot actual es un pipeline monolítico reactivo:
```
receive → classify → route → execute → reply → persist
```

- `classify.ts`: 521 líneas de keywords/regex hardcodeadas
- `execute.ts`: 1,199 líneas
- `action_routes.ts`: 553 líneas
- 14 actions en registry plano
- Total: 3,429 líneas en el pipeline

**Problema:** la arquitectura está diseñada para "entender comando → ejecutar". La visión del producto es "saber qué debe hacer el restaurante hoy → empujarlo" (proactivo, multi-dominio).

Agregar marketing, reservaciones, CRM, etc. sobre esta arquitectura requeriría +500 líneas en classify por dominio, +800 en execute, y progresivamente se vuelve Frankenstein.

## Decisión

**NO hacer rewrite.** Usar Strangler Fig para migrar pieza por pieza.

Ver pattern completo en `knowledge/agent-patterns/strangler-fig.md`.

### Las 5 reglas aplicadas a este caso
1. **Crear `app/bot_v2/`** paralelo a `app/bot/`. No tocar el viejo.
2. **Feature flags** por acción y por restaurante. Rollback en 1 segundo vía env vars de Railway.
3. **Shadow mode obligatorio** ≥7 días antes de activar para usuarios reales.
4. **Migrar por acción individual**, de menor a mayor riesgo.
5. **Sunset del viejo** solo después de 30+ días estables.

## Alternativas rechazadas

### Alternativa A: Rewrite completo en 1 trimestre
**Rechazada.**
- 70% de los rewrites fracasan (Spolsky, Fowler)
- 30+ restaurantes en producción tocando dinero real
- Perderíamos 2 años de conocimiento implícito en classify.ts
- No hay forma de detener la producción

### Alternativa B: Seguir agregando features al bot actual
**Rechazada.**
- La arquitectura no soporta proactividad
- Cada feature nueva empeora la mantenibilidad
- Score Cat A estancado en 59.6/100
- No permite Daily Briefing, marketing, reservaciones

### Alternativa C: Bot v2 desde cero sin migración gradual
**Rechazada.**
- Misma razón que A
- Imposible testear con tráfico real antes del cutover
- Regresiones masivas inevitables

## Estrategia en fases

### Track 1 (3 semanas) — Mejorar bot actual
Ver `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md`.

Objetivo: Cat A 59.6 → 78-82, arreglar G12, sentar bases de observabilidad.

### Track 2 (paralelo, 1-2 semanas docs) — Blueprint bot v2
Ver `knowledge/decisions/2026-04-06-bot-track-1-sprint.md` (pending sibling: `bot-v2-blueprint.md`).

Objetivo: documentar los 6 bloques arquitectónicos antes de escribir código del v2.

### Track 3 (4-6 meses) — Migración real
Acción por acción, empezando por las read-only de menor riesgo.

## Costos aceptados

- Mantener 2 codebases en paralelo durante 4-6 meses
- Tests duplicados temporalmente
- Más superficie de code review
- Bugs del viejo se arreglan ahí (no en el nuevo) hasta que esa acción esté migrada

## Validación

La decisión se valida cuando:
- [ ] Track 1 llega a Cat A ≥ 78
- [ ] G12 arreglado (Cat G = 100)
- [ ] Feature flags funcionando en producción
- [ ] Infraestructura shadow mode operativa
- [ ] Al menos 1 acción migrada a v2 corriendo en shadow con ≥95% match rate

## Riesgos identificados

| Riesgo | Mitigación |
|--------|-----------|
| Feature flags mal configurados | Tests automáticos del sistema de flags |
| Bug en v2 pasa a producción | Shadow mode obligatorio 7 días |
| Divergencia de comportamiento entre v1 y v2 | Comparación automática en `shadow_comparisons` |
| Equipo pierde foco con 2 codebases | Priorizar siempre v1 para fixes críticos |
| Cutover final difícil | Hacer cutover gradual, 1 tenant a la vez |

## Referencias

- `knowledge/agent-patterns/strangler-fig.md` — pattern completo
- `knowledge/agent-patterns/policy-engine.md` — arquitectura del v2
- `knowledge/agent-patterns/tool-calling-vs-keywords.md` — cambio de routing
- `knowledge/agent-patterns/multi-tenant-isolation.md` — seguridad del v2
- `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md` — sprint Track 1
- `~/proyectos/growthsuite/CLAUDE.md` — reglas del proyecto
