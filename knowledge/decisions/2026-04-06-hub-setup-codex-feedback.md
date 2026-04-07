# Decision: Setup del knowledge hub — feedback de Codex incorporado

**Fecha:** 2026-04-06
**Estado:** Implementado
**Dueño:** Héctor
**Reviewers:** Codex (GPT-5.4 en otra Mac)

## Contexto

Después de armar la primera versión del knowledge hub centralizado en `~/.openclaw/workspace/knowledge/`, configurar symlinks para Claude Code y Codex, y documentar el setup para una segunda Mac, Codex (corriendo en la otra Mac) revisó las instrucciones y propuso 3 mejoras técnicas + 1 mejora estructural.

Esta decisión documenta:
1. Las correcciones propuestas
2. Cuáles se aceptaron y por qué
3. Cómo quedó el setup final

## Feedback de Codex y resoluciones

### ✅ ACEPTADO — `rm -rf` es peligroso, usar `mv` con backup

**Crítica:** Las instrucciones originales decían:
```bash
rm -rf .openclaw/workspace
git clone ...
```

Esto puede destruir trabajo no commiteado en la otra Mac.

**Resolución:** Cambiar a:
```bash
if [ -d ~/.openclaw/workspace ]; then
  mv ~/.openclaw/workspace ~/.openclaw/workspace.backup-$(date +%Y%m%d-%H%M%S)
fi
git clone https://github.com/hectoremilio1000/openclaw-workspace.git ~/.openclaw/workspace
```

**Archivos actualizados:**
- `scripts/setup-new-machine.sh` (nuevo, usa el patrón seguro)
- `scripts/setup-project-for-agents.sh` (recordatorio agregado)
- `knowledge/README.md` (instrucciones actualizadas)

### ✅ ACEPTADO — `git pull` puede crear merges automáticos, usar `--ff-only`

**Crítica:** Las instrucciones originales decían:
```bash
0 * * * * cd ~/.openclaw/workspace && git pull origin main
```

`git pull` por default hace merge si hay divergencia, lo que puede dejar merge commits aleatorios o conflictos silenciosos en cron.

**Resolución:** Cambiar a:
```bash
0 * * * * cd ~/.openclaw/workspace && git pull --ff-only origin main >> ~/.openclaw/sync.log 2>&1 || echo "[$(date)] sync failed" >> ~/.openclaw/sync.log
```

Características:
- `--ff-only`: solo aplica si puede fast-forward, falla ruidosamente si no
- Logs a `~/.openclaw/sync.log` para debugging
- `|| echo` previene "error loop" del cron pero deja constancia
- No hay merges automáticos sin supervisión

### ✅ ACEPTADO — Crear `knowledge/architecture/`

**Crítica:** Faltaba una carpeta para diagramas de arquitectura formales. `agent-patterns/` es para patrones reutilizables, `decisions/` para puntos en el tiempo, pero los **diseños vivos de sistemas concretos** no tenían lugar.

**Resolución:** Crear `knowledge/architecture/` con su propio README explicando la diferencia con las otras carpetas.

**Estructura:**
```
knowledge/architecture/
├── README.md
├── growthsuite/
│   ├── overview.md
│   ├── multi-tenant-isolation.md
│   ├── bot-v1-current.md
│   └── bot-v2-target.md
└── openclaw-workspace/
    └── knowledge-hub-design.md
```

### ⚠️ ACEPTADO PARCIALMENTE — Crear `projects/<proyecto>/current-state.md`

**Crítica:** Codex propuso crear `projects/growthsuite/current-state.md` como "snapshot vivo" del proyecto. Razón: el continuum entre máquinas no se resuelve solo con git, hace falta un archivo que cualquier agente lea PRIMERO para aterrizar rápido.

**Resolución:** Aceptado, pero con un matiz importante.

Codex sugirió poner `projects/` **dentro de** `knowledge/`. Yo decidí:
- `knowledge/` se queda solo para contenido **durable** (patterns, decisions, architecture, rules)
- `projects/` queda como **carpeta hermana** de `knowledge/`, no dentro

**Razón:** mezclar "estado vivo" con "knowledge durable" complica el mental model. Un current-state.md cambia cada día. Un pattern de Strangler Fig dura años. No deben estar en la misma carpeta padre.

**Estructura final:**
```
~/.openclaw/workspace/
├── knowledge/             ← durable
│   ├── agent-patterns/
│   ├── decisions/
│   ├── architecture/      ← NUEVO
│   ├── claude-rules/
│   └── claude-code-internals/
├── projects/              ← estado vivo
│   └── growthsuite/
│       └── current-state.md   ← NUEVO
├── memory/                ← daily notes
└── ...
```

## Filosofía de continuidad entre máquinas

Codex articuló muy bien el principio que aplica:

> La continuidad entre máquinas no depende de "que el agente recuerde", sino de que el conocimiento quede **escrito** en el hub y **sincronizado**.
>
> Si algo importa para continuidad, se escribe en el hub. No "lo recuerdo en mi cabeza" — eso no sobrevive a un restart de sesión ni viaja entre máquinas.

Esto se traduce en una matemática simple:

```
Desalineación entre máquinas ≤ intervalo_de_sync
```

Con cron horario: máximo 1 hora de drift entre máquinas. Aceptable.

## Anti-patterns que NO se hicieron

- ❌ Sync por iCloud/Dropbox/Syncthing — fragmentado, no versionado, sin historial
- ❌ Vaults múltiples de Obsidian para "cada cosa" — pierdes Graph view unificado
- ❌ Confiar en la memoria del agente para continuidad — no sobrevive restarts
- ❌ Sync con `git pull` sin `--ff-only` — merges fantasma en cron
- ❌ `rm -rf` en setup scripts — destruye trabajo no commiteado
- ❌ Mezclar "estado vivo" con "knowledge durable" en la misma carpeta

## Validación

Esta decisión se valida cuando:
- [x] `setup-new-machine.sh` existe y usa `mv` para backup
- [x] El cron de pull usa `--ff-only` con logging
- [x] `knowledge/architecture/` existe con README
- [x] `projects/growthsuite/current-state.md` existe con estado actual
- [x] `knowledge/README.md` actualizado con las nuevas instrucciones
- [x] Esta decisión documentada
- [ ] Probado en la Mac 2 (siguiente paso)

## Aprendizaje meta

**Lo más valioso de este episodio fue el proceso, no solo los fixes.**

Codex (otro agente, otra Mac, otro modelo) revisó críticamente lo que yo había escrito, encontró 3 problemas reales, los expuso con razón clara, y los incorporamos. Esto es exactamente cómo trabajan los equipos serios de ingeniería:

1. **Architect propone** (yo)
2. **Reviewer crítica** (Codex)
3. **Decisión consciente de aceptar/rechazar/matizar** (yo, documentando)
4. **Implementación con el feedback aplicado**
5. **Doc del decision con razones explícitas** (este archivo)

Esto se llama **Architecture Decision Record (ADR)** en la literatura. Es lo que hace Stripe, Google, Shopify para decisiones técnicas importantes.

**Regla destilada:** cuando otro agente (humano o IA) revise mi trabajo críticamente, las correcciones válidas deben capturarse en el knowledge hub como decisions, no solo aplicarse silenciosamente. Eso permite que la próxima persona/agente entienda **por qué** algo es como es, no solo **qué** es.

## Referencias

- `knowledge/README.md` — entrada principal del hub
- `scripts/setup-new-machine.sh` — script de setup seguro
- `scripts/setup-project-for-agents.sh` — script para configurar proyectos
- `projects/growthsuite/current-state.md` — snapshot vivo del proyecto principal
- `knowledge/architecture/README.md` — convenciones de docs de arquitectura
