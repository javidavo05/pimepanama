#!/bin/bash
# Instala acceso rápido a Pime Disk Recovery (Mac)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
chmod +x "$ROOT/tools/disk-recovery/server.mjs"
chmod +x "$ROOT/tools/disk-recovery/Pime-Disk-Recovery.command"
echo "✓ Pime Disk Recovery listo"
echo "  Portal: npm run disk-recovery:web  →  http://localhost:3947"
echo "  Doble clic: $ROOT/tools/disk-recovery/Pime-Disk-Recovery.command"
echo ""
echo "Escaneo profundo (opcional): brew install testdisk"
echo "Índice HFS rápido (opcional): brew install sleuthkit"
