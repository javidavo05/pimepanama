#!/bin/bash
# Compila pime-audio la primera vez y lo ejecuta. El binario no se commitea:
# es un artefacto de compilación y se regenera solo si falta o si cambió la
# fuente.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$DIR/pime-audio.swift"
BIN="$DIR/pime-audio"

if [ ! -x "$BIN" ] || [ "$SRC" -nt "$BIN" ]; then
  echo "→ compilando pime-audio…" >&2
  swiftc -O "$SRC" -o "$BIN"
fi

exec "$BIN" "$@"
