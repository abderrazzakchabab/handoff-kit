---
name: handoff-update
description: Schließt eine Arbeitssitzung ab, indem .ai/HANDOFF.md neu geschrieben und ein Eintrag in .ai/LAST_CHANGES.md ergänzt wird (bei Bedarf ADR und Diagramme). Verwenden am Ende jeder Sitzung, vor einer Übergabe oder wenn der Nutzer "Handoff", "Übergabe" oder "Sitzung beenden" sagt.
---

# handoff-update

Hält den Stand für die nächste Person / den nächsten Agenten fest. Doku auf **Deutsch**.

## Regeln

- Nur Fakten aus dieser Sitzung, dem Code und Git – nichts erfinden; Unklares als `TODO`.
- Keine Secrets, internen IPs/Hostnamen oder personenbezogenen Daten. Autor = „Agent (<Werkzeug>)“ oder die
  Rolle, die der Nutzer nennt.
- Nicht committen, außer der Nutzer verlangt es.

## Ablauf

1. **Stand erfassen**
   ```bash
   git status --short --branch
   git diff --stat
   git log --since="<Datum des letzten Eintrags in .ai/LAST_CHANGES.md>" --pretty=format:"%h %ad %s" --date=short
   ```
2. **.ai/HANDOFF.md neu schreiben** auf Basis von `.ai/HANDOFF_TEMPLATE.md` (alle Abschnitte, keiner leer –
   „–“ wenn nichts zutrifft):
   - Datum / Autor / Branch
   - Ziel der letzten Arbeit
   - Aktueller Stand (was funktioniert, was nicht – inkl. Testergebnis, falls Tests liefen)
   - Getroffene Entscheidungen (+ Begründung)
   - Verworfene Ansätze (+ warum)
   - Offene Punkte / bekannte Probleme
   - Nächste Schritte (konkret, priorisiert, so formuliert, dass jemand ohne Chat-Verlauf starten kann)
   - Relevante Dateien
   Offene Punkte aus dem vorherigen Handoff übernehmen, sofern sie nicht erledigt sind.
3. **.ai/LAST_CHANGES.md** – neuen Eintrag oben einfügen (unter der Einleitung), nach Thema gruppiert:
   Datum – Thema (Feature / Fix / Infra / Doku): Titel, Beschreibung, Bereiche, Commits (Hashes oder
   „uncommitted“). Abschnitt „Uncommitted / Work in Progress“ aktualisieren.
4. **ADR**, falls eine wesentliche Entscheidung fiel: `.ai/decisions/NNNN-titel.md` aus `.ai/decisions/TEMPLATE.md`,
   nächste freie Nummer.
5. **Diagramme**, falls sich Architektur, Datenfluss oder Deployment geändert hat: Skill `mermaid-diagrams`.
6. **REPO_OVERVIEW.md / AGENTS.md** anpassen, wenn sich Befehle, Struktur oder Konventionen geändert haben.
7. `.ai/scripts/check-handoff.sh` ausführen und Meldungen beheben.
8. Dem Nutzer kurz zeigen, was aktualisiert wurde.
