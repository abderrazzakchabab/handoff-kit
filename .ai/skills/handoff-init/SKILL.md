---
name: handoff-init
description: Analysiert das Repository einmalig und befüllt alle TODO-Platzhalter in AGENTS.md und .ai/ (Repo-Überblick, letzte Änderungen, Handoff, Diagramme). Verwenden direkt nach der Installation des handoff-kits oder wenn AGENTS.md/.ai/ noch TODO-Gerüste enthalten.
---

# handoff-init

Befüllt die vom handoff-kit angelegte Struktur aus dem tatsächlichen Repo-Inhalt.
Alle Doku auf **Deutsch**; Code-Bezeichner, Befehle und Dateinamen unverändert.

## Grundregeln

- **Erst analysieren, dann schreiben.**
- **Nichts erfinden.** Was nicht aus Code, Konfiguration oder Git-Historie belegbar ist, bleibt `TODO: <konkrete Frage>`.
- **Sicherheit:** Keine Secrets, Tokens, Passwörter, Zertifikate, internen IPs/Hostnamen oder personenbezogenen
  Daten (auch keine Autorennamen oder E-Mails aus `git log`) in die Dateien übernehmen. Nur **Orte** von
  Konfiguration und **Namen** von Variablen nennen. Commits nur per Hash referenzieren.
- **Keinen Quellcode ändern.** Nur `AGENTS.md`, `CLAUDE.md` und Dateien unter `.ai/` bearbeiten.
- Bestehende Inhalte, die nicht `TODO` sind, nicht überschreiben – ergänzen.
- **Nicht committen.**

## Schritt 1 – Analyse

1. Verzeichnisstruktur erfassen (ohne `node_modules`, `.git`, `vendor`, Build-Ausgaben, `.ai/`).
2. README, Build-/Konfig-Dateien lesen (z. B. `package.json`, `pyproject.toml`, `pom.xml`, `build.gradle`,
   `go.mod`, `Cargo.toml`, `Makefile`, `Dockerfile`, `docker-compose*.yml`, Helm-Charts, k8s-Manifeste,
   CI-Pipelines wie `.gitlab-ci.yml`, `.github/workflows/`, `Jenkinsfile`, `azure-pipelines.yml`).
3. Bestimmen: Zweck, Tech-Stack, Einstiegspunkte, Build/Test/Lint/Run/Deploy, Konfiguration, externe Abhängigkeiten.
4. Git:
   ```bash
   git log --since="60 days ago" --pretty=format:"%h %ad %s" --date=short
   # leer? dann: git log -50 --pretty=format:"%h %ad %s" --date=short
   git status --short --branch
   git diff --stat
   ```
5. **Vor dem Schreiben** dem Nutzer eine kurze Zusammenfassung der Befunde zeigen.

## Schritt 2 – AGENTS.md

`TODO`-Abschnitte ersetzen; max. ca. 150 Zeilen.
- **Projektüberblick:** 3–5 Sätze.
- **Wichtige Befehle:** nur Befehle, die im Repo wirklich existieren (Skripte in `package.json`, Make-Targets,
  CI-Jobs usw.). Fehlt z. B. ein Test-Befehl, das so schreiben statt einen zu erfinden.
- **Code-Konventionen:** nur im Code erkennbare Regeln (Benennung, Struktur, Formatter/Linter-Konfiguration).
- **Verbotene Aktionen:** die allgemeinen Punkte behalten, repo-spezifische ergänzen
  (generierte Dateien, Produktions-Konfig, Migrationen, Lockfiles …).
- Den Block zwischen `<!-- handoff-kit:begin -->` und `<!-- handoff-kit:end -->` **nicht verändern**.

## Schritt 3 – .ai/REPO_OVERVIEW.md

Abschnitte: Zweck, Architektur (Mermaid-Block, identisch mit `diagrams/architecture.mmd`),
Verzeichnisstruktur (Baum mit einer Zeile pro Ordner), Tech-Stack, Datenfluss, externe Abhängigkeiten,
Konfiguration (nur Orte), Build/Deploy, bekannte Einschränkungen.

## Schritt 4 – .ai/LAST_CHANGES.md

Git-Historie aus Schritt 1 **nach Thema** gruppieren (Feature / Fix / Infra / Doku), nicht pro Commit.
Neueste zuerst. Pro Eintrag: Datum, Kurzbeschreibung, betroffene Bereiche, Commit-Hashes.
Abschnitt „Uncommitted / Work in Progress“ befüllen (oder „keine“, wenn `git status` sauber ist).
Den vom Kit angelegten Eintrag „Handoff-Struktur eingeführt“ behalten.

## Schritt 5 – .ai/HANDOFF.md

Aus Git-Historie und Repo-Stand befüllen, exakt diese Abschnitte (siehe `HANDOFF_TEMPLATE.md`):
Datum / Autor / Branch, Ziel der letzten Arbeit, Aktueller Stand, Getroffene Entscheidungen, Verworfene Ansätze,
Offene Punkte / bekannte Probleme, Nächste Schritte, Relevante Dateien. Unbekanntes als `TODO`.

## Schritt 6 – Diagramme

Skill `mermaid-diagrams` anwenden (Anleitung: `.ai/skills/mermaid-diagrams/SKILL.md`).

## Schritt 7 – Abschluss

1. Prüfen, dass `.ai/` nicht in `.gitignore` steht.
2. `.ai/scripts/check-handoff.sh` ausführen und Fehler beheben.
3. Jede geänderte Datei erneut lesen: keine Secrets, keine erfundenen Fakten.
4. Dem Nutzer zeigen: Liste der geänderten Dateien, alle verbleibenden `TODO`s, Vorschlag für eine Commit-Message
   (z. B. `docs: Handoff-Struktur für Agenten einführen`). **Nicht committen.**
