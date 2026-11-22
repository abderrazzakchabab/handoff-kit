# .ai/ – Handoff-Ordner

Gemeinsamer Kontext für Menschen und KI-Agenten. Einstieg und Protokoll: [`../AGENTS.md`](../AGENTS.md).
Dieser Ordner wird **versioniert** und darf nicht in `.gitignore` stehen.

| Datei / Ordner | Zweck |
| --- | --- |
| [REPO_OVERVIEW.md](REPO_OVERVIEW.md) | Zweck, Architektur, Struktur, Konfiguration, Einschränkungen |
| [LAST_CHANGES.md](LAST_CHANGES.md) | Änderungen nach Thema, neueste zuerst |
| [HANDOFF.md](HANDOFF.md) | Aktueller Stand für die nächste Person / den nächsten Agenten |
| [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md) | Leere Vorlage für HANDOFF.md |
| [decisions/](decisions/) | ADRs, eine Datei pro Entscheidung (`NNNN-titel.md`) |
| [diagrams/](diagrams/) | Mermaid-Diagramme (`.mmd`, optional `.svg`), Index in `diagrams/README.md` |
| [skills/](skills/) | Agent-Skills (Quelle der Wahrheit) |
| [scripts/](scripts/) | Hilfsskripte: Diagramme rendern, Handoff prüfen |

## Nutzung

- **Sitzungsbeginn:** `HANDOFF.md`, `REPO_OVERVIEW.md`, `LAST_CHANGES.md` lesen.
- **Sitzungsende:** Skill `handoff-update` (oder manuell: `HANDOFF.md` aus der Vorlage neu schreiben,
  Eintrag in `LAST_CHANGES.md` ergänzen).
- **Prüfen:** `.ai/scripts/check-handoff.sh` (auch für CI geeignet).

## Skills

| Skill | Zweck |
| --- | --- |
| `handoff-init` | Einmalig: Repo analysieren und alle `TODO`s in `AGENTS.md` und `.ai/` befüllen |
| `handoff-update` | Sitzungsende: `HANDOFF.md` und `LAST_CHANGES.md` aktualisieren |
| `mermaid-diagrams` | Mermaid-Diagramme in `.ai/diagrams/` erzeugen, aktualisieren und prüfen |

`.ai/skills/` ist die Quelle der Wahrheit. Claude Code findet Skills nur unter `.claude/skills/`; dort liegen
Symlinks (`.claude/skills/<name> -> ../../.ai/skills/<name>`). Wurde mit `--copy-skills` installiert
(z. B. Windows-Checkouts ohne Symlinks), sind es Kopien – dann Änderungen immer in `.ai/skills/` machen und
das Installationsskript erneut mit `--copy-skills --force` ausführen.

## Herkunft

- Installiert mit: handoff-kit, Version {{KIT_VERSION}}
- Installationsdatum: {{DATUM}}
- Skills: eigene Skills des handoff-kits (keine Drittanbieter-Skills).
