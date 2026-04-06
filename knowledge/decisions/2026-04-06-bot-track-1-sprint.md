# Decision: Sprint Track 1 del bot (3 semanas, 11 tickets)

**Fecha:** 2026-04-06
**Estado:** Documento listo, pendiente de iniciar ejecución
**Dueño:** Héctor
**Alcance:** mejoras al bot actual de GrowthSuite sin rewrite

## Contexto

Después de decidir Strangler Fig (ver `2026-04-06-strangler-fig-approach.md`), necesitamos un plan concreto para el Track 1: **mejorar el bot actual** mientras se diseña el v2 en paralelo.

El bot hoy tiene Cat A (reports) en 59.6/100. Queremos llegar a 78-82 sin tocar la arquitectura central.

## Decisión

Ejecutar un sprint de 3 semanas calendario (15 días hábiles) con 11 tickets específicos.

### Los 11 tickets

| # | Branch | Descripción | Días |
|---|--------|-------------|------|
| 1 | `hector_dev/bot-t1-01-fix-cross-tenant-g12` | 🚨 P0 G12 fix | 1-2 |
| 2 | `hector_dev/bot-t1-02-report-open-orders` | Cuentas abiertas (A46-50) | 1-2 |
| 3 | `hector_dev/bot-t1-03-report-cancellations` | Cancelaciones (A22-28) | 2 |
| 4 | `hector_dev/bot-t1-04-xcut-comparatives` | Comparativos xcut (A32-39) | 2 |
| 5 | `hector_dev/bot-t1-05-inventory-generic-report` | Inventario summary (A41-44) | 1 |
| 6 | `hector_dev/bot-t1-06-report-waiters-performance` | Meseros (A16-19) | 1-2 |
| 7 | `hector_dev/bot-t1-07-llm-classify-fallback` | LLM tool-calling fallback | 3-5 |
| 8 | `hector_dev/bot-t1-08-rag-audit` | Auditoría RAG | 2-3 |
| 9 | `hector_dev/bot-t1-09-bot-events-table` | Tabla bot_events (Phase 0 obs) | 2-3 |
| 10 | `hector_dev/bot-t1-10-ci-regression-test` | CI regression | 1-2 |
| 11 | `hector_dev/bot-t1-11-manual-tests-script` | Script smoke tests | 0.5 |

### Reglas del sprint (no-negociables)
1. 1 ticket = 1 branch = 1 PR
2. Máximo 3 días por branch (si pasa, partir el ticket)
3. Nunca push a main directo
4. Nunca `--delete-branch` al mergear
5. Feature flag obligatorio para cada cambio de lógica → rollback sin redeploy
6. DoD universal: test nuevo + score no baja + smoke test 5/5 + aprobación explícita de Héctor

### Métricas objetivo

| Métrica | Inicio | Semana 1 | Semana 2 | Semana 3 (target) |
|---------|--------|----------|----------|-------------------|
| Cat A | 59.6 | ≥65 | ≥73 | ≥78 |
| Cat B | ? | baseline | +10 | ≥85 |
| Cat G | 0 | 100 | 100 | 100 |
| Líneas classify.ts | 521 | ≤521 | ≤530 | ≤580 (no crece mucho) |
| CI regression | ❌ | ❌ | ❌ | ✅ |
| bot_events activo | ❌ | ❌ | ❌ | ✅ |

## Alternativas rechazadas

### Alternativa A: hacer todos los reports en 1 ticket grande
**Rechazada.** Viola la regla de "1 ticket = 1 slice pequeño". Un ticket grande es imposible de revertir.

### Alternativa B: saltarse la observabilidad (Ticket #9)
**Rechazada.** Sin `bot_events` no podemos saber si las mejoras del Track 1 funcionan. Es la base del Track 2 también.

### Alternativa C: matar classify.ts en el sprint
**Rechazada.** Las 521 líneas capturan 2 años de aprendizaje en casos borde. No podemos tirarlas sin tener reemplazo probado. Estrategia: usar classify.ts como primera línea + LLM como fallback.

### Alternativa D: rewrite parcial durante el sprint
**Rechazada.** El sprint es Track 1 (mejora). Track 2 (rewrite) es paralelo y arranca después.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Ticket #1 (G12) toma más de 2 días | Partir en sub-tickets, escalar a Héctor |
| Test suite baja de score en cat no-relacionada | Feature flag desactivado + revert commit |
| LLM fallback empeora latencia | Tests de performance antes del merge |
| bot_events mata performance de DB | Try/catch silencioso, insert async, no bloquear response |
| CI regression muy estricto bloquea PRs válidos | Threshold inicial bajo (75), subir gradual |

## Aprobaciones requeridas

- [ ] Héctor aprueba el plan completo
- [ ] Héctor confirma que Fogo de Chão (r40) se usa como restaurant de prueba
- [ ] Héctor confirma deploys a prod durante el sprint

Luego, por ticket:
- [ ] PR con descripción completa
- [ ] Code review de Héctor
- [ ] "LGTM" explícito antes del merge

## Referencias

- `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md` — plan detallado ticket por ticket (~20KB)
- `~/proyectos/growthsuite/CLAUDE.md` — reglas del proyecto
- `knowledge/agent-patterns/strangler-fig.md` — por qué esta estrategia
- `knowledge/decisions/2026-04-06-strangler-fig-approach.md` — decisión madre
- `knowledge/decisions/2026-04-06-g12-fix-priority.md` — detalles del P0

## Post-sprint (al cerrar)

Generar `docs/bot-track-1-sprint-report.md` con:
- Before/after de todas las métricas
- PRs mergeados con links
- Qué salió mejor/peor de lo esperado
- Qué aprendimos para el Track 2
