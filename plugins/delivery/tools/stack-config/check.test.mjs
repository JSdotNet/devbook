import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    checkLocalOverlay,
    checkStackConfig,
    mergeStackConfig,
    overlayPaths,
    userConfigDir,
} from './check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
    readFileSync(join(HERE, '..', '..', 'resources', 'config.schema.json'), 'utf8'),
);

const check = (config) => checkStackConfig(config, schema);

test('an empty config is valid', () => {
    assert.deepEqual(check({}), []);
});

test('a component entry is left to its own component', () => {
    assert.deepEqual(check({ components: { devbook: { anything: true } } }), []);
});

test('a top-level key that is neither engine-owned nor a component is rejected by name', () => {
    const errors = check({ polciy: { 'qa.depth': 'targeted' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown top-level key "polciy"/);
});

test('a stray top-level key is caught even when everything owned is valid', () => {
    const errors = check({ policy: { 'qa.depth': 'targeted' }, extenions: { spec: null } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown top-level key "extenions"/);
});

test('a JSON annotation belongs to nobody and is neither owned nor unknown', () => {
    assert.deepEqual(check({ $schema: './config.schema.json', $comment: 'ours' }), []);
});

test('id is a folder name: lowercase, digits, single hyphens', () => {
    assert.deepEqual(check({ id: 'jsdotnet-devbook' }), []);
    assert.deepEqual(check({ id: 'app2' }), []);
    for (const bad of ['JSdotNet/devbook', 'My Repo', '-lead', 'trail-', 'a--b', '']) {
        assert.ok(check({ id: bad }).length, bad);
    }
    assert.match(check({ id: 'My Repo' })[0], /is not a repository id/);
});

test('the shipped template validates as it stands', () => {
    const template = JSON.parse(
        readFileSync(join(HERE, '..', '..', 'resources', 'config-template.json'), 'utf8'),
    );
    assert.deepEqual(check(template), []);
});

test('pr.base takes a git ref name and refuses prose', () => {
    assert.deepEqual(check({ policy: { 'pr.base': 'main' } }), []);
    assert.deepEqual(check({ policy: { 'pr.base': 'release/2.0' } }), []);
    for (const bad of ['the default branch', 'feature..old', 'main.lock', '/main', 'main/', '']) {
        assert.ok(check({ policy: { 'pr.base': bad } }).length, bad);
    }
    assert.match(
        check({ policy: { 'pr.base': 'the default branch' } })[0],
        /is not a well-formed git ref name/,
    );
});

test('the worked example from the surface contract validates', () => {
    assert.deepEqual(
        check({
            bindings: {
                'delivery.tracker': { provider: 'github' },
                'delivery.roles': { architecture: 'your-architecture-plugin', ux: null },
                'delivery.mcp': { spec: ['your-guidelines-server'], 'qa.run': ['playwright'] },
            },
            extensions: {
                'session.start': ['devbook:load-context'],
                spec: 'your-architecture-plugin:draft-spec',
                'data.prepare': [{ run: 'repo:seed-test-data', 'on-failure': 'required' }],
                'app.start': { provider: 'your-qa-plugin:qa', host: 'aspire' },
            },
            policy: { 'qa.depth': 'targeted', 'validate.retryBudget': 2, 'pr.base': 'main' },
            gates: [
                {
                    at: 'spec',
                    when: 'after',
                    purpose: 'approval',
                    show: 'artifact',
                    unattended: 'block',
                },
            ],
        }),
        [],
    );
});

test('an unknown policy key is rejected, not ignored', () => {
    const errors = check({ policy: { 'qa.dept': 'targeted' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown key "qa\.dept"/);
});

test('a point outside the closed set is rejected', () => {
    const errors = check({ extensions: { 'deploy.run': 'repo:ship' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown key "deploy\.run"/);
});

test('validate and verify are two points: the build point takes a retry budget, the spec check does not', () => {
    assert.deepEqual(
        check({
            extensions: { validate: 'your-coding-plugin:coding', verify: 'devbook:verify-change' },
            policy: { 'validate.retryBudget': 2 },
            gates: [{ at: 'verify', when: 'after', purpose: 'risk' }],
        }),
        [],
    );
    const errors = check({ policy: { 'verify.retryBudget': 2 } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown key "verify\.retryBudget"/);
});

test('an out-of-enum policy value is rejected', () => {
    const errors = check({ policy: { 'qa.depth': 'thorough' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /not one of full, targeted, startup-only, skipped/);
});

test('personalValidation may only say required', () => {
    assert.deepEqual(check({ policy: { 'gate.personalValidation': 'required' } }), []);
    assert.equal(check({ policy: { 'gate.personalValidation': 'optional' } }).length, 1);
});

test('commit.at takes gate or manual and nothing else', () => {
    assert.deepEqual(check({ policy: { 'commit.at': 'gate' } }), []);
    assert.deepEqual(check({ policy: { 'commit.at': 'manual' } }), []);
    assert.equal(check({ policy: { 'commit.at': 'every-stage' } }).length, 1);
});

test('a gate needs at, when, and purpose', () => {
    const errors = check({ gates: [{ at: 'spec' }] });
    assert.equal(errors.length, 2);
    assert.match(errors.join(' '), /missing required key "when"/);
    assert.match(errors.join(' '), /missing required key "purpose"/);
});

test('a gate may not attach to a point the engine does not declare', () => {
    const errors = check({ gates: [{ at: 'deploy', when: 'before', purpose: 'risk' }] });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /"deploy" is not one of/);
});

test('a negative budget is rejected', () => {
    assert.equal(check({ policy: { 'gate.reviseBudget': -1 } }).length, 1);
});

test('a chore point takes a list, not a bare provider', () => {
    assert.deepEqual(check({ extensions: { 'flow.end': ['delivery:capture-improvement'] } }), []);
    assert.equal(check({ extensions: { 'flow.end': 'delivery:capture-improvement' } }).length, 1);
});

test('a chore on-failure value is a closed enum', () => {
    const errors = check({ extensions: { 'flow.end': [{ run: 'repo:docs', 'on-failure': 'maybe' }] } });
    assert.equal(errors.length, 1);
});

test('null binds a role deliberately, which is not the same as absent', () => {
    assert.deepEqual(check({ bindings: { 'delivery.roles': { security: null } } }), []);
    assert.equal(check({ bindings: { 'delivery.roles': { security: 42 } } }).length, 1);
});

test('the tracker provider set is closed', () => {
    assert.deepEqual(check({ bindings: { 'delivery.tracker': { provider: 'jira', project: 'FIN' } } }), []);
    assert.equal(check({ bindings: { 'delivery.tracker': { provider: 'trello' } } }).length, 1);
});

test('an MCP server binds to a point in the closed set, never to a free name', () => {
    assert.deepEqual(check({ bindings: { 'delivery.mcp': { implement: ['microsoft-learn'] } } }), []);
    const errors = check({ bindings: { 'delivery.mcp': { 'stage-1': ['your-guidelines-server'] } } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown key "stage-1"/);
});

test('a point takes a list of server ids, or null for deliberately none', () => {
    assert.deepEqual(check({ bindings: { 'delivery.mcp': { spec: null } } }), []);
    assert.equal(check({ bindings: { 'delivery.mcp': { spec: 'your-guidelines-server' } } }).length, 1);
    assert.equal(check({ bindings: { 'delivery.mcp': { spec: ['mcp__plugin x'] } } }).length, 1);
});

test('no model key exists anywhere in the engine-owned config', () => {
    assert.equal(check({ policy: { model: 'opus' } }).length, 1);
    assert.equal(check({ bindings: { 'delivery.model': 'opus' } }).length, 1);
});

// The local overlay — .devbook/config.local.json, gitignored, one machine's own.

test('the overlay wins key by key and leaves its siblings standing', () => {
    const merged = mergeStackConfig(
        { policy: { 'qa.depth': 'targeted', 'validate.retryBudget': 2 } },
        { policy: { 'qa.depth': 'startup-only' } },
    );
    assert.deepEqual(merged.policy, { 'qa.depth': 'startup-only', 'validate.retryBudget': 2 });
});

test('the overlay merges into a nested binding without flattening its neighbours', () => {
    const merged = mergeStackConfig(
        { bindings: { 'delivery.roles': { qa: null, architecture: 'team-arch' } } },
        { bindings: { 'delivery.roles': { qa: 'my-local-qa' } } },
    );
    assert.deepEqual(merged.bindings['delivery.roles'], {
        qa: 'my-local-qa',
        architecture: 'team-arch',
    });
});

test('an array replaces rather than concatenating — half a chore list runs nothing sane', () => {
    const merged = mergeStackConfig(
        { extensions: { 'session.start': ['devbook:check', 'repo:a'] } },
        { extensions: { 'session.start': ['repo:b'] } },
    );
    assert.deepEqual(merged.extensions['session.start'], ['repo:b']);
});

test('gates append, so an overlay can add a checkpoint and cannot spell removing one', () => {
    const base = { gates: [{ at: 'spec', when: 'after', purpose: 'approval' }] };
    const merged = mergeStackConfig(base, {
        gates: [{ at: 'app.start', when: 'before', purpose: 'resource' }],
    });
    assert.equal(merged.gates.length, 2);
    assert.equal(merged.gates[0].at, 'spec');

    // The one that matters: an overlay naming an empty list still keeps every base gate.
    assert.deepEqual(mergeStackConfig(base, { gates: [] }).gates, base.gates);
});

test('null in the overlay is deliberately unbound, never a delete', () => {
    const merged = mergeStackConfig(
        { bindings: { 'delivery.tracker': { provider: 'github' } } },
        { bindings: { 'delivery.tracker': null } },
    );
    assert.equal(merged.bindings['delivery.tracker'], null);
});

test('the overlay never carries a component stamp', () => {
    const errors = checkLocalOverlay({ components: { devbook: { pluginVersion: '2.0.0' } } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /repo-scope/);
});

test('the overlay never carries an id — the id is what found it', () => {
    const errors = checkLocalOverlay({ id: 'other' });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /found this overlay/);
});

test('the overlay may not touch what the repository produces', () => {
    for (const key of ['pr.required', 'qa.ceiling', 'gate.personalValidation']) {
        const errors = checkLocalOverlay({ policy: { [key]: key === 'pr.required' ? false : 'full' } });
        assert.equal(errors.length, 1, key);
        assert.match(errors[0], /locked/);
    }
});

test('an ordinary overlay is refused nothing', () => {
    assert.deepEqual(
        checkLocalOverlay({
            policy: { 'qa.depth': 'startup-only', 'validate.retryBudget': 0 },
            bindings: { 'delivery.roles': { qa: 'my-local-qa' } },
            gates: [{ at: 'implement', when: 'before', purpose: 'cost' }],
        }),
        [],
    );
});

test('an overlay is still schema-checked, so a typo in it is rejected by name', () => {
    const errors = check({ policy: { 'qa.dpeth': 'full' } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /unknown key "qa.dpeth"/);
});

// `ext` — a plugin's machine-scope state, `ext.<plugin>.<key>`, the overlay-side
// counterpart of `components`: refused in the committed file, opaque in an overlay.

const checkOverlay = (config) => checkStackConfig(config, schema, { overlay: true });

test('ext is refused in the committed config and pointed at the overlay', () => {
    const errors = check({ ext: { schedule: { environment: 'cloud' } } });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^ext: machine-scope/);
});

test('ext in an overlay is carried through opaque: the engine reads none of its keys', () => {
    assert.deepEqual(checkOverlay({ ext: { schedule: { environment: 'cloud', model: 'sonnet' } } }), []);
    assert.deepEqual(checkOverlay({ ext: {} }), []);
    assert.deepEqual(checkLocalOverlay({ ext: { schedule: { model: 'opus' } } }), []);
});

test('ext is only shape-checked as far as it takes to be addressable', () => {
    assert.match(checkOverlay({ ext: 'cloud' })[0], /^ext: expected an object keyed by plugin/);
    assert.match(checkOverlay({ ext: { schedule: 'cloud' } })[0], /^ext\.schedule: expected an object/);
});

test('the shipped overlay template validates as an overlay and is refused as the committed file', () => {
    const template = JSON.parse(
        readFileSync(join(HERE, '..', '..', 'resources', 'config.local-template.json'), 'utf8'),
    );
    assert.deepEqual([...checkLocalOverlay(template), ...checkOverlay(template)], []);
    assert.equal(check(template).length, 1);
});

test('ext survives the merge, later layers winning key by key', () => {
    const merged = [
        { ext: { schedule: { environment: 'cloud', model: 'sonnet' } } },
        { ext: { schedule: { model: 'opus' } } },
    ].reduce(mergeStackConfig, { policy: { 'qa.depth': 'full' } });
    assert.deepEqual(merged.ext, { schedule: { environment: 'cloud', model: 'opus' } });
    assert.deepEqual(checkOverlay(merged), []);
});

// Where the overlays are found — three layers, outermost first, resolved from the
// committed id and the user's config directory rather than from the checkout alone.

const unixHome = { env: {}, platform: 'linux', home: '/home/me' };

test('XDG_CONFIG_HOME wins on every platform when it is set', () => {
    for (const platform of ['linux', 'darwin', 'win32']) {
        const dir = userConfigDir({ env: { XDG_CONFIG_HOME: '/xdg', APPDATA: 'C:\\AppData' }, platform, home: '/h' });
        assert.equal(dir, join('/xdg', 'devbook'), platform);
    }
});

test('without it, Windows uses APPDATA and everything else ~/.config', () => {
    assert.equal(
        userConfigDir({ env: { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, platform: 'win32', home: 'C:\\Users\\me' }),
        join('C:\\Users\\me\\AppData\\Roaming', 'devbook'),
    );
    assert.equal(userConfigDir(unixHome), join('/home/me', '.config', 'devbook'));
});

test('three layers, outermost first, when the config carries an id', () => {
    const layers = overlayPaths('/repo/.devbook/config.json', 'my-repo', unixHome);
    assert.deepEqual(
        layers.map((l) => l.scope),
        ['user', 'repository', 'checkout'],
    );
    assert.equal(layers[0].path, join('/home/me/.config/devbook', 'config.local.json'));
    assert.equal(layers[1].path, join('/home/me/.config/devbook', 'repos', 'my-repo', 'config.local.json'));
    assert.equal(layers[2].path, join('/repo/.devbook', 'config.local.json'));
});

test('no id, no repository layer — a machine cannot key on a name the repo never chose', () => {
    const layers = overlayPaths('/repo/.devbook/config.json', null, unixHome);
    assert.deepEqual(
        layers.map((l) => l.scope),
        ['user', 'checkout'],
    );
});

test('the checkout layer is found beside the config, whatever the config is called', () => {
    const [, , checkout] = overlayPaths('/x/stack.json', 'r', unixHome);
    assert.equal(checkout.path, join('/x', 'stack.local.json'));
});

test('layers merge in order: the later wins per key, and every layer keeps its gates', () => {
    const base = {
        policy: { 'qa.depth': 'full', 'verify.retryBudget': 2 },
        gates: [{ at: 'spec', when: 'after', purpose: 'approval' }],
    };
    const user = { policy: { 'verify.retryBudget': 0 }, gates: [] };
    const repo = {
        policy: { 'qa.depth': 'targeted' },
        gates: [{ at: 'implement', when: 'before', purpose: 'cost' }],
    };
    const checkout = { policy: { 'qa.depth': 'startup-only' } };

    const merged = [user, repo, checkout].reduce(mergeStackConfig, base);
    assert.deepEqual(merged.policy, { 'qa.depth': 'startup-only', 'verify.retryBudget': 0 });
    assert.deepEqual(
        merged.gates.map((g) => g.at),
        ['spec', 'implement'],
    );
});
