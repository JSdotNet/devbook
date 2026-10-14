#!/usr/bin/env node
// Builds the review queue: every chapter in the adopted devbook folders and every open change
// that a person still owes a move on, sorted into the first matching row of the table below.
//
//   node review-queue.mjs [--root <repo>] [--tools <dir>] [--today <YYYY-MM-DD>] [--json]
//
// Reads only; writes nothing. It reads `meta` and `annotation` fences and nothing else of a
// chapter, and never reads `_meta/`: the derived index carries no rung and lags the branch.
//
// The fences are parsed by the repository's own copy of devbook's checker,
// `.devbook/_tools/devbook-meta/` (or `--tools`), so a fingerprint here is the value
// `chapter-hash.mjs` prints and the check compares — never a second implementation of it.
//
// Exit 0 when the queue was produced, 1 on a bad argument or a repository without the tools.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The rows, first match wins. Order is the report's order too: the first four are claims the
// repository is making and getting wrong, which outrank work that is merely waiting.
// `awaiting-approval` matches a change only; `rung-outside-domain` never matches one.
export const ROWS = [
    { id: 'approved-over-question', label: 'Approved over a question', role: 'approver', when: '`approved` or `accepted` with an open `kind: question` note' },
    { id: 'acceptance-lapsed', label: 'Acceptance lapsed', role: 'accepter', when: '`accepted` and the content changed after `accepted-at`' },
    { id: 'stale-approval', label: 'Stale approval', role: 'approver', when: '`approved` and the content changed after `approved-at`' },
    { id: 'objected-since-approval', label: 'Objected to since approval', role: 'approver', when: '`approved` with an open note dated after `approved-at`' },
    { id: 'open-notes', label: 'Open notes', role: 'author', when: 'any other unit with an open note; `who` is the last author of its lines' },
    { id: 'awaiting-acceptance', label: 'Awaiting acceptance', role: 'accepter', when: '`approved`, signed, and unchanged' },
    { id: 'awaiting-approval', label: 'Awaiting approval', role: 'approver', when: 'a change at `proposed` with no open note' },
    { id: 'rung-outside-domain', label: 'Rung outside domain/', role: 'author', when: "either decision rung, or any of its six record fields, on a chapter outside domain/ — devbook's check reports it" },
    { id: 'unsigned-approval', label: 'Unsigned approval', role: 'approver', when: '`approved` with no `approved-by` or `approved-at`' },
    { id: 'notes-to-sweep', label: 'Notes to sweep', role: 'merger', when: 'resolved notes still in the unit' },
];
const ROW_ORDER = new Map(ROWS.map((row, index) => [row.id, index]));

const RECORD_FIELDS = ['approved-by', 'approved-at', 'approved-hash', 'accepted-by', 'accepted-at', 'accepted-hash'];

// How a lapse was decided. Only `hash` is exact; the git methods compare a commit date with
// the rung's date, and `git-file` over-reports a chapter in a busy file.
export const METHODS = {
    hash: 'the recorded fingerprint against chapter-hash, exact',
    'git-range': "the last commit touching the chapter's heading range against the rung's date",
    'git-file': "the last commit touching the file or change, or uncommitted edits, against the rung's date",
    none: 'no fingerprint and no git history, so the lapse is undecided',
};

/** Load the repository's devbook-meta modules. Null when the tools are not there. */
export async function loadTools(toolsDir) {
    if (!existsSync(join(toolsDir, 'metadata.mjs'))) return null;
    const load = (file) => import(pathToFileURL(join(toolsDir, file)).href);
    const [metadata, delta, demo] = await Promise.all([load('metadata.mjs'), load('delta.mjs'), load('demo.mjs')]);
    return { ...metadata, readChange: delta.readChange, demoReader: demo.demoReader };
}

/** The devbook folders to sweep: `adopted` from the stamp, else what is on disk. */
export function adoptedFolders(root, tools) {
    const names = tools.DEVBOOK_FOLDER_NAMES;
    let adopted = null;
    try {
        const config = JSON.parse(readFileSync(join(root, '.devbook', 'config.json'), 'utf8'));
        const list = config?.components?.devbook?.adopted;
        if (Array.isArray(list)) adopted = list;
    } catch {
        // No stamp: fall back to the folders on disk.
    }
    const source = adopted ? 'stamp' : 'disk';
    const folders = (adopted ?? names).filter((name) => names.includes(name) && existsSync(join(root, tools.DEVBOOK_ROOT, name)));
    return { source, folders };
}

/** Every open change folder: `openspec/changes/<name>/` with a proposal, never `archive/`. */
export function openChanges(root, tools) {
    const base = join(root, ...tools.CHANGES_ROOT.split('/'));
    if (!existsSync(base)) return [];
    return readdirSync(base, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && existsSync(join(base, entry.name, 'proposal.md')))
        .map((entry) => entry.name)
        .sort();
}

function markdownFiles(root, relFolder) {
    const found = [];
    const walk = (rel) => {
        for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
            const child = `${rel}/${entry.name}`;
            if (entry.isDirectory() && entry.name !== '_meta') walk(child);
            else if (entry.isFile() && entry.name.endsWith('.md')) found.push(child);
        }
    };
    walk(relFolder);
    return found.sort();
}

function git(root, args) {
    try {
        return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return null;
    }
}

const dateOf = (value) => (value == null ? null : String(value).slice(0, 10));

/**
 * When the content last moved, and who moved it: `{ method, date, author }`. A file with
 * uncommitted edits answers for the whole file, dated today, because `git log -L` reads line
 * numbers against HEAD and the working copy no longer matches them.
 */
export function lastChange(root, relPath, range, today) {
    if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') return { method: 'none', date: null, author: null };
    const dirty = git(root, ['status', '--porcelain', '--', relPath]);
    if (dirty) return { method: 'git-file', date: today, author: null };
    const parse = (out) => {
        if (!out) return null;
        const [date, author] = out.split('\n')[0].split('\t');
        return { date, author: author ?? null };
    };
    if (range) {
        const hit = parse(git(root, ['log', '-1', '-s', '--date=short', '--format=%ad%x09%an', '-L', `${range[0]},${range[1]}:${relPath}`]));
        if (hit) return { method: 'git-range', ...hit };
    }
    const hit = parse(git(root, ['log', '-1', '--date=short', '--format=%ad%x09%an', '--', relPath]));
    return hit ? { method: 'git-file', ...hit } : { method: 'none', date: null, author: null };
}

/**
 * Whether the content moved after the rung was recorded. `hashField` names the fingerprint
 * the rung carries, `atField` its date. Returns `{ method, changed, date, author }`, with
 * `changed: null` when neither a fingerprint nor a date can decide it.
 */
function lapse(meta, hashField, atField, fingerprint, history) {
    if (meta[hashField]) return { method: 'hash', changed: String(meta[hashField]) !== fingerprint(), date: null, author: null };
    const change = history();
    const at = dateOf(meta[atField]);
    const changed = change.date && at ? change.date > at : null;
    return { ...change, changed };
}

/** Read one unit's notes into the shape the report carries. */
function noteView(note, tools, file = null) {
    const fields = tools.resolveAnnotation(note.fields);
    return {
        ...(file ? { file } : {}),
        ordinal: note.ordinal,
        line: note.line,
        kind: fields.kind,
        status: fields.status,
        author: fields.author ?? null,
        date: dateOf(fields.date),
        ...(fields.quote ? { quote: fields.quote } : {}),
        body: fields.body ?? null,
        ...(Array.isArray(fields.replies) && fields.replies.length ? { replies: fields.replies } : {}),
    };
}

const earliest = (dates) => dates.filter(Boolean).sort()[0] ?? null;

/**
 * Sort one unit — a chapter or a change — into its row, or null when nothing is owed.
 * `unit` carries `{ kind, folder, meta, notes, fingerprint(), history() }`.
 */
export function classify(unit) {
    const { meta, notes } = unit;
    const status = meta.status ?? null;
    const isChange = unit.kind === 'change';
    const open = notes.filter((n) => n.status === 'open');
    const resolved = notes.filter((n) => n.status === 'resolved');
    const approved = status === 'approved';
    const accepted = status === 'accepted';
    const approvedAt = dateOf(meta['approved-at']);
    const result = (row, extra = {}) => ({ row, ...extra });

    const questions = open.filter((n) => n.kind === 'question');
    if ((approved || accepted) && questions.length) {
        return result('approved-over-question', { who: meta[accepted ? 'accepted-by' : 'approved-by'] ?? null, since: earliest(questions.map((n) => n.date)) });
    }

    let lapsed = null;
    if (accepted) {
        lapsed = lapse(meta, 'accepted-hash', 'accepted-at', unit.fingerprint, unit.history);
        if (lapsed.changed) return result('acceptance-lapsed', { who: meta['accepted-by'] ?? null, since: lapsed.date ?? dateOf(meta['accepted-at']), lapse: lapsed });
    }
    if (approved) {
        lapsed = lapse(meta, 'approved-hash', 'approved-at', unit.fingerprint, unit.history);
        if (lapsed.changed) return result('stale-approval', { who: meta['approved-by'] ?? null, since: lapsed.date ?? approvedAt, lapse: lapsed });
        const since = approvedAt ? open.filter((n) => n.date && n.date > approvedAt) : [];
        if (since.length) return result('objected-since-approval', { who: meta['approved-by'] ?? null, since: earliest(since.map((n) => n.date)), lapse: lapsed });
    }
    if (open.length) {
        const author = unit.history().author ?? null;
        return result('open-notes', { who: author, since: earliest(open.map((n) => n.date)), ...(lapsed ? { lapse: lapsed } : {}) });
    }
    const signed = Boolean(meta['approved-by'] && meta['approved-at']);
    if (approved && signed) return result('awaiting-acceptance', { who: null, since: approvedAt, lapse: lapsed });
    if (isChange && (status ?? 'proposed') === 'proposed') return result('awaiting-approval', { who: null, since: null });
    if (!isChange && unit.folder !== 'domain' && (approved || accepted || RECORD_FIELDS.some((f) => meta[f] != null))) {
        return result('rung-outside-domain', { who: meta['approved-by'] ?? meta['accepted-by'] ?? null, since: approvedAt ?? dateOf(meta['accepted-at']) });
    }
    if (approved && !signed) return result('unsigned-approval', { who: meta['approved-by'] ?? null, since: approvedAt, ...(lapsed ? { lapse: lapsed } : {}) });
    if (resolved.length) return result('notes-to-sweep', { who: null, since: earliest(resolved.map((n) => n.date)) });
    return null;
}

function daysBetween(from, to) {
    if (!from || !to) return null;
    const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
    return Number.isNaN(ms) ? null : Math.max(0, Math.round(ms / 86400000));
}

function entry(unit, verdict, today) {
    const row = ROWS[ROW_ORDER.get(verdict.row)];
    const shown = verdict.row === 'notes-to-sweep' ? unit.notes.filter((n) => n.status === 'resolved') : unit.notes.filter((n) => n.status === 'open');
    // Flags first, then reading order.
    shown.sort((a, b) => (a.kind === 'flag' ? 0 : 1) - (b.kind === 'flag' ? 0 : 1));
    const approvedAt = dateOf(unit.meta['approved-at']);
    return {
        row: row.id,
        label: row.label,
        kind: unit.kind,
        address: unit.address,
        folder: unit.folder,
        status: unit.meta.status ?? (unit.kind === 'change' ? 'proposed' : null),
        owedBy: { role: row.role, who: verdict.who ?? null },
        since: verdict.since ?? null,
        waitingDays: daysBetween(verdict.since, today),
        ...(verdict.lapse ? { lapse: { method: verdict.lapse.method, changed: verdict.lapse.changed, ...(verdict.lapse.date ? { lastChange: verdict.lapse.date } : {}) } } : {}),
        notes: shown.map((n) => (approvedAt && n.status === 'open' && n.date && n.date > approvedAt ? { ...n, raisedSinceApproval: true } : n)),
    };
}

function chapterUnits(root, relPath, tools, today, demoText) {
    const markdown = readFileSync(join(root, relPath), 'utf8');
    const lines = markdown.split(/\r?\n/).length;
    const { chapters } = tools.parseDocument(markdown);
    const notes = tools.parseAnnotations(markdown);
    const folder = tools.folderKindForPath(relPath);
    const fileLine = chapters.find((c) => c.level === 1)?.line ?? null;

    const byLine = new Map();
    for (const note of notes) {
        // A note above every heading belongs to the file block, as `annotations.mjs` addresses it.
        const key = note.chapter?.line ?? fileLine ?? 0;
        if (!byLine.has(key)) byLine.set(key, []);
        byLine.get(key).push(noteView(note, tools));
    }

    const units = [];
    chapters.forEach((chapter, index) => {
        const ownNotes = byLine.get(chapter.line) ?? [];
        if (!chapter.meta && !ownNotes.length) return;
        const next = chapters.slice(index + 1).find((c) => c.level <= chapter.level);
        const range = [chapter.line, next ? next.line - 1 : lines];
        let history = null;
        units.push({
            kind: 'chapter',
            folder,
            address: chapter.level === 1 ? relPath : `${relPath}#${chapter.slug}`,
            meta: chapter.meta ?? {},
            notes: ownNotes,
            fingerprint: () => tools.chapterFingerprint(relPath, markdown, chapter.line, demoText),
            history: () => (history ??= lastChange(root, relPath, range, today)),
        });
    });
    return units;
}

async function changeUnit(root, name, tools, today) {
    const change = await tools.readChange(root, name);
    const address = `${tools.CHANGES_ROOT}/${name}`;
    const proposalPath = `${address}/proposal.md`;
    const notes = [];
    for (const file of [{ path: proposalPath, markdown: change.proposal }, ...change.deltas]) {
        if (!file.path.endsWith('.md')) continue;
        for (const note of tools.parseAnnotations(file.markdown)) notes.push(noteView(note, tools, file.path));
    }
    const meta = tools.parseDocument(change.proposal).chapters.find((c) => c.level === 1)?.meta ?? {};
    let history = null;
    return {
        kind: 'change',
        folder: 'changes',
        address,
        meta,
        notes,
        fingerprint: () => tools.changeHash(change.proposal, change.deltas),
        history: () => (history ??= lastChange(root, address, null, today)),
    };
}

/** The whole queue for one repository. */
export async function reviewQueue(root, { toolsDir = join(root, '.devbook', '_tools', 'devbook-meta'), today = new Date().toISOString().slice(0, 10) } = {}) {
    const tools = await loadTools(toolsDir);
    if (!tools) throw new Error(`No devbook-meta tools at ${toolsDir}. Run devbook:update, or pass --tools.`);
    const { source, folders } = adoptedFolders(root, tools);
    const changes = openChanges(root, tools);
    const demoText = tools.demoReader(root);

    const units = [];
    for (const folder of folders) {
        for (const relPath of markdownFiles(root, `${tools.DEVBOOK_ROOT}/${folder}`)) units.push(...chapterUnits(root, relPath, tools, today, demoText));
    }
    for (const name of changes) units.push(await changeUnit(root, name, tools, today));

    const rows = [];
    for (const unit of units) {
        const verdict = classify(unit);
        if (verdict) rows.push(entry(unit, verdict, today));
    }
    rows.sort((a, b) => ROW_ORDER.get(a.row) - ROW_ORDER.get(b.row) || (a.address < b.address ? -1 : a.address > b.address ? 1 : 0));

    const methods = [...new Set(rows.map((r) => r.lapse?.method).filter(Boolean))];
    return {
        root,
        today,
        folders: { source, adopted: folders },
        changes,
        rows,
        methods: Object.fromEntries(methods.map((m) => [m, METHODS[m]])),
    };
}

/** The queue as a readable table, grouped by who owes the next move. */
export function renderText(queue) {
    const out = [`Review queue — ${queue.rows.length} owed, folders ${queue.folders.adopted.join(', ') || '(none)'} (from ${queue.folders.source}), ${queue.changes.length} open change(s)`];
    if (!queue.rows.length) return `${out[0]}\n\nNothing is waiting.`;
    const groups = new Map();
    for (const row of queue.rows) {
        const key = row.owedBy.who ? `${row.owedBy.who} (${row.owedBy.role})` : `whoever ${row.owedBy.role === 'merger' ? 'merges the branch' : `is the ${row.owedBy.role}`}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }
    for (const [who, rows] of groups) {
        out.push('', `## ${who}`, '', '| Row | Address | Waiting | Lapse | Notes |', '| --- | --- | --- | --- | --- |');
        for (const row of rows) {
            const waiting = row.since ? `${row.waitingDays ?? '?'}d since ${row.since}` : '—';
            const notes = row.notes.map((n) => `${n.kind}${n.raisedSinceApproval ? ' (since approval)' : ''}: ${String(n.body ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ')}`).join('<br>') || '—';
            out.push(`| ${row.label} | \`${row.address}\` | ${waiting} | ${row.lapse?.method ?? '—'} | ${notes} |`);
        }
    }
    const methods = Object.entries(queue.methods);
    if (methods.length) out.push('', 'Lapse methods: ' + methods.map(([m, text]) => `${m} — ${text}`).join('; '));
    return out.join('\n');
}

function parseArgs(argv) {
    const args = { root: process.cwd(), tools: null, today: undefined, json: false };
    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];
        if (flag === '--json') args.json = true;
        else if (['--root', '--tools', '--today'].includes(flag) && argv[i + 1]) args[flag.slice(2)] = argv[++i];
        else throw new Error(`Unknown argument: ${flag}`);
    }
    return args;
}

export async function main(argv) {
    let args;
    try {
        args = parseArgs(argv);
    } catch (error) {
        console.error(`${error.message}\nUsage: node review-queue.mjs [--root <repo>] [--tools <dir>] [--today <YYYY-MM-DD>] [--json]`);
        return 1;
    }
    const root = resolve(args.root);
    try {
        const queue = await reviewQueue(root, { ...(args.tools ? { toolsDir: resolve(args.tools) } : {}), ...(args.today ? { today: args.today } : {}) });
        console.log(args.json ? JSON.stringify(queue, null, 2) : renderText(queue));
        return 0;
    } catch (error) {
        console.error(error.message);
        return 1;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    process.exit(await main(process.argv.slice(2)));
}
