import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadTools, renderText, reviewQueue } from './review-queue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// The source of the copy `devbook:update` vendors into `.devbook/_tools/devbook-meta/`.
const TOOLS = resolve(HERE, '../../devbook/tools/devbook-meta');
const TODAY = '2026-10-14';
const tools = await loadTools(TOOLS);

function repo(files) {
    const root = mkdtempSync(join(tmpdir(), 'review-queue-'));
    for (const [rel, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, rel)), { recursive: true });
        writeFileSync(join(root, rel), text);
    }
    return root;
}

const queue = (root) => reviewQueue(root, { toolsDir: TOOLS, today: TODAY });
const rowOf = (q, address) => q.rows.find((r) => r.address === address)?.row ?? null;

const note = ({ kind = 'comment', status = 'open', date = '2026-10-01', body = 'Why?' } = {}) =>
    ['```annotation', `kind: ${kind}`, `status: ${status}`, 'author: "@rev"', `date: ${date}`, `body: ${body}`, '```', ''].join('\n');

// A domain page whose one chapter carries the given meta lines and notes.
function domainPage(metaLines, notes = '') {
    return ['# Orders', '', '```meta', 'status: active', '```', '', '## Refunds', '', '```meta', ...metaLines, '```', '', notes, 'Refunds are accepted within 30 days.', ''].join('\n');
}

// The fingerprint chapter-hash.mjs prints for the Refunds chapter of a page.
function refundsHash(rel, markdown) {
    const line = tools.parseDocument(markdown).chapters.find((c) => c.slug === 'refunds').line;
    return tools.chapterFingerprint(rel, markdown, line, null);
}

const PAGE = '.devbook/domain/orders/domain.md';
const ADDRESS = `${PAGE}#refunds`;
const STAMP = (adopted) => JSON.stringify({ components: { devbook: { adopted } } });

function approvedPage({ hash = true, notes = '', extra = [] } = {}) {
    const base = ['status: approved', 'approved-by: "@lead"', 'approved-at: 2026-10-05', ...extra];
    const draft = domainPage(base, notes);
    return hash ? domainPage([...base, `approved-hash: "${refundsHash(PAGE, draft)}"`], notes) : draft;
}

test('an approval standing over an open question outranks everything else', async () => {
    const root = repo({ [PAGE]: approvedPage({ notes: note({ kind: 'question' }) }) });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'approved-over-question');
    assert.equal(q.rows[0].owedBy.who, '@lead');
});

test('an approval whose fingerprint still matches is awaiting acceptance, decided by hash', async () => {
    const root = repo({ [PAGE]: approvedPage() });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'awaiting-acceptance');
    assert.equal(q.rows[0].lapse.method, 'hash');
    assert.equal(q.rows[0].waitingDays, 9);
});

test('an approval whose fingerprint differs is stale, exactly, with no git', async () => {
    const root = repo({ [PAGE]: approvedPage({ extra: ['approved-hash: "sha256:00000000"'], hash: false }) });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'stale-approval');
    assert.deepEqual(q.rows[0].lapse, { method: 'hash', changed: true });
});

test('a note dated after approved-at is an objection since approval', async () => {
    const root = repo({ [PAGE]: approvedPage({ notes: note({ kind: 'flag', date: '2026-10-09' }) }) });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'objected-since-approval');
    assert.equal(q.rows[0].notes[0].raisedSinceApproval, true);
});

test('an accepted chapter whose content moved lapses its acceptance', async () => {
    const page = domainPage(['status: accepted', 'approved-by: "@lead"', 'approved-at: 2026-10-01', 'accepted-by: "@po"', 'accepted-at: 2026-10-02', 'accepted-hash: "sha256:00000000"']);
    const q = await queue(repo({ [PAGE]: page }));
    assert.equal(rowOf(q, ADDRESS), 'acceptance-lapsed');
    assert.equal(q.rows[0].owedBy.who, '@po');
});

test('open notes on an unapproved chapter are owed by its author, flags first', async () => {
    const root = repo({ [PAGE]: domainPage(['status: draft'], note({ body: 'later' }) + note({ kind: 'flag', body: 'first' })) });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'open-notes');
    assert.equal(q.rows[0].owedBy.role, 'author');
    assert.deepEqual(q.rows[0].notes.map((n) => n.body), ['first', 'later']);
});

test('a decision rung outside domain/ is reported, and an unsigned one in domain/', async () => {
    const root = repo({
        '.devbook/arc42/05-building-blocks.md': ['# Blocks', '', '```meta', 'status: approved', 'approved-by: "@lead"', 'approved-at: 2026-10-05', 'approved-hash: "x"', '```', ''].join('\n'),
        [PAGE]: domainPage(['status: approved']),
    });
    const q = await queue(root);
    assert.equal(rowOf(q, '.devbook/arc42/05-building-blocks.md'), 'stale-approval');
    assert.equal(rowOf(q, ADDRESS), 'unsigned-approval');
});

test('an arc42 chapter carrying only a record field is a rung outside domain/', async () => {
    const root = repo({ '.devbook/arc42/01-intro.md': ['# Intro', '', '```meta', 'status: active', 'accepted-by: "@po"', '```', ''].join('\n') });
    assert.equal(rowOf(await queue(root), '.devbook/arc42/01-intro.md'), 'rung-outside-domain');
});

test('resolved notes are left to sweep, and a quiet chapter is not reported', async () => {
    const root = repo({
        [PAGE]: domainPage(['status: active'], note({ status: 'resolved' })),
        '.devbook/domain/orders/context.md': ['# Orders', '', '```meta', 'status: active', '```', ''].join('\n'),
    });
    const q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'notes-to-sweep');
    assert.equal(q.rows.length, 1);
});

test('only the stamped folders are swept; the disk is the fallback', async () => {
    const files = { [PAGE]: domainPage(['status: draft'], note()), '.devbook/arc42/a.md': ['# A', '', note()].join('\n') };
    const stamped = await queue(repo({ ...files, '.devbook/config.json': STAMP(['arc42']) }));
    assert.deepEqual(stamped.folders, { source: 'stamp', adopted: ['arc42'] });
    assert.deepEqual(stamped.rows.map((r) => r.address), ['.devbook/arc42/a.md']);
    const unstamped = await queue(repo(files));
    assert.deepEqual(unstamped.folders, { source: 'disk', adopted: ['arc42', 'domain'] });
});

test('_meta/ is never read', async () => {
    const root = repo({ '.devbook/arc42/_meta/x.md': ['# X', '', note()].join('\n') });
    assert.equal((await queue(root)).rows.length, 0);
});

test('a change is one row over its proposal and every delta, archive excluded', async () => {
    const proposal = (meta) => ['# Add refunds', '', '```meta', ...meta, '```', '', '## Why', '', 'Because.', ''].join('\n');
    const delta = ['# Orders', '', '## ADDED Requirements', '', 'Text.', '', note({ kind: 'question' })].join('\n');
    const root = repo({
        'openspec/changes/quiet/proposal.md': proposal(['status: proposed']),
        'openspec/changes/asked/proposal.md': proposal(['status: proposed']),
        'openspec/changes/asked/devbook-delta/domain/orders/requirements.md': delta,
        'openspec/changes/archive/old/proposal.md': proposal(['status: proposed']),
    });
    const q = await queue(root);
    assert.deepEqual(q.changes, ['asked', 'quiet']);
    assert.equal(rowOf(q, 'openspec/changes/quiet'), 'awaiting-approval');
    assert.equal(rowOf(q, 'openspec/changes/asked'), 'open-notes');
    assert.equal(q.rows.find((r) => r.address === 'openspec/changes/asked').notes[0].file, 'openspec/changes/asked/devbook-delta/domain/orders/requirements.md');
});

test("a change's fingerprint is the whole change's", async () => {
    const proposalText = (hash) => ['# Add refunds', '', '```meta', 'status: approved', 'approved-by: "@lead"', 'approved-at: 2026-10-05', `approved-hash: "${hash}"`, '```', ''].join('\n');
    const root = repo({ 'openspec/changes/c/proposal.md': proposalText('pending') });
    const { readChange, changeHash } = tools;
    const change = await readChange(root, 'c');
    const hash = changeHash(change.proposal, change.deltas);
    writeFileSync(join(root, 'openspec/changes/c/proposal.md'), proposalText(hash));
    assert.equal(rowOf(await queue(root), 'openspec/changes/c'), 'awaiting-acceptance');
    mkdirSync(join(root, 'openspec/changes/c/devbook-delta/domain'), { recursive: true });
    writeFileSync(join(root, 'openspec/changes/c/devbook-delta/domain/x.md'), '# X\n\nNew.\n');
    assert.equal(rowOf(await queue(root), 'openspec/changes/c'), 'stale-approval');
});

test('without a fingerprint the lapse falls back to git over the heading range', async (t) => {
    const root = repo({ [PAGE]: approvedPage({ hash: false }) + '\n## Elsewhere\n\nUntouched.\n' });
    const run = (args, date) => execFileSync('git', ['-C', root, ...args], { env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: 'a@x', GIT_COMMITTER_NAME: 'a', GIT_COMMITTER_EMAIL: 'a@x' }, stdio: 'ignore' });
    try {
        run(['init', '-q'], '2026-10-05T12:00:00');
    } catch {
        t.skip('git is not available');
        return;
    }
    run(['add', '.'], '2026-10-05T12:00:00');
    run(['commit', '-qm', 'approve'], '2026-10-05T12:00:00');
    let q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'awaiting-acceptance');
    assert.equal(q.rows[0].lapse.method, 'git-range');

    // An edit to another chapter in the same file does not lapse this one.
    writeFileSync(join(root, PAGE), readFileSync(join(root, PAGE), 'utf8').replace('Untouched.', 'Touched.'));
    run(['commit', '-qam', 'elsewhere'], '2026-10-08T12:00:00');
    q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'awaiting-acceptance');

    writeFileSync(join(root, PAGE), readFileSync(join(root, PAGE), 'utf8').replace('30 days', '14 days'));
    run(['commit', '-qam', 'shorten'], '2026-10-09T12:00:00');
    q = await queue(root);
    assert.equal(rowOf(q, ADDRESS), 'stale-approval');
    assert.deepEqual(q.rows[0].lapse, { method: 'git-range', changed: true, lastChange: '2026-10-09' });

    // Uncommitted edits answer for the whole file, dated today.
    writeFileSync(join(root, PAGE), readFileSync(join(root, PAGE), 'utf8') + '\nMore.\n');
    q = await queue(root);
    assert.equal(q.rows[0].lapse.method, 'git-file');
});

test('the text report groups by who owes the next move and names the method', async () => {
    const q = await queue(repo({ [PAGE]: approvedPage() }));
    const text = renderText(q);
    assert.match(text, /## whoever is the accepter/);
    assert.match(text, /Lapse methods: hash/);
});
