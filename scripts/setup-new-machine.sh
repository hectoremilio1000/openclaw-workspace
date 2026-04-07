#!/bin/bash
# setup-new-machine.sh
#
# Configura una Mac nueva (o limpia) para usar el knowledge hub compartido.
# Establece sync seguro con --ff-only y logging.
#
# Uso (en la máquina nueva):
#   curl -fsSL https://raw.githubusercontent.com/hectoremilio1000/openclaw-workspace/main/scripts/setup-new-machine.sh | bash
#
# O después de clonar:
#   bash ~/.openclaw/workspace/scripts/setup-new-machine.sh

set -e

REPO_URL="https://github.com/hectoremilio1000/openclaw-workspace.git"
WORKSPACE="$HOME/.openclaw/workspace"
SYNC_LOG="$HOME/.openclaw/sync.log"

echo "🔧 Setting up knowledge hub on new machine"
echo "   Workspace: $WORKSPACE"
echo "   Repo:      $REPO_URL"
echo ""

# 1. Backup si ya existe
if [ -d "$WORKSPACE" ]; then
  BACKUP="$HOME/.openclaw/workspace.backup-$(date +%Y%m%d-%H%M%S)"
  echo "⚠️  Existing workspace found. Backing up to: $BACKUP"
  mv "$WORKSPACE" "$BACKUP"
  echo "✅ Backup created"
fi

# 2. Clonar el repo
mkdir -p "$HOME/.openclaw"
echo "📥 Cloning workspace..."
git clone "$REPO_URL" "$WORKSPACE"
echo "✅ Workspace cloned"

# 3. Symlink para Claude Code
mkdir -p "$HOME/.claude"
if [ -f "$HOME/.claude/CLAUDE.md" ] && [ ! -L "$HOME/.claude/CLAUDE.md" ]; then
  echo "⚠️  ~/.claude/CLAUDE.md exists and is not a symlink. Backing up..."
  mv "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.bak-$(date +%Y%m%d-%H%M%S)"
fi
ln -sf "$WORKSPACE/knowledge/claude-rules/global.md" "$HOME/.claude/CLAUDE.md"
echo "✅ Claude Code symlink created"

# 4. Symlink para Codex
mkdir -p "$HOME/.codex"
if [ -f "$HOME/.codex/AGENTS.md" ] && [ ! -L "$HOME/.codex/AGENTS.md" ]; then
  echo "⚠️  ~/.codex/AGENTS.md exists and is not a symlink. Backing up..."
  mv "$HOME/.codex/AGENTS.md" "$HOME/.codex/AGENTS.md.bak-$(date +%Y%m%d-%H%M%S)"
fi
ln -sf "$WORKSPACE/knowledge/claude-rules/global.md" "$HOME/.codex/AGENTS.md"
echo "✅ Codex symlink created"

# 5. Sync log
mkdir -p "$(dirname "$SYNC_LOG")"
touch "$SYNC_LOG"
echo "✅ Sync log initialized at $SYNC_LOG"

# 6. Cron de pull seguro cada hora
CRON_LINE="0 * * * * cd $WORKSPACE && git pull --ff-only origin main >> $SYNC_LOG 2>&1 || echo \"[\$(date)] sync failed\" >> $SYNC_LOG"

if crontab -l 2>/dev/null | grep -q "openclaw/workspace.*git pull"; then
  echo "ℹ️  Cron job already exists for workspace sync"
else
  ( crontab -l 2>/dev/null; echo "$CRON_LINE" ) | crontab -
  echo "✅ Cron job added: pulls every hour with --ff-only and logs to $SYNC_LOG"
fi

# 7. Notas finales
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✨ Setup complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "What's configured:"
echo "  ✓ Workspace at: $WORKSPACE"
echo "  ✓ Claude Code reads from: ~/.claude/CLAUDE.md (symlink to hub)"
echo "  ✓ Codex reads from: ~/.codex/AGENTS.md (symlink to hub)"
echo "  ✓ Cron pulls every hour with --ff-only (logged to $SYNC_LOG)"
echo ""
echo "Next steps:"
echo "  1. Open Obsidian with this vault:"
echo "     open -a Obsidian $WORKSPACE"
echo ""
echo "  2. Check the current state of your projects:"
echo "     cat $WORKSPACE/projects/growthsuite/current-state.md"
echo ""
echo "  3. Read the hub README:"
echo "     cat $WORKSPACE/knowledge/README.md"
echo ""
echo "  4. (Optional) Test sync manually:"
echo "     cd $WORKSPACE && git pull --ff-only origin main"
echo ""
echo "  5. Tail the sync log to verify cron works:"
echo "     tail -f $SYNC_LOG"
echo ""
