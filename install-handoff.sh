#!/usr/bin/env bash
# Kompatibilitäts-Wrapper: die Installation steckt in bin/handoff-kit.mjs (Node >= 18).
set -euo pipefail
command -v node >/dev/null 2>&1 || { echo "Fehler: Node.js >= 18 wird benötigt" >&2; exit 1; }
exec node "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/bin/handoff-kit.mjs" "$@"
