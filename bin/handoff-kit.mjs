#!/usr/bin/env node
// handoff-kit: installiert AGENTS.md, CLAUDE.md und .ai/ (Doku-Gerüst, Skills, Skripte) in ein oder mehrere Repos.
// Keine Abhängigkeiten, Node >= 18. Läuft unter Linux, macOS und Windows.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KIT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT_VERSION = JSON.parse(fs.readFileSync(path.join(KIT_DIR, 'package.json'), 'utf8')).version;
const BEGIN_MARK = '<!-- handoff-kit:begin -->';
const END_MARK = '<!-- handoff-kit:end -->';
const IS_WINDOWS = process.platform === 'win32';
const MERMAID_PKG = '@mermaid-js/mermaid-cli';

const HELP = `handoff-kit ${KIT_VERSION}
Installiert AGENTS.md, CLAUDE.md und .ai/ (Doku-Gerüst, Skills, Skripte) in Repos.

Aufruf:
  handoff-kit <repo-pfad> [<repo-pfad> ...] [Optionen]
  npx github:<owner>/handoff-kit <repo-pfad>

Optionen:
  --copy-skills   Skills nach .claude/skills/ kopieren statt verlinken (Standard unter Windows)
  --link-skills   Skills immer verlinken (auch unter Windows)
  --force         Kit-eigene Dateien aktualisieren: .ai/skills/, .ai/scripts/, Vorlagen und den
                  Handoff-Protokoll-Block in AGENTS.md. Befüllte Doku wird NIE überschrieben.
  --dry-run       Nur anzeigen, was passieren würde
  --no-mermaid    Mermaid CLI (mmdc) nicht installieren
  -v, --version   Version anzeigen
  -h, --help      Diese Hilfe

Verhalten bei bestehenden Dateien:
  AGENTS.md vorhanden   -> Handoff-Protokoll-Block wird angehängt (mit --force: ersetzt)
  CLAUDE.md vorhanden   -> '@AGENTS.md' wird als erste Zeile ergänzt, falls es fehlt
  .ai/<datei> vorhanden -> wird übersprungen (außer kit-eigene Dateien mit --force)

Fehlt die Mermaid CLI (mmdc), wird sie einmalig global installiert:
  npm install -g ${MERMAID_PKG}

Es wird nichts committet. Danach im Repo den Skill "handoff-init" ausführen.`;

class UsageError extends Error {}

export function parseArgs(argv) {
    const opts = { targets: [], copySkills: IS_WINDOWS, force: false, dryRun: false, mermaid: true, help: false, version: false };
    for (const arg of argv) {
        switch (arg) {
            case '--copy-skills': opts.copySkills = true; break;
            case '--link-skills': opts.copySkills = false; break;
            case '--force': opts.force = true; break;
            case '--dry-run': opts.dryRun = true; break;
            case '--no-mermaid': opts.mermaid = false; break;
            case '-h': case '--help': opts.help = true; break;
            case '-v': case '--version': opts.version = true; break;
            default:
                if (arg.startsWith('-')) throw new UsageError(`unbekannte Option: ${arg} (siehe --help)`);
                opts.targets.push(arg);
        }
    }
    return opts;
}

// --- Hilfsfunktionen ---------------------------------------------------------

function git(cwd, args) {
    try {
        return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return null;
    }
}

const gitOk = (cwd, args) => git(cwd, args) !== null;

const toPosix = (p) => p.split(path.sep).join('/');

function exists(p) {
    try { fs.lstatSync(p); return true; } catch { return false; }
}

function listFiles(dir, base = dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(full, base));
        else if (entry.isFile()) out.push(toPosix(path.relative(base, full)));
    }
    return out.sort();
}

function isKitOwned(rel) {
    return rel.startsWith('.ai/skills/') || rel.startsWith('.ai/scripts/')
        || rel === '.ai/HANDOFF_TEMPLATE.md' || rel === '.ai/decisions/TEMPLATE.md';
}

function splitLines(text) {
    return text.split(/\r?\n/);
}

// Extrahiert den Protokoll-Block (inkl. Marker) aus der AGENTS.md-Vorlage.
function protocolBlock() {
    const lines = splitLines(fs.readFileSync(path.join(KIT_DIR, 'AGENTS.md'), 'utf8'));
    const start = lines.indexOf(BEGIN_MARK);
    const end = lines.indexOf(END_MARK);
    if (start < 0 || end < start) throw new Error('Vorlage AGENTS.md enthält keinen gültigen handoff-kit-Block');
    return lines.slice(start, end + 1).join('\n');
}

// --- Installation eines Repos ------------------------------------------------

export function installRepo(targetArg, opts, log = console.log) {
    if (!fs.existsSync(targetArg) || !fs.statSync(targetArg).isDirectory()) {
        throw new UsageError(`Verzeichnis nicht gefunden: ${targetArg}`);
    }
    let target = fs.realpathSync(targetArg);
    const notes = [];

    let branch = 'TODO: Branch';
    const isGit = gitOk(target, ['rev-parse', '--is-inside-work-tree']);
    if (isGit) {
        const top = fs.realpathSync(git(target, ['rev-parse', '--show-toplevel']));
        if (top !== target) {
            notes.push(`Hinweis: ${target} ist nicht das Repo-Root, installiere nach ${top}`);
            target = top;
        }
        // symbolic-ref funktioniert auch ohne Commits; bei detached HEAD den Kurz-Hash nehmen
        branch = git(target, ['symbolic-ref', '--short', '-q', 'HEAD'])
            || git(target, ['rev-parse', '--short', 'HEAD'])
            || branch;
    } else {
        notes.push(`Warnung: ${target} ist kein Git-Repo – Git-Prüfungen entfallen.`);
    }
    if (target === fs.realpathSync(KIT_DIR)) throw new UsageError('Ziel ist das Kit selbst');

    const vars = {
        REPO_NAME: path.basename(target),
        DATUM: new Date().toISOString().slice(0, 10),
        BRANCH: branch.replace(/\s+/g, ' '),
        KIT_VERSION,
    };
    const render = (text) => text.replace(/\{\{(REPO_NAME|DATUM|BRANCH|KIT_VERSION)\}\}/g, (_, k) => vars[k]);

    const report = { created: [], merged: [], updated: [], skipped: [] };
    const dry = opts.dryRun;

    // Schreibt erst in eine temporäre Datei, damit bei Fehlern keine halben Dateien entstehen.
    function writeAtomic(dst, content, mode) {
        if (dry) return;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        const tmp = `${dst}.handoff-kit-${process.pid}.tmp`;
        try {
            fs.writeFileSync(tmp, content, { mode });
            fs.renameSync(tmp, dst);
        } catch (e) {
            fs.rmSync(tmp, { force: true });
            throw e;
        }
    }

    function installFile(rel) {
        const src = path.join(KIT_DIR, rel);
        const srcMode = fs.statSync(src).mode & 0o111 ? 0o755 : 0o644;
        const raw = fs.readFileSync(src);
        const content = rel.endsWith('.md') ? render(raw.toString('utf8')) : raw;
        writeAtomic(path.join(target, rel), content, srcMode);
        return content;
    }

    function sameAsKit(rel) {
        const src = fs.readFileSync(path.join(KIT_DIR, rel));
        const want = rel.endsWith('.md') ? Buffer.from(render(src.toString('utf8'))) : src;
        return want.equals(fs.readFileSync(path.join(target, rel)));
    }

    // --- .ai/ ----------------------------------------------------------------
    for (const sub of listFiles(path.join(KIT_DIR, '.ai'))) {
        const rel = `.ai/${sub}`;
        const dst = path.join(target, rel);
        if (!exists(dst)) {
            installFile(rel); report.created.push(rel);
        } else if (opts.force && isKitOwned(rel)) {
            if (sameAsKit(rel)) report.skipped.push(`${rel} (unverändert)`);
            else { installFile(rel); report.updated.push(rel); }
        } else {
            report.skipped.push(`${rel} (existiert)`);
        }
    }

    // --- AGENTS.md -------------------------------------------------------------
    const agentsDst = path.join(target, 'AGENTS.md');
    if (!exists(agentsDst)) {
        installFile('AGENTS.md'); report.created.push('AGENTS.md');
    } else {
        const block = protocolBlock();
        const current = fs.readFileSync(agentsDst, 'utf8');
        const lines = splitLines(current);
        const start = lines.indexOf(BEGIN_MARK);
        const end = lines.indexOf(END_MARK);
        if (start < 0) {
            const sep = current.endsWith('\n') ? '\n' : '\n\n';
            writeAtomic(agentsDst, `${current}${sep}${block}\n`, 0o644);
            report.merged.push('AGENTS.md (Handoff-Protokoll angehängt)');
        } else if (end < start) {
            report.skipped.push('AGENTS.md (Endmarker fehlt – Block bitte manuell prüfen)');
        } else if (opts.force) {
            const next = [...lines.slice(0, start), ...splitLines(block), ...lines.slice(end + 1)].join('\n');
            if (next === lines.join('\n')) report.skipped.push('AGENTS.md (Protokoll unverändert)');
            else { writeAtomic(agentsDst, next, 0o644); report.updated.push('AGENTS.md (Handoff-Protokoll ersetzt)'); }
        } else {
            report.skipped.push('AGENTS.md (Protokoll schon vorhanden)');
        }
    }

    // --- CLAUDE.md -------------------------------------------------------------
    const claudeDst = path.join(target, 'CLAUDE.md');
    if (exists(claudeDst) && fs.lstatSync(claudeDst).isSymbolicLink()) {
        report.skipped.push('CLAUDE.md (ist ein Symlink – bitte manuell prüfen)');
    } else if (!exists(claudeDst)) {
        installFile('CLAUDE.md'); report.created.push('CLAUDE.md');
    } else {
        const current = fs.readFileSync(claudeDst, 'utf8');
        if (splitLines(current).some((l) => l.trim() === '@AGENTS.md')) {
            report.skipped.push('CLAUDE.md (importiert AGENTS.md bereits)');
        } else {
            writeAtomic(claudeDst, `@AGENTS.md\n\n${current}`, 0o644);
            report.merged.push('CLAUDE.md (@AGENTS.md ergänzt)');
        }
    }

    // --- .claude/skills/ -------------------------------------------------------
    const skillsSrc = path.join(KIT_DIR, '.ai', 'skills');
    const skills = fs.readdirSync(skillsSrc, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const name of skills) {
        const rel = `.claude/skills/${name}`;
        const link = path.join(target, '.claude', 'skills', name);
        const source = path.join(target, '.ai', 'skills', name);
        if (exists(link)) {
            const isRealDir = !fs.lstatSync(link).isSymbolicLink() && fs.statSync(link).isDirectory();
            if (opts.copySkills && opts.force && isRealDir) {
                if (!dry) { fs.rmSync(link, { recursive: true, force: true }); fs.cpSync(source, link, { recursive: true }); }
                report.updated.push(`${rel} (Kopie)`);
            } else {
                report.skipped.push(`${rel} (existiert)`);
            }
            continue;
        }
        if (opts.copySkills) {
            if (!dry) { fs.mkdirSync(path.dirname(link), { recursive: true }); fs.cpSync(source, link, { recursive: true }); }
            report.created.push(`${rel} (Kopie)`);
            continue;
        }
        const relTarget = path.join('..', '..', '.ai', 'skills', name);
        if (!dry) {
            fs.mkdirSync(path.dirname(link), { recursive: true });
            try {
                fs.symlinkSync(relTarget, link, 'dir');
            } catch (e) {
                // Ohne Symlink-Recht (z. B. Windows ohne Entwicklermodus) bleibt nur die Kopie.
                if (e.code !== 'EPERM' && e.code !== 'EACCES') throw e;
                fs.cpSync(source, link, { recursive: true });
                report.created.push(`${rel} (Kopie – Symlink nicht erlaubt)`);
                continue;
            }
        }
        report.created.push(`${rel} -> ${toPosix(relTarget)}`);
    }

    // --- Bericht ---------------------------------------------------------------
    for (const n of notes) log(n);
    if (dry) log('\n*** DRY-RUN – es wurde nichts geschrieben ***');
    log(`\nhandoff-kit ${KIT_VERSION} -> ${target}`);
    for (const [title, items] of [['Angelegt', report.created], ['Ergänzt', report.merged],
        ['Aktualisiert', report.updated], ['Übersprungen', report.skipped]]) {
        if (items.length) log(`\n${title}:\n${items.map((i) => `  ${i}`).join('\n')}`);
    }

    if (isGit) {
        if (gitOk(target, ['check-ignore', '-q', '.ai/HANDOFF.md'])) {
            log('\nWARNUNG: .ai/ wird von .gitignore ignoriert – bitte freigeben, der Ordner muss versioniert werden.');
        }
        if (gitOk(target, ['check-ignore', '-q', '.claude/skills/handoff-init'])) {
            log('\nHINWEIS: .claude/ wird ignoriert – die Skill-Links werden nicht versioniert.');
            log('         Jede Person muss handoff-kit einmal selbst ausführen (oder .claude/skills/ freigeben).');
        }
    }

    return { target, ...report };
}

// --- Mermaid CLI -------------------------------------------------------------

function runs(cmd, args) {
    // shell nötig unter Windows, weil npm/mmdc dort .cmd-Dateien sind
    const res = spawnSync(cmd, args, { stdio: 'ignore', shell: IS_WINDOWS });
    return !res.error && res.status === 0;
}

// Installiert die Mermaid CLI global, falls mmdc fehlt. Ein Fehlschlag bricht die Installation nicht ab.
export function ensureMermaidCli(opts, log = console.log) {
    if (!opts.mermaid) return 'deaktiviert';
    if (runs('mmdc', ['--version'])) {
        log('\nMermaid CLI (mmdc) ist bereits installiert.');
        return 'vorhanden';
    }
    const cmd = `npm install -g ${MERMAID_PKG}`;
    if (opts.dryRun) {
        log(`\nMermaid CLI fehlt – würde ausführen: ${cmd}`);
        return 'dry-run';
    }
    log(`\nMermaid CLI fehlt – führe aus: ${cmd}`);
    const res = spawnSync('npm', ['install', '-g', MERMAID_PKG], { stdio: 'inherit', shell: IS_WINDOWS });
    if (!res.error && res.status === 0) {
        log('Mermaid CLI installiert.');
        return 'installiert';
    }
    log(`\nWARNUNG: Mermaid CLI konnte nicht installiert werden${res.error ? ` (${res.error.code})` : ''}.`);
    log('         Diagramme werden dann nicht maschinell geprüft. Manuell nachholen:');
    log(`           ${cmd}`);
    log('         (bei Rechtefehlern: npm-Prefix ins Home-Verzeichnis legen oder nvm verwenden, kein sudo nötig)');
    return 'fehlgeschlagen';
}

function nextSteps(targets) {
    const cd = targets.length === 1 ? targets[0] : '<repo>';
    return `
Nächste Schritte:
  1. cd ${cd}
  2. Claude Code starten und den Skill "handoff-init" ausführen
     (andere Agenten: .ai/skills/handoff-init/SKILL.md lesen und befolgen)
  3. bash .ai/scripts/check-handoff.sh
  4. Ergebnis prüfen und committen (handoff-kit committet nichts)`;
}

// --- CLI ---------------------------------------------------------------------

function main(argv) {
    let opts;
    try {
        opts = parseArgs(argv);
    } catch (e) {
        console.error(`Fehler: ${e.message}`);
        return 2;
    }
    if (opts.help) { console.log(HELP); return 0; }
    if (opts.version) { console.log(KIT_VERSION); return 0; }
    if (!opts.targets.length) { console.log(HELP); return 2; }

    const done = [];
    let failed = 0;
    for (const t of opts.targets) {
        try {
            done.push(installRepo(t, opts).target);
        } catch (e) {
            console.error(`Fehler (${t}): ${e.message}`);
            failed++;
        }
    }
    if (done.length) {
        ensureMermaidCli(opts);
        console.log(nextSteps(done));
    }
    return failed ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = main(process.argv.slice(2));
}
