#!/usr/bin/env bash
# Rendert bzw. prüft alle Mermaid-Diagramme in .ai/diagrams/*.mmd mit der Mermaid CLI (mmdc).
#
# Aufruf:
#   .ai/scripts/render-diagrams.sh           # .svg neben jede .mmd schreiben
#   .ai/scripts/render-diagrams.sh --check   # nur prüfen, nichts schreiben
#
# Umgebung:
#   HANDOFF_MMDC   Befehl statt "mmdc", z. B. "npx -y @mermaid-js/mermaid-cli@11.4.2"
#
# Exit-Codes: 0 ok, 1 mindestens ein Diagramm fehlerhaft, 2 falscher Aufruf, 3 mmdc nicht verfügbar

set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/.ai/diagrams"
CHECK=0

case "${1:-}" in
    "")        ;;
    --check)   CHECK=1 ;;
    -h|--help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)         printf 'unbekannte Option: %s (siehe --help)\n' "$1" >&2; exit 2 ;;
esac

if [ -n "${HANDOFF_MMDC:-}" ]; then
    IFS=' ' read -r -a MMDC <<< "$HANDOFF_MMDC"
elif command -v mmdc >/dev/null 2>&1; then
    MMDC=(mmdc)
else
    printf 'mmdc (Mermaid CLI) nicht gefunden.\n' >&2
    printf 'Installieren: npm install -g @mermaid-js/mermaid-cli\n' >&2
    printf 'oder einmalig: HANDOFF_MMDC="npx -y @mermaid-js/mermaid-cli@11.4.2" %s\n' "$0" >&2
    exit 3
fi

shopt -s nullglob
files=("$DIR"/*.mmd)
if [ "${#files[@]}" -eq 0 ]; then
    printf 'keine .mmd-Dateien in %s\n' "$DIR"
    exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fail=0
for f in "${files[@]}"; do
    name="$(basename -- "$f" .mmd)"
    if [ "$CHECK" -eq 1 ]; then out="$tmp/$name.svg"; else out="$DIR/$name.svg"; fi
    if "${MMDC[@]}" -q -i "$f" -o "$out" >"$tmp/$name.log" 2>&1; then
        printf 'ok      %s.mmd\n' "$name"
    else
        printf 'FEHLER  %s.mmd\n' "$name"
        sed 's/^/        /' "$tmp/$name.log"
        fail=1
    fi
done

exit "$fail"
