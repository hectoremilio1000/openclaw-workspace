# Knowledge Hub — Héctor

> **El cerebro compartido entre Claude Code, Codex, Obsidian y mi otra Mac.**

Esta carpeta es el **source of truth** para todo el conocimiento persistente que quiero que:
- Me acompañe entre sesiones
- Se comparta entre computadoras vía git
- Lo lean automáticamente mis agentes (Claude Code, Codex)
- Sea navegable desde Obsidian (con gráficos, backlinks, etc.)

## Estructura

```
knowledge/
├── README.md                            ← este archivo
│
├── claude-code-internals/               ← aprendizajes del source de Claude Code
│   ├── README.md
│   ├── knowledge.md                     ← destilado de alto nivel
│   ├── architecture.md                  ← análisis técnico del source
│   └── patterns.md                      ← patrones extraíbles
│
├── claude-rules/                        ← reglas para mis agentes
│   ├── global.md                        ← aplica a TODOS los proyectos
│   └── per-project/
│       └── growthsuite.md               ← reglas específicas del POS
│
├── agent-patterns/                      ← patrones destilados de la práctica
│   ├── strangler-fig.md                 ← migración sin downtime
│   ├── policy-engine.md                 ← razonamiento vs control vs ejecución
│   ├── tool-calling-vs-keywords.md      ← LLM como agente real
│   └── multi-tenant-isolation.md        ← seguridad cross-tenant
│
└── decisions/                           ← decision log
    ├── 2026-04-06-g12-fix-priority.md
    ├── 2026-04-06-strangler-fig-approach.md
    └── 2026-04-06-bot-track-1-sprint.md
```

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
```bash
# 1. Clonar el workspace
cd ~
rm -rf .openclaw/workspace   # o backup si hay algo
git clone https://github.com/hectoremilio1000/openclaw-workspace.git ~/.openclaw/workspace

# 2. Symlink para Claude Code
mkdir -p ~/.claude
ln -sf ~/.openclaw/workspace/knowledge/claude-rules/global.md ~/.claude/CLAUDE.md

# 3. Symlink para Codex (si usas Codex en terminal)
# Ajustar según tu config de Codex:
# ln -sf ~/.openclaw/workspace/knowledge/claude-rules/global.md ~/.codex/instructions

# 4. Abrir Obsidian con este vault
open -a Obsidian ~/.openclaw/workspace

# 5. (Opcional) Cron de pull cada hora
( crontab -l 2>/dev/null; echo "0 * * * * cd ~/.openclaw/workspace && git pull origin main" ) | crontab -
```

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
