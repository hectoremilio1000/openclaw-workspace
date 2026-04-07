#!/bin/bash
# setup-project-for-agents.sh
#
# Configura un proyecto nuevo para que Claude Code / Codex / OpenClaw
# lean automáticamente las reglas del knowledge hub.
#
# Uso:
#   cd ~/proyectos/mi-proyecto-nuevo
#   bash ~/.openclaw/workspace/scripts/setup-project-for-agents.sh
#
# O con argumento explícito:
#   bash ~/.openclaw/workspace/scripts/setup-project-for-agents.sh ~/proyectos/mi-proyecto-nuevo

set -e

PROJECT_DIR="${1:-$(pwd)}"
HUB="$HOME/.openclaw/workspace/knowledge"
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "🔧 Setting up project for agents: $PROJECT_NAME"
echo "   Project: $PROJECT_DIR"
echo "   Hub:     $HUB"
echo ""

# 1. Verificar que el hub existe
if [ ! -d "$HUB" ]; then
  echo "❌ Knowledge hub not found at $HUB"
  echo "   Did you clone ~/.openclaw/workspace?"
  exit 1
fi

# 2. Crear CLAUDE.md en el proyecto si no existe
if [ -f "$PROJECT_DIR/CLAUDE.md" ]; then
  echo "⚠️  $PROJECT_DIR/CLAUDE.md already exists — skipping (won't overwrite)"
else
  cat > "$PROJECT_DIR/CLAUDE.md" << EOF
# CLAUDE.md — $PROJECT_NAME

> **Knowledge hub:** this project inherits global rules from Héctor's knowledge hub.
>
> Before doing anything, read:
> - \`~/.openclaw/workspace/knowledge/README.md\` — hub index
> - \`~/.openclaw/workspace/knowledge/claude-rules/global.md\` — global rules (aprobación previa, branches \`hector_dev/*\`, no push sin autorización, etc.)
> - \`~/.openclaw/workspace/knowledge/agent-patterns/\` — patterns to apply when relevant
>
> The hub syncs automatically between machines via \`github.com/hectoremilio1000/openclaw-workspace\`.

## Project-specific rules

_(Add rules specific to this project below. Global rules already apply.)_

- Branch naming: \`hector_dev/<descriptive-name>\`
- Never push to main without explicit approval
- Run tests / build before committing

## Architecture / context

_(Document the project context here as you learn it.)_

EOF
  echo "✅ Created $PROJECT_DIR/CLAUDE.md"
fi

# 3. Crear .cursorrules si Cursor se usa (opcional)
if [ ! -f "$PROJECT_DIR/.cursorrules" ]; then
  cat > "$PROJECT_DIR/.cursorrules" << EOF
# Cursor rules for $PROJECT_NAME

Read these files before responding:
- ~/.openclaw/workspace/knowledge/claude-rules/global.md
- ./CLAUDE.md

Apply all rules from the global hub: aprobación previa, branches hector_dev/*, never push without explicit approval, run tests before committing.
EOF
  echo "✅ Created $PROJECT_DIR/.cursorrules"
else
  echo "⚠️  $PROJECT_DIR/.cursorrules already exists — skipping"
fi

echo ""
# 4. Recordatorio: si configuras una segunda Máquina, NO uses rm -rf
echo ""
echo "💡 Reminder: when setting up the workspace on a SECOND machine, use:"
echo "   if [ -d ~/.openclaw/workspace ]; then"
echo "     mv ~/.openclaw/workspace ~/.openclaw/workspace.backup-\$(date +%Y%m%d-%H%M%S)"
echo "   fi"
echo "   git clone https://github.com/hectoremilio1000/openclaw-workspace.git ~/.openclaw/workspace"
echo ""
echo "   NEVER use 'rm -rf' on existing workspace — always backup first."
echo ""
echo "✨ Done! Now when you run:"
echo "   cd $PROJECT_DIR"
echo "   claude    # Claude Code reads ./CLAUDE.md + ~/.claude/CLAUDE.md (symlink to hub)"
echo "   codex     # Codex reads ~/.codex/AGENTS.md (symlink to hub)"
echo "   openclaw  # OpenClaw reads the workspace (hub is inside it)"
echo ""
echo "All agents will have the same context and rules automatically."
