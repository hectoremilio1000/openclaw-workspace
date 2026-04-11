# GrowthSuite — Indice de Arquitectura

> **Leeme primero.** Este archivo te dice que leer segun lo que necesitas.
> Si eres Jampier y es tu primera vez: lee en el orden que aparecen.

---

## Documentos disponibles

### 1. Vision de producto
| Archivo | Que responde |
|---------|-------------|
| **growthsuite-one-shell.md** | Como se ve GrowthSuite como producto unificado (1 app, 5 workspaces) |

### 2. Cerebro (IA)
| Archivo | Que responde |
|---------|-------------|
| **roadmap-cerebro-v1.md** | Que construir, en que orden, quien hace que (BRUJULA MAESTRA) |
| **cerebro-mathematical-blueprint.md** | La teoria detras del loop datos→estado→diagnostico→respuesta→impacto |
| **cerebro-database-diagram.md** | ERD, tablas nuevas, SQL de migraciones, flujo entre servicios |
| **roadmap-visual-linear.md** | Gantt de 6 semanas, boards estilo Linear, dependencias |
| **cerebro-evaluation-frame.md** | Marco obligatorio para evaluar si el cerebro está bien planteado, si mejora al baseline y si respeta el loop/capas |

### 3. UX / Frontend
| Archivo | Que responde |
|---------|-------------|
| **growthsuite-one-shell.md** (seccion 3-12) | Layout, dock, workspaces, Home, tablet vs desktop, permisos por rol |

---

## Orden de lectura recomendado

### Si eres el CEO (Hector)
1. `growthsuite-one-shell.md` — la vision completa
2. `roadmap-cerebro-v1.md` — que sigue
3. `cerebro-evaluation-frame.md` — como validar que el cerebro sí se comporte como se acordó
4. `roadmap-visual-linear.md` — timeline

### Si eres el CTO (Jampier)
1. `roadmap-cerebro-v1.md` — tu brujula de trabajo
2. `cerebro-evaluation-frame.md` — qué se considera un cerebro correcto vs un baseline generalista
3. `cerebro-database-diagram.md` — las tablas que vas a crear
4. `roadmap-visual-linear.md` — tus dependencias
5. `growthsuite-one-shell.md` — para entender por que se pide lo que se pide

### Si eres un agente de IA (Claude Code / Codex)
1. Lee `roadmap-cerebro-v1.md` para entender prioridades
2. Lee `cerebro-evaluation-frame.md` para validar loop, capas, baseline y comportamiento esperado
3. Antes de cualquier PR, responde las 3 preguntas del checklist (seccion 7)
4. Si vas a tocar DB, consulta `cerebro-database-diagram.md`
5. Si vas a tocar UI, consulta `growthsuite-one-shell.md`

---

## Regla de actualizacion

Cuando un documento cambie significativamente, actualiza este README.
Cuando se agregue un documento nuevo, agregalo a la tabla correspondiente.
