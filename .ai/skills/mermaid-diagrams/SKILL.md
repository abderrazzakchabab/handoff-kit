---
name: mermaid-diagrams
description: Erzeugt und aktualisiert Mermaid-Diagramme (Architektur, Datenfluss, Deployment, Sequenzen) aus dem tatsächlichen Code in .ai/diagrams/ und prüft sie. Verwenden bei handoff-init, nach Architekturänderungen oder wenn der Nutzer ein Diagramm des Repos möchte.
---

# mermaid-diagrams

Diagramme liegen als Mermaid-Quelle in `.ai/diagrams/*.mmd` (optional `.svg`). Beschriftungen auf **Deutsch**,
Bezeichner aus dem Code unverändert.

## Regeln

- **Nur belegbare Kanten.** Jede Komponente und jede Abhängigkeit muss im Code, in der Konfiguration oder
  im Deployment sichtbar sein (Import, Aufruf, Konfig-Eintrag, Manifest). Nichts aus Namen erraten.
- Keine Hostnamen, IPs, URLs interner Systeme, Zugangsdaten oder Personennamen – generische Bezeichnungen
  verwenden (z. B. „PostgreSQL (Prod)“ statt Hostname).
- Lesbar halten: höchstens ca. 15–20 Knoten pro Diagramm; lieber zwei Diagramme als eins, das niemand liest.
- Nur Diagramme anlegen, die zum Repo passen. Kein `deployment.mmd` ohne Deployment-Artefakte.

## Diagrammtypen

| Datei | Mermaid-Typ | Inhalt |
| --- | --- | --- |
| `architecture.mmd` | `flowchart LR` | Module/Komponenten und ihre Abhängigkeiten, externe Systeme |
| `data-flow.mmd` | `flowchart LR` | Woher Daten kommen, wie sie transformiert und wohin sie geschrieben werden |
| `deployment.mmd` | `flowchart TB` | CI/CD, Images, Cluster/Namespaces, Dienste (nur wenn k8s/Helm/CI vorhanden) |
| `sequence-<ablauf>.mmd` | `sequenceDiagram` | Die 1–2 wichtigsten Abläufe (z. B. Request, Login, Batch-Lauf) |

Weitere Typen bei Bedarf: `erDiagram` (Datenmodell aus ORM/Migrationen), `stateDiagram-v2` (Zustandsautomaten).

## Ablauf

1. Relevanten Code lesen: Einstiegspunkte, Modulgrenzen, Imports, Konfig, Deployment-Dateien.
2. Diagramm(e) schreiben – eine Datei pro Diagramm, **ohne** ```` ```mermaid ````-Zaun in `.mmd`-Dateien.
3. `architecture.mmd` zusätzlich als ```` ```mermaid ````-Block in `.ai/REPO_OVERVIEW.md` → „Architektur“ einbetten
   (identischer Inhalt).
4. Index `.ai/diagrams/README.md` aktualisieren (Tabelle: Datei | Inhalt).
5. Prüfen:
   ```bash
   .ai/scripts/render-diagrams.sh --check   # nur Syntaxprüfung
   .ai/scripts/render-diagrams.sh           # zusätzlich .svg erzeugen
   ```
   Ist `mmdc` nicht installiert, meldet das Skript dies (Exit-Code 3). Dann die Syntax manuell gegen die Regeln
   unten prüfen und dem Nutzer ausdrücklich sagen, dass nicht maschinell geprüft wurde.

## Syntax-Fallen

- Beschriftungen mit Sonderzeichen `( ) [ ] { } : ; , " / #` in Anführungszeichen setzen: `A["Auth (OIDC)"]`.
- Zeilenumbruch in Knoten: `<br/>`.
- Knoten-IDs ohne Leerzeichen und nicht `end`, `graph`, `subgraph` (reservierte Wörter); IDs kurz, Text in die Beschriftung.
- Kantenbeschriftung: `A -- "Text" --> B` oder `A -->|Text| B`.
- `subgraph Name ... end` – jede `subgraph` braucht ein eigenes `end`.
- In `sequenceDiagram` keine Semikolons in Nachrichten; Teilnehmer mit `participant X as "Name"` deklarieren.
- Keine Mermaid-Direktiven/Themes (`%%{init}%%`), damit es in GitLab/GitHub/Confluence gleich aussieht.
