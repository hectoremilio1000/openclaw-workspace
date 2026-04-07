# Knowledge Hub — Héctor

> **El cerebro compartido entre Claude Code, Codex, Obsidian y mi otra Mac.**

Esta carpeta es el **source of truth** para todo el conocimiento persistente que quiero que:
- Me acompañe entre sesiones
- Se comparta entre computadoras vía git
- Lo lean automáticamente mis agentes (Claude Code, Codex)
- Sea navegable desde Obsidian (con gráficos, backlinks, etc.)

## Estructura

```
~/.openclaw/workspace/
│
├── knowledge/                            ← conocimiento DURABLE
│   ├── README.md                         ← este archivo
│   │
│   ├── claude-code-internals/            ← aprendizajes del source de Claude Code
│   │   ├── README.md
│   │   ├── knowledge.md
│   │   ├── architecture.md
│   │   └── patterns.md
│   │
│   ├── claude-rules/                     ← reglas para mis agentes
│   │   ├── global.md                     ← aplica a TODOS los proyectos (symlink target)
│   │   └── per-project/
│   │       └── growthsuite.md
│   │
│   ├── agent-patterns/                   ← patrones reutilizables atemporales
│   │   ├── strangler-fig.md
│   │   ├── policy-engine.md
│   │   ├── tool-calling-vs-keywords.md
│   │   └── multi-tenant-isolation.md
│   │
│   ├── architecture/                     ← diseños vivos de sistemas concretos
│   │   ├── README.md
│   │   └── growthsuite/
│   │
│   └── decisions/                        ← ADRs (Architecture Decision Records)
│       ├── 2026-04-06-g12-fix-priority.md
│       ├── 2026-04-06-strangler-fig-approach.md
│       ├── 2026-04-06-bot-track-1-sprint.md
│       └── 2026-04-06-hub-setup-codex-feedback.md
│
├── projects/                             ← ESTADO VIVO de proyectos activos
│   └── growthsuite/
│       └── current-state.md              ← ⭐ LEER PRIMERO al retomar el proyecto
│
├── memory/                               ← daily notes (no durable)
│   ├── YYYY-MM-DD.md
│   └── model-playbook.md
│
├── skills/                               ← skills custom (porabledos)
└── scripts/
    ├── setup-new-machine.sh              ← setup automatizado
    └── setup-project-for-agents.sh       ← configurar un proyecto nuevo
```

### Diferencia clave: knowledge/ vs projects/ vs memory/

| Carpeta | Naturaleza | Frecuencia de cambio | Ejemplo |
|---------|------------|---------------------|---------|
| **`knowledge/`** | Durable | Meses/años | Strangler Fig pattern |
| **`projects/`** | Estado vivo | Diario/semanal | current-state.md de growthsuite |
| **`memory/`** | Notas diarias | Cada sesión | 2026-04-06.md, daily notes |

**Regla:** si algo importa para continuidad entre máquinas/sesiones, va en `knowledge/` o `projects/`. Si es una nota volatil de hoy, va en `memory/`.

## Cómo lo leen mis agentes

### Claude Code (cualquier sesión)
```bash
~/.claude/CLAUDE.md → symlink → ~/.openclaw/workspace/knowledge/claude-rules/global.md
```

Cuando arranco Claude Code en cualquier carpeta, lee automáticamente las reglas globales desde este hub.

### Claude Code en proyectos específicos
El proyecto tiene su propio `CLAUDE.md` que referencia este hub:
```
Para contexto adicional, lee:
- ~/.openclaw/workspace/knowledge/claude-rules/per-project/<proyecto>.md
- ~/.openclaw/workspace/knowledge/decisions/
- ~/.openclaw/workspace/knowledge/agent-patterns/
```

### Codex / otros agentes en terminal
Mismo truco: el `~/.codex/instructions` (o el equivalente) hace symlink a `global.md`. Las reglas son las mismas.

### Obsidian
El vault de Obsidian ES `~/.openclaw/workspace`. Entro con:
```bash
open -a Obsidian ~/.openclaw/workspace
```
Y todas las notas de `knowledge/` aparecen en el Graph View con backlinks automáticos.

### Yo desde VS Code
Abro `~/.openclaw/workspace/` como folder. Es navegable como cualquier repo.

## Cómo sincroniza entre computadoras

El workspace completo está en git: **`github.com/hectoremilio1000/openclaw-workspace`** (privado).

### Auto-sync (configurado hoy)
- Cron cada 2h corre en Codex 5.4 (aislado)
- Hace `git add -A && git commit && git push`
- Antes de commitear, escanea por secrets — aborta si detecta credenciales
- Ver: `~/.openclaw/workspace/memory/cron-jobs.md` o la lista de cron jobs en OpenClaw

### En la otra computadora (setup inicial, una sola vez)

**✅ Recomendado: usar el script automatizado**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/hectoremilio1000/openclaw-workspace/main/scripts/setup-new-machine.sh)
```

O si ya tienes el repo clonado:
```bash
bash ~/.openclaw/workspace/scripts/setup-new-machine.sh
```

**O manualmente con las buenas prácticas (incorporando feedback de Codex 2026-04-06):**
```bash
# 1. Backup si ya existe (NUNCA usar rm -rf)
if [ -d ~/.openclaw/workspace ]; then
  mv ~/.openclaw/workspace ~/.openclaw/workspace.backup-$(date +%Y%m%d-%H%M%S)
fi

# 2. Clonar el workspace
mkdir -p ~/.openclaw
git clone https://github.com/hectoremilio1000/openclaw-workspace.git ~/.openclaw/workspace

# 3. Symlink para Claude Code
mkdir -p ~/.claude
ln -sf ~/.openclaw/workspace/knowledge/claude-rules/global.md ~/.claude/CLAUDE.md

# 4. Symlink para Codex
mkdir -p ~/.codex
ln -sf ~/.openclaw/workspace/knowledge/claude-rules/global.md ~/.codex/AGENTS.md

# 5. Cron seguro de pull cada hora con --ff-only y logging
( crontab -l 2>/dev/null; echo '0 * * * * cd ~/.openclaw/workspace && git pull --ff-only origin main >> ~/.openclaw/sync.log 2>&1 || echo "[$(date)] sync failed" >> ~/.openclaw/sync.log' ) | crontab -

# 6. Abrir Obsidian con este vault
open -a Obsidian ~/.openclaw/workspace
```

**Por qué estas reglas (vs versión anterior):**
- `mv` en lugar de `rm -rf`: nunca destruyes trabajo no commiteado
- `--ff-only` en el pull: nunca merges automáticos sin supervisión
- Logging del sync: si falla, queda registro en `~/.openclaw/sync.log`
- `|| echo`: previene cron error loops sin perder visibilidad

Ver el ADR completo en: `knowledge/decisions/2026-04-06-hub-setup-codex-feedback.md`

Setup total en la otra compu: **30 segundos**.

### Trabajo diario (ambas computadoras)
- Tú editas / Claude Code escribe en `knowledge/`
- Cada 2h (o manual) → commit + push
- La otra compu hace pull automático (cron cada hora)
- Ambas convergen

## Cómo agregar conocimiento nuevo

### Cuando aprendes un patrón
```bash
echo "..." > ~/.openclaw/workspace/knowledge/agent-patterns/<nombre>.md
```
O le dices a Claude Code:
> "Guarda este patrón en knowledge/agent-patterns/ como <nombre>.md"

### Cuando tomas una decisión arquitectónica importante
```bash
touch ~/.openclaw/workspace/knowledge/decisions/YYYY-MM-DD-<slug>.md
```
Formato: contexto, decisión, alternativas rechazadas, validación, referencias.

### Cuando aprendes algo estudiando código externo
```bash
# Carpeta nueva bajo claude-code-internals/ o crear una hermana:
mkdir knowledge/<nombre-del-proyecto>-internals/
# Agregar README.md + archivos de análisis
```

### Cuando quieres una regla para todos los proyectos
Editar `knowledge/claude-rules/global.md`. Como es un symlink, el cambio se propaga automáticamente a Claude Code.

### Cuando quieres una regla solo para un proyecto
Crear/editar `knowledge/claude-rules/per-project/<proyecto>.md` y referenciarlo desde el `CLAUDE.md` del repo de ese proyecto.

## Qué NO meter aquí

- ❌ Credenciales (passwords, API keys, secrets) — esas van en `TOOLS.md` que NO se sincroniza
- ❌ Código ejecutable grande — eso vive en su propio repo
- ❌ Datos binarios — esto es Markdown-first
- ❌ `node_modules`, archivos generados, `.env`

## Filosofía

Este hub es **mi segunda memoria**. Cada conversación que vale la pena termina con algo agregado aquí:
- Un patrón nuevo
- Una decisión
- Una lección
- Una referencia

Con el tiempo, este hub se convierte en mi **experiencia acumulada** — algo que ni Claude ni Codex pueden tener por sí mismos, pero que yo les doy gratis en cada sesión.

**Regla de oro:** si algo vale la pena recordarlo en 3 meses, escríbelo aquí.
