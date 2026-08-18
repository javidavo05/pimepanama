#!/bin/bash
# Doble clic en Finder → portal web Pime Git (Mac)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT="${PIME_GIT_PORT:-3847}"
open "http://localhost:${PORT}" 2>/dev/null || true
exec node tools/git-identity/server.mjs
