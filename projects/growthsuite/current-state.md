# GrowthSuite — Current State

> **Snapshot vivo del proyecto.** Cualquier agente o máquina lee este archivo PRIMERO para aterrizar rápido en lo que se está construyendo, qué está bloqueado, y cuál es el siguiente paso.
>
> **Convención:** este archivo se actualiza al final de cada sesión de trabajo significativa, en cualquier máquina. Es la "memoria operativa" del proyecto.

**Última actualización:** 2026-04-06 19:10 CST (Mac 1, sesión OpenClaw Opus 4.6)
**Próxima actualización esperada:** al cerrar la próxima sesión de trabajo

## 🆕 Plan operativo activo (2026-04-06)

**Doble vía en paralelo, una por Mac:**

### Mac 1 (esta) — Testing del bot v1
Objetivo: generar dataset de 1000 preguntas categorizadas, correrlas contra el bot v1 actual, mapear hueco por hueco.
- **Plan:** [`projects/growthsuite/bot-testing/1000-question-evaluation-plan.md`](./bot-testing/1000-question-evaluation-plan.md)
- **Estado:** Plan diseñado. Próximo: generar Cat G (seguridad).

### Mac 2 (otra) — Construcción de infra del bot v2
Objetivo: poco a poco construir las capas formales del cerebro descritas en el blueprint matemático.
- **Blueprint:** [`knowledge/architecture/growthsuite/cerebro-mathematical-blueprint.md`](../../knowledge/architecture/growthsuite/cerebro-mathematical-blueprint.md)
- **Estado:** Blueprint v0.1 listo para revisión por ChatGPT (10 preguntas abiertas marcadas 🟡)
- **Primer paso real:** Track 1 #1 (G12 fix) en cuanto se confirme.

**Sincronización:** todo lo durable de ambos tracks vive en este workspace y se sincroniza vía git cron cada hora.

---

## 🎯 Visión del producto

GrowthSuite POS = sistema operativo del restaurante.
No es "POS con IA". Es una máquina que cada día:
1. Entiende el estado del restaurante
2. Detecta el cuello de botella
3. Propone acciones priorizadas
4. Ejecuta las repetibles
5. Mide el impacto

Función objetivo: maximizar `ventas + margen − merma − fuga − fricción operativa`.

Ver: `knowledge/decisions/2026-04-06-strangler-fig-approach.md`

---

## 🏗️ Estado actual del producto

### Lo que ya funciona en producción
- 30+ restaurantes activos en Railway + Vercel
- 9 backend APIs en Adonis (auth, order, cash, bot, inventory, centro, reservaciones, website, impulsobotwhats)
- 4+ frontends en Vercel (admin, comandero, cash, monitor)
- PostgreSQL en Railway: 341K órdenes, 2.4M items, 470K pagos ($493M MXN), datos desde 2017
- Bot conversacional via WhatsApp con RAG, memory, tool calling parcial

### Lo que está "casi" pero con problemas
- **POS Bot v1** → arquitectura monolítica reactiva. Cat A reportes en 59.6/100. Score completo de seguridad reprobado por G12.
- **Reservaciones** → módulo existe pero nadie lo usa (0 rows en DB)
- **Customers** → tabla con 0 rows, sin CRM real
- **Feedback** → 19 rows, sin loop cerrado
- **Stock counts** → 7 rows, inventario físico vs sistema está ciego

---

## 🔥 Foco actual (lo que se está trabajando AHORA)

### Sprint Track 1 — Mejorar bot actual (3 semanas)
**Estado:** Documento listo, no iniciado.
**Doc completo:** `~/proyectos/growthsuite/docs/bot-track-1-sprint-plan.md`
**Decisión:** `knowledge/decisions/2026-04-06-bot-track-1-sprint.md`

Tickets:
- [ ] **#1 P0** Fix G12 cross-tenant leak (BLOCKER) — 1-2 días
- [ ] #2 Reporte de cuentas abiertas (A46-50) — 1-2 días
- [ ] #3 Reporte de cancelaciones (A22-28) — 2 días
- [ ] #4 Comparativos xcut (A32-39) — 2 días
- [ ] #5 Inventario summary (A41-44) — 1 día
- [ ] #6 Reporte de meseros (A16-19) — 1-2 días
- [ ] #7 LLM tool-calling fallback en classify — 3-5 días
- [ ] #8 Auditoría RAG — 2-3 días
- [ ] #9 Tabla bot_events (Phase 0 observability) — 2-3 días
- [ ] #10 CI regression test automático — 1-2 días
- [ ] #11 Manual smoke tests script — 0.5 días

### Sprint Track 2 — Blueprint del bot v2 (paralelo, 1-2 semanas)
**Estado:** No iniciado. Pendiente luz verde para escribir el doc.
**Output esperado:** `docs/bot-v2-blueprint.md` con los 6 bloques arquitectónicos:
1. Event log unificado
2. Metrics layer (daily_metrics_by_restaurant materialized)
3. Tool registry tipado con metadata de riesgo
4. Policy Engine determinístico
5. Domain Services puros
6. Evaluator (cierra el loop de aprendizaje)

---

## 🚨 Bloqueos / riesgos críticos

### P0 — G12 cross-tenant leak
- **Qué es:** El bot responde con datos de otro restaurante cuando un user del restaurante A pregunta sobre el B.
- **Detectado:** 2026-04-06 en test suite v2 Cat G.
- **Impacto:** Compliance, posible demanda. **Bloquea cualquier otra mejora del bot.**
- **Plan:** Ticket #1 del sprint Track 1.
- **Doc:** `knowledge/decisions/2026-04-06-g12-fix-priority.md`

### P1 — POS Bot Cat A en 59.6
- **Qué es:** Los reportes operativos del bot fallan en ~40% de los casos.
- **Tests específicos rotos:** A46-A50, A22-A28, A32-A39, A41-A44, A16-A19
- **Plan:** Tickets #2 al #6 del sprint Track 1.

### P2 — No hay observabilidad
- **Qué es:** No tenemos `bot_events` table. No sabemos qué pasa dentro del bot en producción.
- **Plan:** Ticket #9 del sprint Track 1 (Phase 0 del Strangler Fig).

---

## 🎯 Próximo paso concreto

**Pendiente decisión del usuario:**

1. **Aprobar el sprint Track 1** y arrancar con el Ticket #1 (G12).
2. **O** primero generar el blueprint del bot v2 (Track 2) antes de empezar a tocar código.
3. **O** correr el test de las 1000 preguntas propuesto antes de cualquier otra cosa.

Mi recomendación: **opción 1 (Ticket #1 G12 fix)** porque el bug de seguridad es lo más urgente.

---

## 📋 Decisiones recientes (timeline)

| Fecha | Decisión | Doc |
|-------|----------|-----|
| 2026-04-06 | Strangler Fig como estrategia (no rewrite) | `knowledge/decisions/2026-04-06-strangler-fig-approach.md` |
| 2026-04-06 | G12 es P0 | `knowledge/decisions/2026-04-06-g12-fix-priority.md` |
| 2026-04-06 | Sprint Track 1 con 11 tickets | `knowledge/decisions/2026-04-06-bot-track-1-sprint.md` |
| 2026-04-06 | Knowledge hub centralizado | `knowledge/decisions/2026-04-06-hub-setup-codex-feedback.md` (próximo) |
| 2026-04-05 | Codex 5.4 como modelo default para automation | `memory/2026-04-05.md` |

---

## 🧠 Aprendizajes recientes que debes saber

- **Strangler Fig > Rewrite**: ver `knowledge/agent-patterns/strangler-fig.md`
- **Tool-calling > Keywords**: ver `knowledge/agent-patterns/tool-calling-vs-keywords.md`
- **Policy Engine separado del LLM**: ver `knowledge/agent-patterns/policy-engine.md`
- **Multi-tenant isolation no se hace en el prompt**: ver `knowledge/agent-patterns/multi-tenant-isolation.md`

---

## 🛠️ Infraestructura técnica clave

### Repos
- **Workspace knowledge:** `github.com/hectoremilio1000/openclaw-workspace` (privado, sync 2h)
- **POS code:** `~/proyectos/growthsuite/` (monorepo con `pos-app/` backends y `pos-front/` frontends)

### URLs producción (resumen — full list en TOOLS.md local)
- pos-bot-api-production.up.railway.app
- pos-auth-api-production.up.railway.app
- pos-front-admin.vercel.app
- ... (ver `TOOLS.md` que NO se sincroniza por seguridad)

### Restaurantes de prueba
- **Fogo de Chão Santa Fe (id=40)** — datos limpios, credenciales frescas, pairing `778899`
- **La Llorona 2 (id=13)** — datos reales históricos
- **Café de Tacuba (id=7)** — caso chico

### Test suite del bot
- Skill: `~/.openclaw/workspace/skills/pos-bot-test-plan/SKILL.md`
- Cron: corre cada 4h con Codex 5.4
- Categorías: A→M, rotación en `memory/bot-test-rotation-fogo.json`

---

## 📝 Cómo actualizar este archivo

**Al final de cada sesión de trabajo significativa**, edita este archivo y actualiza:
1. La fecha de "Última actualización"
2. La sección "Foco actual" (qué se está trabajando)
3. La sección "Bloqueos/riesgos" si hay cambios
4. La sección "Próximo paso concreto"
5. Tabla de "Decisiones recientes" si tomaste alguna nueva

**Después:**
```bash
cd ~/.openclaw/workspace
git add projects/growthsuite/current-state.md
git commit -m "chore(state): update growthsuite current state"
git push origin main  # o esperar al cron auto-sync de 2h
```

La otra Mac jala estos cambios en el siguiente pull (cron cada hora con `--ff-only`).

**La regla pro:** si algo importa para continuidad, se escribe en este archivo. No "lo recuerdo en mi cabeza" — eso no sobrevive a un restart de sesión ni viaja entre máquinas.
