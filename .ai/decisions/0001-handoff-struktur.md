# 0001 – Handoff-Struktur für Agenten und Teammitglieder

- **Status:** Vorgeschlagen
- **Datum:** {{DATUM}}

## Kontext

Arbeit an diesem Repo entsteht teils in KI-Agent-Sitzungen. Wissen über Stand, Entscheidungen und offene
Punkte blieb bisher in der jeweiligen Chat-Sitzung und ging für die nächste Person bzw. den nächsten Agenten verloren.

## Entscheidung

- `AGENTS.md` im Repo-Root ist der Einstiegspunkt für alle Agenten (Copilot, Codex, OpenCode u. a. lesen ihn direkt).
- `CLAUDE.md` importiert `AGENTS.md` (`@AGENTS.md`), weil Claude Code `AGENTS.md` nicht selbst liest –
  so gibt es nur eine Quelle der Wahrheit.
- `.ai/` enthält Repo-Überblick, letzte Änderungen, Handoff, Vorlage, ADRs, Mermaid-Diagramme, Skills und Skripte.
- Jeder Agent liest den Handoff zu Sitzungsbeginn und aktualisiert ihn zu Sitzungsende.
- `.ai/` wird versioniert. Doku auf Deutsch, Code-Bezeichner und Befehle unverändert.
- Die Struktur wird mit dem handoff-kit in alle Repos gleich ausgerollt.

## Konsequenzen

- **Positiv:** Sitzungsübergreifender Kontext, schnelleres Onboarding, nachvollziehbare Entscheidungen,
  gleiche Struktur in allen Repos.
- **Negativ:** Pflegeaufwand pro Sitzung; veraltete Doku, wenn das Protokoll nicht eingehalten wird
  (`check-handoff.sh` warnt dann).
