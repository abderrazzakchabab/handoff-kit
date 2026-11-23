import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installRepo, parseArgs } from '../bin/handoff-kit.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(KIT, 'bin', 'handoff-kit.mjs');
const silent = () => {};
const opts = (o = {}) => ({ copySkills: false, force: false, dryRun: false, ...o });

const tmpRoots = [];
after(() => { for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true }); });

function tmpRepo(name = 'repo', { commit = true, branch = 'main' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-kit-'));
    tmpRoots.push(root);
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
    g('init', '-q', '-b', branch);
    if (commit) {
        fs.writeFileSync(path.join(dir, 'app.txt'), 'hi\n');
        g('add', '.');
        g('-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '-qm', 'init');
    }
    return dir;
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('frische Installation legt alles an und ersetzt Platzhalter', () => {
    const repo = tmpRepo('mein-repo', { branch: 'develop' });
    const r = installRepo(repo, opts(), silent);
    for (const f of ['AGENTS.md', 'CLAUDE.md', '.ai/HANDOFF.md', '.ai/scripts/check-handoff.sh', '.ai/skills/handoff-init/SKILL.md']) {
        assert.ok(fs.existsSync(path.join(repo, f)), f);
    }
    assert.match(read(repo, 'AGENTS.md'), /^# AGENTS\.md – mein-repo$/m);
    assert.match(read(repo, '.ai/HANDOFF.md'), /\*\*Branch:\*\* develop/);
    for (const f of ['AGENTS.md', '.ai/README.md', '.ai/HANDOFF.md', '.ai/LAST_CHANGES.md']) {
        assert.doesNotMatch(read(repo, f), /\{\{[A-Z_]+\}\}/, f);
    }
    assert.equal(read(repo, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(fs.readlinkSync(path.join(repo, '.claude/skills/handoff-init')), path.join('..', '..', '.ai', 'skills', 'handoff-init'));
    assert.ok(fs.statSync(path.join(repo, '.ai/scripts/check-handoff.sh')).mode & 0o100, 'Skript ausführbar');
    assert.equal(r.skipped.length, 0);
});

test('bestehende AGENTS.md/CLAUDE.md/HANDOFF.md werden ergänzt, nicht überschrieben', () => {
    const repo = tmpRepo('alt', { commit: false });
    fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Eigenes\n\nRegeln.\n');
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'Notiz\n');
    fs.mkdirSync(path.join(repo, '.ai'));
    fs.writeFileSync(path.join(repo, '.ai/HANDOFF.md'), 'eigener Handoff\n');
    installRepo(repo, opts(), silent);
    const agents = read(repo, 'AGENTS.md');
    assert.ok(agents.startsWith('# Eigenes\n\nRegeln.\n'));
    assert.equal(count(agents, '<!-- handoff-kit:begin -->'), 1);
    assert.equal(read(repo, 'CLAUDE.md'), '@AGENTS.md\n\nNotiz\n');
    assert.equal(read(repo, '.ai/HANDOFF.md'), 'eigener Handoff\n');
});

test('erneutes Ausführen ändert nichts (idempotent)', () => {
    const repo = tmpRepo();
    installRepo(repo, opts(), silent);
    const before = read(repo, 'AGENTS.md') + read(repo, 'CLAUDE.md');
    const r = installRepo(repo, opts(), silent);
    assert.equal(r.created.length + r.merged.length + r.updated.length, 0);
    assert.equal(read(repo, 'AGENTS.md') + read(repo, 'CLAUDE.md'), before);
});

test('--force aktualisiert nur kit-eigene Dateien und den Protokoll-Block', () => {
    const repo = tmpRepo();
    installRepo(repo, opts(), silent);
    const agentsPath = path.join(repo, 'AGENTS.md');
    fs.writeFileSync(agentsPath, read(repo, 'AGENTS.md').replace('Projektüberblick', 'MEIN ÜBERBLICK').replace('verpflichtend', 'LOKAL'));
    fs.appendFileSync(path.join(repo, '.ai/skills/handoff-init/SKILL.md'), 'lokal\n');
    fs.writeFileSync(path.join(repo, '.ai/REPO_OVERVIEW.md'), 'befüllt\n');
    const r = installRepo(repo, opts({ force: true }), silent);
    const agents = read(repo, 'AGENTS.md');
    assert.ok(agents.includes('MEIN ÜBERBLICK'), 'Inhalt außerhalb des Blocks bleibt');
    assert.ok(!agents.includes('LOKAL'), 'Block wurde ersetzt');
    assert.ok(!read(repo, '.ai/skills/handoff-init/SKILL.md').includes('lokal\n'));
    assert.equal(read(repo, '.ai/REPO_OVERVIEW.md'), 'befüllt\n');
    assert.deepEqual(r.updated.sort(), ['.ai/skills/handoff-init/SKILL.md', 'AGENTS.md (Handoff-Protokoll ersetzt)']);
});

test('--copy-skills kopiert statt zu verlinken', () => {
    const repo = tmpRepo();
    installRepo(repo, opts({ copySkills: true }), silent);
    const link = path.join(repo, '.claude/skills/mermaid-diagrams');
    assert.ok(!fs.lstatSync(link).isSymbolicLink());
    assert.ok(fs.existsSync(path.join(link, 'SKILL.md')));
});

test('--dry-run schreibt nichts', () => {
    const repo = tmpRepo();
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'Notiz\n');
    const r = installRepo(repo, opts({ dryRun: true }), silent);
    assert.ok(r.created.length > 0);
    assert.deepEqual(fs.readdirSync(repo).sort(), ['.git', 'CLAUDE.md', 'app.txt']);
    assert.equal(read(repo, 'CLAUDE.md'), 'Notiz\n');
});

test('Sonderzeichen im Repo-Namen und Unterordner als Ziel', () => {
    const repo = tmpRepo('we|ird & $name');
    fs.mkdirSync(path.join(repo, 'sub'));
    const r = installRepo(path.join(repo, 'sub'), opts(), silent);
    assert.equal(r.target, fs.realpathSync(repo));
    assert.match(read(repo, 'AGENTS.md'), /^# AGENTS\.md – we\|ird & \$name$/m);
});

test('check-handoff.sh ist nach der Installation fehlerfrei', { skip: process.platform === 'win32' }, () => {
    const repo = tmpRepo();
    installRepo(repo, opts(), silent);
    const res = spawnSync('bash', ['.ai/scripts/check-handoff.sh'], { cwd: repo, encoding: 'utf8' });
    assert.equal(res.status, 0, res.stdout);
    assert.match(res.stdout, /0 Fehler/);
});

test('CLI: Fehlerfälle und Exit-Codes', () => {
    const run = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8' });
    assert.equal(run().status, 2);
    assert.equal(run('--bogus').status, 2);
    assert.equal(run('/gibt/es/nicht').status, 1);
    assert.equal(run(KIT).status, 1);
    assert.equal(run('--version').stdout.trim(), JSON.parse(read(KIT, 'package.json')).version);
    assert.deepEqual(parseArgs(['a', 'b', '--force']).targets, ['a', 'b']);
});

test('CLI: mehrere Repos in einem Aufruf', () => {
    const a = tmpRepo('a');
    const b = tmpRepo('b');
    const res = spawnSync(process.execPath, [CLI, a, b, '--no-mermaid'], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.ok(fs.existsSync(path.join(a, 'AGENTS.md')) && fs.existsSync(path.join(b, 'AGENTS.md')));
    assert.doesNotMatch(res.stdout, /Mermaid/);
});

// Mermaid-Tests mit leerem PATH: weder mmdc noch npm auffindbar -> deterministisch, kein Netzwerk.
const runNoPath = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8', env: { PATH: '' } });

test('Mermaid: --dry-run zeigt nur den npm-Befehl', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-kit-'));
    tmpRoots.push(dir);
    const res = runNoPath(dir, '--dry-run');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /würde ausführen: npm install -g @mermaid-js\/mermaid-cli/);
});

test('Mermaid: fehlgeschlagene Installation warnt, Repo-Installation bleibt erfolgreich', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-kit-'));
    tmpRoots.push(dir);
    const res = runNoPath(dir);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /WARNUNG: Mermaid CLI konnte nicht installiert werden/);
    assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
});
