# AGENTS.md – {{REPO_NAME}}

Einstiegspunkt für jeden Agenten (und Menschen), der in diesem Repository arbeitet.
Abschnitte mit `TODO` werden beim ersten Einsatz mit dem Skill `handoff-init` aus dem Repo befüllt.

## Projektüberblick

TODO: 3–5 Sätze – was ist dieses Repo und warum existiert es?

## Wichtige Befehle

TODO: nur Befehle, die im Repo wirklich existieren (Build, Test, Lint, Run, Deploy).

```bash
# TODO
```

## Code-Konventionen

TODO: Benennung, Struktur, Stilregeln, die im Code erkennbar sind.

## Verbotene Aktionen

- Kein `git push --force` auf geschützte Branches (`main`, `master`, `release/*`).
- Keine generierten Dateien von Hand bearbeiten – stattdessen die Quelle bzw. den Generator ändern.
- Keine Secrets, Tokens, Passwörter, Zertifikate, internen IPs oder personenbezogenen Daten committen
  oder in Doku kopieren. Nur **Orte** von Konfiguration und **Namen** von Variablen nennen.
- Keine Änderungen an Produktions-Konfiguration ohne Review.
- Keine Commits ohne ausdrücklichen Auftrag.
- TODO: repo-spezifische Verbote ergänzen.

<!-- handoff-kit:begin -->
## Handoff-Protokoll (verpflichtend für jeden Agenten)

1. **Bei Sitzungsbeginn:** `.ai/HANDOFF.md`, `.ai/REPO_OVERVIEW.md` und `.ai/LAST_CHANGES.md` lesen.
2. **Bei Sitzungsende:** `.ai/HANDOFF.md` aktualisieren (Stand, Entscheidungen, offene Punkte,
   nächste Schritte; Vorlage `.ai/HANDOFF_TEMPLATE.md`) und einen Eintrag in `.ai/LAST_CHANGES.md` ergänzen.
   Skill: `handoff-update`.
3. **Bei Architekturänderungen:** betroffene Diagramme in `.ai/diagrams/` aktualisieren. Skill: `mermaid-diagrams`.
4. **Bei wesentlichen Entscheidungen:** kurzes ADR in `.ai/decisions/` (Vorlage `.ai/decisions/TEMPLATE.md`).
5. **Vor dem Abschluss:** `.ai/scripts/check-handoff.sh` ausführen.

Agenten ohne Skill-Unterstützung lesen die Anleitung direkt in `.ai/skills/<name>/SKILL.md`.

## Verweise

- [.ai/README.md](.ai/README.md) – Index des `.ai/`-Ordners
- [.ai/REPO_OVERVIEW.md](.ai/REPO_OVERVIEW.md) – Architektur, Struktur, Konfiguration
- [.ai/LAST_CHANGES.md](.ai/LAST_CHANGES.md) – letzte Änderungen
- [.ai/HANDOFF.md](.ai/HANDOFF.md) – aktueller Stand für die nächste Person
- [.ai/decisions/](.ai/decisions/) – ADRs
- [.ai/diagrams/](.ai/diagrams/) – Mermaid-Diagramme
<!-- handoff-kit:end -->
