#!/bin/bash
# Doble clic en Finder → menú Pime Git (Mac)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PIME_GIT_ROOT="$ROOT"
cd "$ROOT"
exec node tools/git-identity/cli.mjs menu
