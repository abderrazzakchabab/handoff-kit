#!/usr/bin/env bash
# Prüft die Handoff-Struktur (AGENTS.md, CLAUDE.md, .ai/) im Repo. Auch für CI geeignet.
#
# Aufruf:
#   .ai/scripts/check-handoff.sh            # Fehler -> Exit 1, Warnungen -> Exit 0
#   .ai/scripts/check-handoff.sh --strict   # auch Warnungen -> Exit 1
#
# Fehler:    fehlende Dateien, fehlender @AGENTS.md-Import, fehlende HANDOFF-Abschnitte,
#            nicht ersetzte {{PLATZHALTER}}, mögliche Secrets, .ai/ von .gitignore ignoriert
# Warnungen: offene TODOs, interne IP-Adressen, Skills nicht eingebunden,
#            HANDOFF.md älter als der letzte Code-Commit bzw. nicht mitgeändert

set -uo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

STRICT=0
case "${1:-}" in
    "")        ;;
    --strict)  STRICT=1 ;;
    -h|--help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)         printf 'unbekannte Option: %s (siehe --help)\n' "$1" >&2; exit 2 ;;
esac

errors=0
warnings=0
ok()   { printf 'ok       %s\n' "$*"; }
warn() { printf 'WARNUNG  %s\n' "$*"; warnings=$((warnings + 1)); }
err()  { printf 'FEHLER   %s\n' "$*"; errors=$((errors + 1)); }

# Doku-Dateien, die inhaltlich geprüft werden (Skills, Skripte und Vorlagen ausgenommen)
DOC_GREP_ARGS=(-rI --exclude-dir=skills --exclude-dir=scripts AGENTS.md CLAUDE.md .ai)

# --- Pflichtdateien -----------------------------------------------------------
for f in AGENTS.md CLAUDE.md .ai/README.md .ai/REPO_OVERVIEW.md .ai/LAST_CHANGES.md \
         .ai/HANDOFF.md .ai/HANDOFF_TEMPLATE.md; do
    if [ -f "$f" ]; then ok "vorhanden: $f"; else err "fehlt: $f"; fi
done

# --- CLAUDE.md importiert AGENTS.md -------------------------------------------
if [ -f CLAUDE.md ]; then
    if grep -qxF '@AGENTS.md' CLAUDE.md; then ok "CLAUDE.md importiert AGENTS.md"
    else err "CLAUDE.md enthält keine Zeile '@AGENTS.md'"; fi
fi

# --- Handoff-Protokoll in AGENTS.md -------------------------------------------
if [ -f AGENTS.md ]; then
    if grep -qF '<!-- handoff-kit:begin -->' AGENTS.md; then ok "Handoff-Protokoll in AGENTS.md"
    else warn "Handoff-Protokoll-Block fehlt in AGENTS.md"; fi
fi

# --- Abschnitte in HANDOFF.md -------------------------------------------------
if [ -f .ai/HANDOFF.md ]; then
    missing=0
    for s in "Datum / Autor / Branch" "Ziel der letzten Arbeit" "Aktueller Stand" \
             "Getroffene Entscheidungen" "Verworfene Ansätze" "Offene Punkte / bekannte Probleme" \
             "Nächste Schritte" "Relevante Dateien"; do
        if ! grep -qF "## $s" .ai/HANDOFF.md; then err "HANDOFF.md: Abschnitt fehlt: $s"; missing=1; fi
    done
    [ "$missing" -eq 0 ] && ok "HANDOFF.md: alle Abschnitte vorhanden"
fi

# --- Nicht ersetzte Platzhalter -----------------------------------------------
placeholders="$(grep -lE '\{\{[A-Z_]+\}\}' "${DOC_GREP_ARGS[@]}" 2>/dev/null || true)"
if [ -n "$placeholders" ]; then
    while IFS= read -r f; do err "nicht ersetzter Platzhalter in $f"; done <<< "$placeholders"
else
    ok "keine offenen {{PLATZHALTER}}"
fi

# --- Mögliche Secrets (nur Datei:Zeile ausgeben, nie den Treffer) -------------
SECRET_RE='AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|glpat-[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|(password|passwd|secret|token|api[_-]?key)[[:space:]]*[:=][[:space:]]*["'"'"']?[^"'"'"'[:space:]]{8,}'
secrets="$(grep -nIEio "$SECRET_RE" "${DOC_GREP_ARGS[@]}" 2>/dev/null | cut -d: -f1,2 || true)"
if [ -n "$secrets" ]; then
    while IFS= read -r loc; do err "mögliches Secret: $loc"; done <<< "$secrets"
else
    ok "keine Secret-Muster gefunden"
fi

# --- Interne IP-Adressen ------------------------------------------------------
IP_RE='(^|[^0-9])(10\.[0-9]{1,3}|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\.[0-9]{1,3}(\.[0-9]{1,3})?([^0-9]|$)'
ips="$(grep -nIE "$IP_RE" "${DOC_GREP_ARGS[@]}" 2>/dev/null | cut -d: -f1,2 || true)"
if [ -n "$ips" ]; then
    while IFS= read -r loc; do warn "mögliche interne IP-Adresse: $loc"; done <<< "$ips"
fi

# --- Offene TODOs -------------------------------------------------------------
todos="$(grep -nwF 'TODO' "${DOC_GREP_ARGS[@]}" --exclude=HANDOFF_TEMPLATE.md 2>/dev/null | wc -l | tr -d ' ')"
if [ "$todos" -gt 0 ]; then warn "$todos offene TODO-Zeile(n) (anzeigen: grep -rnw TODO AGENTS.md .ai --exclude-dir=skills)"
else ok "keine offenen TODOs"; fi

# --- Skills für Claude Code eingebunden ---------------------------------------
shopt -s nullglob
for d in .ai/skills/*/; do
    name="$(basename -- "$d")"
    link=".claude/skills/$name"
    if [ -L "$link" ] && [ -e "$link" ]; then ok "Skill eingebunden (Symlink): $name"
    elif [ -L "$link" ]; then err "Skill-Symlink ist kaputt: $link"
    elif [ -d "$link" ]; then
        if diff -rq "$d" "$link" >/dev/null 2>&1; then ok "Skill eingebunden (Kopie): $name"
        else warn "Skill-Kopie weicht von .ai/skills/$name ab: $link"; fi
    else warn "Skill nicht unter .claude/skills/ eingebunden: $name"; fi
done

# --- Git-Prüfungen ------------------------------------------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git check-ignore -q .ai/HANDOFF.md; then err ".ai/ wird von .gitignore ignoriert – muss versioniert werden"
    else ok ".ai/ wird versioniert"; fi

    last_code="$(git log -1 --format=%ct -- . ':(exclude).ai' ':(exclude).claude' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md' 2>/dev/null || true)"
    last_handoff="$(git log -1 --format=%ct -- .ai/HANDOFF.md 2>/dev/null || true)"
    if [ -z "$last_handoff" ]; then
        warn "HANDOFF.md ist noch nicht committet"
    elif [ -n "$last_code" ] && [ "$last_code" -gt "$last_handoff" ]; then
        warn "HANDOFF.md ist älter als der letzte Code-Commit"
    fi

    code_changes="$(git status --porcelain -- . ':(exclude).ai' ':(exclude).claude' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md' 2>/dev/null)"
    handoff_changed="$(git status --porcelain -- .ai/HANDOFF.md 2>/dev/null)"
    if [ -n "$code_changes" ] && [ -z "$handoff_changed" ]; then
        warn "uncommittete Code-Änderungen, aber .ai/HANDOFF.md nicht aktualisiert"
    fi
fi

# --- Ergebnis -----------------------------------------------------------------
printf '\n%d Fehler, %d Warnung(en)\n' "$errors" "$warnings"
if [ "$errors" -gt 0 ]; then exit 1; fi
if [ "$STRICT" -eq 1 ] && [ "$warnings" -gt 0 ]; then exit 1; fi
exit 0
