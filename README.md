# handoff-kit

Einheitliche Handoff-Struktur für alle Business-Repos: `AGENTS.md`, `CLAUDE.md` und `.ai/`
(Doku-Gerüst, Agent-Skills, Prüfskripte). Damit können Teammitglieder und KI-Agenten ein Repo verstehen,
die letzten Änderungen sehen und ohne die ursprüngliche Chat-Sitzung weiterarbeiten.

> `AGENTS.md`, `CLAUDE.md` und `.ai/` in diesem Repo sind die **Vorlagen** (mit `{{PLATZHALTERN}}`).
> `README.md`, `bin/`, `test/` und `package.json` gehören zum Kit und werden nicht in die Repos kopiert.

## Voraussetzungen

- Node.js >= 18 (keine npm-Abhängigkeiten)
- Git
- Für die Prüfskripte im Ziel-Repo: Bash (unter Windows z. B. Git Bash)

## Schnellstart

Ohne Klonen, direkt von GitHub (Zugriff auf das private Repo nötig):

```bash
npx github:abderrazzakchabab/handoff-kit /pfad/zum/repo
```

Oder aus einem lokalen Klon:

```bash
git clone git@github.com:abderrazzakchabab/handoff-kit.git
node handoff-kit/bin/handoff-kit.mjs /pfad/zum/repo
```

Danach im Ziel-Repo:

```bash
cd /pfad/zum/repo
claude                               # Skill "handoff-init" ausführen – befüllt alle TODOs auf Deutsch
bash .ai/scripts/check-handoff.sh    # prüfen
git add AGENTS.md CLAUDE.md .ai .claude/skills
git commit -m "docs: Handoff-Struktur für Agenten einführen"
```

Mehrere Repos auf einmal:

```bash
npx github:abderrazzakchabab/handoff-kit ~/Work/repos/*/
```

`./install-handoff.sh` ist ein kleiner Wrapper für dieselbe Installation (`node bin/handoff-kit.mjs`).

## Optionen

| Option | Wirkung |
| --- | --- |
| `--dry-run` | zeigt nur an, was passieren würde |
| `--copy-skills` | kopiert Skills nach `.claude/skills/` statt Symlinks (Standard unter Windows) |
| `--link-skills` | verlinkt Skills immer, auch unter Windows (braucht Symlink-Recht/Entwicklermodus) |
| `--force` | aktualisiert kit-eigene Dateien (`.ai/skills/`, `.ai/scripts/`, Vorlagen, Protokoll-Block in `AGENTS.md`) |
| `--no-mermaid` | Mermaid CLI nicht installieren |
| `-v`, `--version` | Version anzeigen |

## Was installiert wird

```
<repo>/
├── AGENTS.md                    # Einstieg für alle Agenten (Projektüberblick, Befehle, Verbote, Handoff-Protokoll)
├── CLAUDE.md                    # nur "@AGENTS.md" – Claude Code liest AGENTS.md nicht selbst
├── .claude/skills/<name>        # Symlinks auf .ai/skills/<name> (oder Kopien)
└── .ai/
    ├── README.md                # Index des Ordners
    ├── REPO_OVERVIEW.md         # Zweck, Architektur, Struktur, Konfiguration (Gerüst)
    ├── LAST_CHANGES.md          # Änderungen nach Thema
    ├── HANDOFF.md               # aktueller Stand für die nächste Person
    ├── HANDOFF_TEMPLATE.md      # leere Vorlage
    ├── decisions/
    │   ├── 0001-handoff-struktur.md
    │   └── TEMPLATE.md          # ADR-Vorlage
    ├── diagrams/README.md       # Index der Mermaid-Diagramme
    ├── skills/
    │   ├── handoff-init/        # einmalig: Repo analysieren, alle TODOs befüllen
    │   ├── handoff-update/      # Sitzungsende: HANDOFF.md + LAST_CHANGES.md aktualisieren
    │   └── mermaid-diagrams/    # Diagramme erzeugen/aktualisieren/prüfen
    └── scripts/
        ├── check-handoff.sh     # Struktur-, Secret- und Aktualitätsprüfung (CI-tauglich)
        └── render-diagrams.sh   # .mmd -> .svg bzw. Syntaxprüfung mit mmdc
```

Platzhalter, die beim Installieren ersetzt werden: `{{REPO_NAME}}`, `{{DATUM}}`, `{{BRANCH}}`, `{{KIT_VERSION}}`.

## Sicher in bestehenden Repos

- Bestehende Doku wird **nie** überschrieben – auch nicht mit `--force`.
- Vorhandene `AGENTS.md`: nur der Block `<!-- handoff-kit:begin -->…<!-- handoff-kit:end -->` wird angehängt
  (mit `--force` ersetzt). Alles außerhalb des Blocks bleibt unberührt.
- Vorhandene `CLAUDE.md`: `@AGENTS.md` wird als erste Zeile ergänzt, falls es fehlt. Ist `CLAUDE.md` ein Symlink,
  passiert nichts (Hinweis im Bericht).
- Wird ein Unterordner angegeben, wird ins Repo-Root installiert.
- Mehrfaches Ausführen ist unschädlich (idempotent); Dateien werden atomar geschrieben.
- Es wird nichts committet. Netzwerk wird nur benutzt, wenn die Mermaid CLI fehlt
  (`npm install -g @mermaid-js/mermaid-cli`, abschaltbar mit `--no-mermaid`).
- Warnung, wenn `.ai/` per `.gitignore` ausgeschlossen ist, und Hinweis, wenn `.claude/` ignoriert wird
  (dann muss jede Person handoff-kit selbst ausführen, damit Claude Code die Skills findet).

## Kit weiterentwickeln

```bash
npm test                 # node:test, ohne Abhängigkeiten
```

1. Vorlagen/Skills/Skripte ändern, Version in `package.json` erhöhen, Tests laufen lassen, pushen.
2. In den Repos: `npx github:abderrazzakchabab/handoff-kit <repo> --force` – aktualisiert nur kit-eigene Dateien.

## CI (Beispiel GitLab)

```yaml
handoff-check:
  stage: test
  image: alpine:3.20
  before_script: [apk add --no-cache bash git grep]
  script: [bash .ai/scripts/check-handoff.sh]      # --strict, wenn TODOs/veralteter Handoff den Build brechen sollen
```

## Diagramme

Die Skills erzeugen Mermaid (`.mmd`). Zum Prüfen/Rendern wird die Mermaid CLI (`mmdc`) gebraucht.
handoff-kit installiert sie automatisch einmal global (`npm install -g @mermaid-js/mermaid-cli`), wenn `mmdc`
fehlt. Schlägt das fehl (z. B. keine Schreibrechte auf den globalen npm-Prefix), gibt es nur eine Warnung –
die Repo-Installation ist trotzdem erfolgreich.

Ohne `mmdc` beendet sich `render-diagrams.sh` mit Exit-Code 3 und der Agent meldet, dass nicht maschinell geprüft
wurde. Alternativ ohne globale Installation: `HANDOFF_MMDC="npx -y @mermaid-js/mermaid-cli@11.4.2"`.

## Hinweis zu Skills

Ursprünglich vorgesehen war der Drittanbieter-Skill `diagram-generator` (ialameh/sift-coder). Er ist in jenem
Repository nicht vorhanden (alle 103 Commits geprüft, Stand 2026-11-22). Das Kit enthält deshalb eigene,
vollständig lesbare Skills ohne Skripte, Netzwerkzugriffe oder Schreibzugriffe außerhalb des Repos.

## Hinweis zu diesem Repo

Weil hier die Vorlage `CLAUDE.md` → `AGENTS.md` liegt, liest eine Claude-Code-Sitzung **in diesem Repo** die
Vorlagen-Anweisungen mit. Das ist harmlos; beim Bearbeiten des Kits einfach im Hinterkopf behalten.
