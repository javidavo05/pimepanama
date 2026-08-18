#!/bin/bash
# Instala el comando global `pime-git` en Mac (sin sudo)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN_DIR="${HOME}/.local/bin"
BIN="${BIN_DIR}/pime-git"
LAUNCHER="$ROOT/tools/git-identity/cli.mjs"
SCRIPT="#!/bin/bash
exec node \"$LAUNCHER\" \"\$@\""

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Este instalador es para macOS."
  exit 1
fi

mkdir -p "$BIN_DIR"
chmod +x "$ROOT/tools/git-identity/Pime-Git.command"
chmod +x "$ROOT/tools/git-identity/Pime-Git-Web.command"
chmod +x "$ROOT/tools/git-identity/cli.mjs"
chmod +x "$ROOT/tools/git-identity/server.mjs"

echo "$SCRIPT" > "$BIN"
chmod +x "$BIN"

echo "✓ pime-git instalado en $BIN"
echo "✓ Doble clic menú: $ROOT/tools/git-identity/Pime-Git.command"
echo "✓ Doble clic web:  $ROOT/tools/git-identity/Pime-Git-Web.command"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo ""
  echo "Añade a ~/.zshrc si hace falta:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi
echo ""
echo "Prueba: pime-git menu"
node "$ROOT/tools/git-identity/cli.mjs" cursor-rule 2>/dev/null || true
echo "Portal web: npm run pime-git:web  →  http://localhost:3847"
echo "Cursor:     pime-git cursor-rule"
