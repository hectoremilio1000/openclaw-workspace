# OpenClaw Second Machine Setup

Esta guía existe para que otra computadora pueda clonar el workspace y quedar operativa sin depender de memoria implícita.

## Qué sí se porta con git

Sí viaja en el workspace:
- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `HEARTBEAT.md`
- `IDENTITY.md`
- `knowledge/`
- `memory/` útil para contexto histórico
- `docs/`
- `skills/`
- scripts versionados

## Qué NO se porta automáticamente

No viaja o no debe confiarse en git para esto:
- `TOOLS.md` con credenciales locales/prod
- `.env*`
- jobs del Gateway / cron ya creados en otra máquina
- servicios locales levantados manualmente
- auth/sesiones ya enlazadas (por ejemplo WhatsApp)

## Setup base

Usa el script existente:

```bash
bash ~/.openclaw/workspace/scripts/setup-new-machine.sh
```

O sigue el flujo documentado en `knowledge/README.md`.

## Después del clone, qué hacer

### 1. Validar symlinks
- `~/.claude/CLAUDE.md`
- `~/.codex/AGENTS.md`

### 2. Abrir Obsidian con el workspace

```bash
open -a Obsidian ~/.openclaw/workspace
```

Úsalo como vista de conocimiento, no como única fuente operativa.

### 3. Reponer secretos locales
Hazlo manualmente y fuera de git.

### 4. Recrear cron jobs importantes
Especialmente:
- `Fogo de Chão Demo Simulator v3 (prod+dev+local)`
- health checks
- bot test suite
- backups/context jobs si los quieres también en esa compu

Para Fogo, usa:
- `docs/fogo/cron-bootstrap.md`
- `docs/fogo/simulator-runbook.md`

## Recomendación de modelo

Para la nueva compu, mantener esta regla:
- cron / heartbeat / trabajo operacional: `openai-codex/gpt-5.4`
- no usar Opus para automatización continua

Esto ya es una decisión durable del workspace. Source operativo: `memory/2026-04-06.md`

## Fogo specifically

Si esa otra compu debe correr Fogo, asegúrate de que entienda:
- que el runtime corre `PROD -> DEV -> LOCAL`
- que `DEV` mapea `r40 -> r9`
- que `LOCAL` no necesariamente falla si hace `skip`
- que el error conocido más fuerte hoy es `order_items_route_area_id_foreign` en `DEV`

## Validación mínima post-setup

Checklist:

1. `git pull --ff-only` funciona
2. OpenClaw abre el workspace correcto
3. Codex lee las instrucciones del hub
4. El cron de Fogo existe y su payload coincide con el runbook
5. WhatsApp y otros canales, si aplican, se relincan manualmente
6. Los secretos locales se restauraron fuera de git

## Qué haría yo en el primer arranque

En la nueva compu:

1. clonar workspace
2. correr `setup-new-machine.sh`
3. abrir Obsidian
4. leer `docs/fogo/README.md`
5. recrear cron de Fogo
6. correr una validación manual del job
7. revisar output antes de confiar en que quedó productiva
