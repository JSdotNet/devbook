import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RETIRED, main, retire } from './migrate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(HERE, '..', '..');
const catalog = readdirSync(join(PLUGIN, 'resources', 'schedules'))
    .filter((f) => f.endsWith('.schedule.md'))
    .map((f) => f.replace(/\.schedule\.md$/, ''));

/** A repository whose stack config carries `schedule` under components. */
function repo(schedule) {
    const root = mkdtempSync(join(tmpdir(), 'retired-schedules-'));
    mkdirSync(join(root, '.devbook'));
    const config = { id: 'x', components: schedule ? { schedule } : {} };
    writeFileSync(join(root, '.devbook', 'config.json'), JSON.stringify(config, null, 2));
    return root;
}

const quiet = async (argv) => {
    const log = console.log;
    console.log = () => {};
    try { return await main(argv); } finally { console.log = log; }
};

test('every retired name is gone from the catalog, and no shipped name is retired', () => {
    const titles = readdirSync(join(PLUGIN, 'resources', 'schedules'))
        .map((f) => readFileSync(join(PLUGIN, 'resources', 'schedules', f), 'utf8').match(/^title: (.+)$/m)?.[1].trim());
    for (const [name, title] of Object.entries(RETIRED)) {
        assert.equal(catalog.includes(name), false, name);
        assert.equal(existsSync(join(PLUGIN, 'resources', 'schedules', `${name}.schedule.md`)), false);
        assert.equal(titles.includes(title), false, `${title} is a shipped title`);
    }
    assert.ok(catalog.includes('devbook-verify'), 'devbook-verify stays');
});

test('the contract keeps a Retired Schedules row for each, title included, so update finds the routine', () => {
    const contract = readFileSync(join(PLUGIN, 'resources', 'schedule-catalog-contract.md'), 'utf8');
    for (const [name, title] of Object.entries(RETIRED)) {
        assert.ok(contract.includes(`| \`${name}\` | ${title} | 1.32.0 |`), name);
    }
});

test('a retired name is dropped from enabled and overrides, the rest kept in order', () => {
    const entry = {
        pluginVersion: '1.26.0',
        enabled: ['devbook-validate', 'morning-brief', 'merge-review', 'devbook-pull-sweep'],
        overrides: { 'devbook-pull-sweep': { maxResolve: 1 }, 'merge-review': { cron: '0 7 * * 1-5' } },
    };
    const before = structuredClone(entry);
    const { entry: next, dropped } = retire(entry);
    assert.deepEqual(next, {
        pluginVersion: '1.26.0',
        enabled: ['devbook-validate', 'merge-review'],
        overrides: { 'merge-review': { cron: '0 7 * * 1-5' } },
    });
    assert.deepEqual(dropped, ['devbook-pull-sweep', 'morning-brief']);
    assert.deepEqual(entry, before, 'the entry passed in is unchanged');
});

test('an override alone counts, and a missing key is not added', () => {
    const { entry, dropped } = retire({ pluginVersion: '1.26.0', overrides: { 'devbook-push-sweep': { maxResolve: 2 } } });
    assert.deepEqual(entry, { pluginVersion: '1.26.0', overrides: {} });
    assert.deepEqual(dropped, ['devbook-push-sweep']);
});

test('a selection with nothing retired comes back equal, with nothing dropped', () => {
    const selection = { pluginVersion: '1.32.0', enabled: catalog, overrides: { 'issue-sweep': { maxResolve: 3 } } };
    const { entry, dropped } = retire(selection);
    assert.deepEqual(entry, selection);
    assert.deepEqual(dropped, []);
});

test('--check exits 1 while the stamp names a retired schedule, and 0 once update drops it', async () => {
    const root = repo({ pluginVersion: '1.26.0', enabled: ['devbook-validate', 'morning-brief', 'tech-update', 'merge-review'] });
    assert.equal(await quiet(['--check', '--root', root]), 1);

    // Without --check the plan is printed and nothing is written: update is the stamp's writer.
    const path = join(root, '.devbook', 'config.json');
    const before = readFileSync(path, 'utf8');
    assert.equal(await quiet(['--root', root]), 0);
    assert.equal(readFileSync(path, 'utf8'), before);

    // What update's step 7 writes: the selection retire() returns.
    const config = JSON.parse(before);
    config.components.schedule = { ...retire(config.components.schedule).entry, pluginVersion: '1.32.0' };
    writeFileSync(path, JSON.stringify(config, null, 2));
    assert.equal(await quiet(['--check', '--root', root]), 0);
    assert.deepEqual(config.components.schedule.enabled, ['devbook-validate', 'tech-update', 'merge-review']);
});

test('no stack config, or no schedule stamp, is nothing to do', async () => {
    assert.equal(await quiet(['--check', '--root', mkdtempSync(join(tmpdir(), 'retired-schedules-'))]), 0);
    assert.equal(await quiet(['--check', '--root', repo(null)]), 0);
});
