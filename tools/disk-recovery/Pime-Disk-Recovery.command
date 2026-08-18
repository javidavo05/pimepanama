#!/bin/bash
# Doble clic en Finder → Pime Disk Recovery
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
exec node tools/disk-recovery/server.mjs
