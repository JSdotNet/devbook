#!/usr/bin/env node
// Reports the stack as it actually is: which plugins the catalog offers, which are
// installed and at what version, which are enabled, and how one repository has wired
// the delivery engine.
//
//   node report.mjs [--root <repo>] [--marketplace <name>] [--json]
//
// Reads only; writes nothing. Every fact names the file it came from, so a wrong
// answer is traceable to a stale file rather than to this script.
//
// Exit 0 when the report was produced, 1 on a bad argument.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MARKETPLACE = 'jsdotnet-devbook';

// Which plugin owns each `components.<name>` stamp, what reconciles it, and whether it is
// contract-versioned. The mapping is not derivable — `derived` is written by
// `devbook-derived`, `schedule` by `delivery-schedule` — and it is needed in the direction a
// manifest cannot answer: naming the plugin behind a stamp whose plugin is not installed here.
// Hardcoding it is the same bargain the rest of this script already takes, recorded at
// `.devbook/arc42/adr/plugin-boundaries.md`.
// `devbook-collaboration` is absent on purpose: it materializes nothing and stamps nothing
// (`.devbook/arc42/adr/annotations.md`), so a
// repository adopts it by enabling it and nothing here reconciles it.
//
// `contract: false` is not "has not got round to it". Only a component whose install rewrites
// content the repository authored takes a contract version and a ledger; one that copies files
// it owns whole has hash-matching as its whole migration mechanism. So four of these five will
// never carry those fields, and the table below says `payload-only` rather than leaving a gap
// that reads like drift. See
// `.devbook/arc42/adr/install.md`.
const COMPONENTS = {
    devbook: { plugin: 'devbook', install: 'devbook:install', contract: true },
    derived: { plugin: 'devbook-derived', install: 'devbook-derived:install', contract: false },
    'devbook-procedures': { plugin: 'devbook-procedures', install: 'devbook-procedures:install', contract: false },
    delivery: { plugin: 'delivery', install: 'delivery:install', contract: false },
    schedule: { plugin: 'delivery-schedule', install: 'delivery-schedule:install', contract: false },
};

// The order the reconcile list is run in, and it is not cosmetic: devbook-derived's install
// refuses to run until `components.devbook` names an adopted folder, and delivery-schedule
// checks its targets against the plugins this repository enables, so it wants the settled
// state. `devbook-procedures` sits before `delivery` so that a `start` or `capture` an older
// engine seeded is adopted or replaced before the engine's install releases its claim on it,
// and both sit before schedule because schedule's targets call those procedures. Anything not
// named here follows, alphabetically.
const RECONCILE_ORDER = ['devbook', 'devbook-derived', 'devbook-procedures', 'delivery', 'delivery-schedule'];

// What an update run does with each plugin. The three inputs are orthogonal: installed is a
// fact about this machine, enabled about this checkout, stamped about the repository and
// everyone who shares it.
const SCOPE = {
    reconcile: 'in scope - run its install skill',
    blocked: 'stamped here, not installed on this machine',
    frozen: 'stamped here, not enabled in this checkout',
    adoptable: 'installed and enabled, never adopted here',
    available: 'installed, not enabled, not adopted',
    'out-of-scope': 'not installed and not adopted',
};
const DEVBOOK_FOLDERS = ['arc42', 'domain', 'tech', 'design', 'ai'];
const ENGINE_KEYS = ['bindings', 'extensions', 'policy', 'gates'];
const SERVICES = ['spec', 'implement', 'validate', 'app.start', 'qa.run', 'verify', 'deliver'];
const CHORES = ['session.start', 'flow.start', 'data.prepare', 'flow.end'];

// The engine default per extension point, from **MCP Server Strategy** in `delivery`'s
// `resources/flow-execution-model.md`. Repeated here for the same reason COMPONENTS is: the
// report has to say which server a repository leans on when the delivery plugin is not on
// this machine. A point not listed defaults to none.
const MCP_DEFAULTS = {
    implement: ['microsoft-learn'],
    validate: ['microsoft-learn'],
    'app.start': ['aspire', 'playwright'],
    'qa.run': ['aspire', 'playwright'],
};

// Where a host reads a repository's MCP servers from. `.mcp.json` is read by Claude Code and
// the Copilot CLI, `.vscode/mcp.json` by VS Code, `.github/mcp.json` by the Copilot CLI alone.
const MCP_FILES = [
    { path: '.mcp.json', key: 'mcpServers' },
    { path: '.vscode/mcp.json', key: 'servers' },
    { path: '.github/mcp.json', key: 'mcpServers' },
];

const sources = [];

/** Read a JSON file, recording where it was looked for and what came back. */
function load(what, path) {
    if (!path) {
        sources.push({ what, path: '-', status: 'not resolved' });
        return null;
    }
    if (!existsSync(path)) {
        sources.push({ what, path, status: 'absent' });
        return null;
    }
    try {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        sources.push({ what, path, status: 'read' });
        return value;
    } catch (err) {
        sources.push({ what, path, status: `unreadable - ${err.message}` });
        return null;
    }
}

/** Compare two dotted version strings numerically. */
function compareVersions(a, b) {
    const left = String(a).split(/[.-]/);
    const right = String(b).split(/[.-]/);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const x = Number.parseInt(left[i] ?? '0', 10);
        const y = Number.parseInt(right[i] ?? '0', 10);
        if (Number.isNaN(x) || Number.isNaN(y)) return String(a).localeCompare(String(b));
        if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
}

function gitHead(dir) {
    try {
        return execFileSync('git', ['-C', dir, 'log', '-1', '--format=%h %cs'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return null;
    }
}

/** The directory the host keeps its plugin state in. */
function hostConfigDir() {
    return process.env.CLAUDE_CONFIG_DIR
        ? resolve(process.env.CLAUDE_CONFIG_DIR)
        : join(homedir(), '.claude');
}

/**
 * Find the marketplace catalog twice over: the working tree when this repository is the
 * marketplace source, and the host's clone. Disagreement between them is itself an
 * answer - it means the clone is stale.
 */
function resolveCatalogs(repoRoot, configDir, name) {
    const found = [];

    const localPath = join(repoRoot, '.claude-plugin', 'marketplace.json');
    const local = load('catalog (working tree)', localPath);
    if (local?.name === name) {
        found.push({ origin: 'working tree', root: repoRoot, path: localPath, catalog: local });
    }

    const known = load('known marketplaces', join(configDir, 'plugins', 'known_marketplaces.json'));
    const cloneRoot = known?.[name]?.installLocation ?? join(configDir, 'plugins', 'marketplaces', name);
    const clonePath = join(cloneRoot, '.claude-plugin', 'marketplace.json');
    const clone = load('catalog (host clone)', clonePath);
    if (clone) {
        found.push({
            origin: 'host clone',
            root: cloneRoot,
            path: clonePath,
            catalog: clone,
            lastUpdated: known?.[name]?.lastUpdated ?? null,
            repo: known?.[name]?.source?.repo ?? null,
        });
    }

    return found;
}

/**
 * Merge the enabled-plugin maps the host layers, nearest file last, and keep the paths that
 * answered. A warning about an unenabled binding has to name the settings file it read, so
 * the paths travel with the map rather than being re-derived at render time.
 */
function resolveEnabled(repoRoot, configDir) {
    const files = [
        ['user settings', join(configDir, 'settings.json')],
        ['project settings', join(repoRoot, '.claude', 'settings.json')],
        ['local settings', join(repoRoot, '.claude', 'settings.local.json')],
    ];
    const merged = {};
    const paths = [];
    for (const [what, path] of files) {
        const settings = load(what, path);
        if (!settings) continue;
        paths.push(path);
        Object.assign(merged, settings.enabledPlugins ?? {});
    }
    return { plugins: paths.length ? merged : null, paths };
}

/**
 * The plugin half of a role binding or an extension provider, or null when it names no
 * plugin. A provider is `plugin`, `plugin:skill`, `{ provider }`, or `{ run }`; `repo:<skill>`
 * is the repository's own skill and belongs to no plugin at all.
 */
function bindingPlugin(value) {
    const id = typeof value === 'string'
        ? value
        : value && typeof value === 'object'
            ? (value.provider ?? value.run)
            : null;
    if (typeof id !== 'string' || id.startsWith('repo:')) return null;
    return id.split(':')[0] || null;
}

/**
 * Every `delivery.roles` and `extensions` binding naming a plugin this checkout has not
 * enabled. The engine promises this is a warning and never a failure - a binding is committed
 * and shared, enablement is personal to this checkout, and a stage falls back to what its role
 * reference states. See `resources/surface-contract.md` in the delivery plugin, under Bindings.
 *
 * Marketplace is stripped from the enabled key on purpose: a repository may bind a plugin from
 * a marketplace this report does not read, and calling that unenabled would be a false alarm.
 */
function unenabledBindings(repository, enabled) {
    if (!enabled) return null;
    const on = new Set(
        Object.entries(enabled).filter(([, value]) => value).map(([key]) => key.split('@')[0]),
    );
    const found = [];
    const check = (where, key, value) => {
        const named = (Array.isArray(value) ? value : [value]).map(bindingPlugin).filter(Boolean);
        const missing = [...new Set(named)].filter((name) => !on.has(name));
        if (missing.length) found.push({ where, key, plugins: missing });
    };
    for (const [role, value] of Object.entries(repository.roles ?? {})) {
        check('delivery.roles', role, value);
    }
    for (const point of [...SERVICES, ...CHORES]) {
        if (repository.extensions && point in repository.extensions) {
            check('extensions', point, repository.extensions[point]);
        }
    }
    return found;
}

/** Which versions of which plugins the host has on disk, per `name@marketplace`. */
function resolveInstalled(configDir) {
    const state = load('installed plugins', join(configDir, 'plugins', 'installed_plugins.json'));
    const byKey = new Map();
    for (const [key, entries] of Object.entries(state?.plugins ?? {})) {
        const list = Array.isArray(entries) ? entries : [entries];
        const best = list.slice().sort((a, b) => compareVersions(a.version, b.version)).pop();
        if (best) byKey.set(key, best);
    }
    return byKey;
}

/** The skills a plugin folder actually ships, by directory name. */
function skillNames(pluginRoot) {
    const dir = join(pluginRoot, 'skills');
    if (!existsSync(dir)) return null;
    try {
        return readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
    } catch {
        return null;
    }
}

function buildPluginRows(catalogs, installed, enabled, marketplace, components) {
    const latest = new Map();
    const described = new Map();
    for (const found of catalogs) {
        for (const entry of found.catalog.plugins ?? []) {
            const known = latest.get(entry.name);
            if (!known || compareVersions(entry.version, known.version) > 0) {
                latest.set(entry.name, { version: entry.version, origin: found.origin });
            }
            described.set(entry.name, entry.description ?? '');
        }
    }

    const names = new Set(latest.keys());
    for (const key of installed.keys()) {
        const [name, from] = key.split('@');
        if (from === marketplace) names.add(name);
    }

    return [...names].sort().map((name) => {
        const key = `${name}@${marketplace}`;
        const here = installed.get(key) ?? null;
        const there = latest.get(name) ?? null;
        let state;
        if (!here) state = 'not installed';
        else if (!there) state = 'installed, not in the catalog';
        else {
            const diff = compareVersions(here.version, there.version);
            if (diff === 0) state = 'up to date';
            else if (diff < 0) state = `update available (${here.version} -> ${there.version})`;
            else state = `ahead of the catalog (${here.version} > ${there.version})`;
        }
        // A stamp is repo-scope and committed; installed-ness is personal and per-machine.
        // The two never overrule each other, which is why scope reads all three inputs and
        // why nothing here ever proposes removing a stamp.
        const stampName = Object.keys(COMPONENTS).find((c) => COMPONENTS[c].plugin === name);
        const stamp = stampName ? (components?.[stampName] ?? null) : null;
        const isEnabled = enabled ? Boolean(enabled[key]) : null;

        let scope;
        if (!here) scope = stamp ? 'blocked' : 'out-of-scope';
        else if (isEnabled === false) scope = stamp ? 'frozen' : 'available';
        else scope = stamp ? 'reconcile' : 'adoptable';

        return {
            name,
            latest: there?.version ?? '-',
            installed: here?.version ?? '-',
            installPath: here?.installPath ?? null,
            enabled: isEnabled,
            state,
            scope,
            scopeMeans: SCOPE[scope],
            component: stampName ?? null,
            installSkill: stampName ? COMPONENTS[stampName].install : null,
            stampedVersion: stamp?.pluginVersion ?? null,
            description: described.get(name) ?? '',
        };
    });
}

/**
 * The servers the engine will look for - every id bound under `delivery.mcp`, plus the engine
 * default for each point the binding leaves absent - against the ids the repository's MCP
 * configuration files actually declare. A default is only a name until a host can start the
 * server behind it, so an id in `undeclared` costs its stage its grounding on every machine.
 */
function mcpServers(repoRoot, mcp) {
    const wanted = new Set();
    for (const point of [...SERVICES, ...CHORES]) {
        const bound = mcp && point in mcp ? mcp[point] : MCP_DEFAULTS[point];
        for (const id of bound ?? []) wanted.add(id);
    }
    const files = MCP_FILES.map(({ path, key }) => {
        const value = load('MCP configuration', join(repoRoot, path));
        const servers = value?.[key];
        return {
            path,
            present: Boolean(value),
            servers: servers && typeof servers === 'object' ? Object.keys(servers) : [],
        };
    });
    const declared = new Set(files.flatMap((file) => file.servers));
    return {
        wanted: [...wanted],
        files,
        undeclared: [...wanted].filter((id) => !declared.has(id)),
    };
}

function buildRepository(repoRoot) {
    const path = join(repoRoot, '.devbook', 'config.json');
    const config = load('stack config', path);
    const legacyPath = join(repoRoot, '.github', 'ai-agent-stack.json');
    const legacy = existsSync(legacyPath) ? legacyPath : null;
    // The flow context file is retired: its facts belong in the repository's `start` skill and
    // its QA depth in `policy.qa.depth`. Nothing reads either path; the report names a leftover
    // so the retirement is a named instruction rather than a file that silently stopped applying.
    const legacyFlowContext = ['.devbook', '.claude']
        .map((dir) => join(repoRoot, dir, 'flow-context.md'))
        .find((candidate) => existsSync(candidate)) ?? null;
    // Every devbook folder lives under `.devbook/` (the chapter-schema record). A root-level `.tech/` is the
    // layout that is no longer one: named as stray so the report says where it has to move.
    const folders = DEVBOOK_FOLDERS.map((folder) => {
        const stray = existsSync(join(repoRoot, `.${folder}`));
        if (existsSync(join(repoRoot, '.devbook', folder))) return { folder, path: `.devbook/${folder}/`, stray };
        return { folder, path: null, stray };
    });

    // The three overlay layers the delivery checker merges, outermost first, every one
    // reported whether or not it exists: an absent user layer is the fact `local` acts on.
    // The path rule is the checker's (plugins/delivery/tools/stack-config/check.mjs) and is
    // restated here only because this script reports and never imports across plugins.
    const env = process.env;
    const userDir = env.XDG_CONFIG_HOME
        ? join(env.XDG_CONFIG_HOME, 'devbook')
        : process.platform === 'win32' && env.APPDATA
          ? join(env.APPDATA, 'devbook')
          : join(homedir(), '.config', 'devbook');
    const id = typeof config?.id === 'string' ? config.id : null;
    const overlays = [
        { scope: 'user', path: join(userDir, 'config.local.json') },
        ...(id ? [{ scope: 'repository', path: join(userDir, 'repos', id, 'config.local.json') }] : []),
        { scope: 'checkout', path: join(repoRoot, '.devbook', 'config.local.json') },
    ].map(({ scope, path: overlayPath }) => {
        const overlay = load(`${scope} overlay`, overlayPath);
        return {
            scope,
            path: overlayPath,
            present: Boolean(overlay),
            keys: overlay ? ENGINE_KEYS.filter((key) => key in overlay) : [],
            // `ext.<plugin>` namespaces, named and never read: the engine merges them and
            // the owning plugin interprets them (surface-contract.md, The overlays).
            ext: overlay && overlay.ext && typeof overlay.ext === 'object' ? Object.keys(overlay.ext) : [],
        };
    });

    // The personal model-selection file the delivery `model-override` slot resolves to
    // (plugins/delivery/resources/flow-model-selection.md): the variable when set, else
    // the file beside the overlays. Reported so a run at category defaults is a choice.
    const modelSelectionPath = env.CLAUDE_FLOW_MODEL_SELECTION_PATH
        ? resolve(env.CLAUDE_FLOW_MODEL_SELECTION_PATH)
        : join(userDir, 'model-selection.md');
    const modelSelection = {
        path: modelSelectionPath,
        present: existsSync(modelSelectionPath),
        source: env.CLAUDE_FLOW_MODEL_SELECTION_PATH ? 'CLAUDE_FLOW_MODEL_SELECTION_PATH' : 'default',
    };

    return {
        path,
        legacyPath: legacy,
        legacyFlowContextPath: legacyFlowContext,
        id,
        overlays,
        modelSelection,
        present: Boolean(config),
        engineKeys: ENGINE_KEYS.filter((key) => config && key in config),
        tracker: config?.bindings?.['delivery.tracker'] ?? null,
        roles: config?.bindings?.['delivery.roles'] ?? null,
        mcp: config?.bindings?.['delivery.mcp'] ?? null,
        mcpServers: mcpServers(repoRoot, config?.bindings?.['delivery.mcp']),
        extensions: config?.extensions ?? null,
        policy: config?.policy ?? null,
        gates: config?.gates ?? null,
        components: config?.components ?? null,
        folders,
    };
}

function table(headers, rows) {
    const lines = [`| ${headers.join(' | ')} |`, `|${headers.map(() => ' --- ').join('|')}|`];
    for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
    return lines.join('\n');
}

/**
 * What a component's entry says it put in the repository: the files it copied, the features it
 * adopted, or - for one that writes into a personal scheduler rather than into the repository -
 * the selection it made. Each component names its own selection key, so this reads whichever is
 * there instead of insisting on one word for four different kinds of choice.
 */
function describeStamp(stamp) {
    const parts = [];
    const files = stamp?.materialized && typeof stamp.materialized === 'object'
        ? Object.keys(stamp.materialized).length
        : null;
    if (files !== null) parts.push(files === 1 ? '1 file' : `${files} files`);
    if (Array.isArray(stamp?.adopted)) parts.push(stamp.adopted.length ? `adopted \`${stamp.adopted.join('`, `')}\`` : 'adopted none');
    if (Array.isArray(stamp?.enabled)) {
        parts.push(stamp.enabled.length
            ? `enabled \`${stamp.enabled.join('`, `')}\``
            : 'nothing enabled');
    }
    return parts.join('; ') || '-';
}

/**
 * One line per MCP configuration file, and one more when a server the engine will look for is
 * declared in none of them - the one thing the binding table cannot show.
 */
function describeMcpServers({ wanted, files, undeclared }) {
    const ids = (list) => list.map((id) => `\`${id}\``).join(', ');
    const lines = [
        `MCP servers in use, bound or by engine default: ${ids(wanted) || 'none'}.`,
        ...files.map((file) => (file.present
            ? `- \`${file.path}\` declares ${ids(file.servers) || 'no server'}`
            : `- \`${file.path}\` absent`)),
    ];
    if (undeclared.length) {
        lines.push('');
        lines.push(`Declared in none of them: ${ids(undeclared)}. A host cannot start a server it has not been told about, so the stage that leans on it runs without its grounding on every machine. The delivery plugin's \`resources/mcp-template.json\` (\`.mcp.json\`, read by Claude Code and the Copilot CLI) and \`resources/mcp-vscode-template.json\` (\`.vscode/mcp.json\`) declare the three engine defaults - copy them, or add the missing ids to a file that exists.`);
    }
    return lines.join('\n');
}

function describeValue(value) {
    if (value === null) return '`null` - deliberately unbound';
    if (value === undefined) return 'unset - engine default';
    if (typeof value === 'object') return `\`${JSON.stringify(value)}\``;
    return `\`${value}\``;
}

function render(model) {
    const out = [];
    out.push(`# Stack report - \`${model.marketplace}\``);
    out.push('');
    out.push(`Repository: \`${model.repoRoot}\``);
    out.push('');

    out.push('## Where every fact came from');
    out.push('');
    out.push(table(['What', 'Path', 'Status'], model.sources.map((s) => [s.what, `\`${s.path}\``, s.status])));
    out.push('');

    for (const found of model.catalogs) {
        const head = gitHead(found.root);
        const parts = [`**Catalog (${found.origin})** - ${found.catalog.plugins?.length ?? 0} plugins`];
        parts.push(`checked out at \`${found.root}\``);
        if (found.repo) parts.push(`from \`${found.repo}\``);
        if (found.lastUpdated) parts.push(`fetched ${found.lastUpdated}`);
        if (head) parts.push(`at commit ${head}`);
        out.push(`${parts.join(', ')}.`);
    }
    if (model.catalogs.length === 0) {
        out.push('**No catalog found.** Nothing can be said about newest versions until the marketplace is added, or until this runs inside the marketplace source.');
    }
    out.push('');

    out.push('## Plugins');
    out.push('');
    out.push(table(
        ['Plugin', 'Newest', 'Installed', 'Enabled', 'State', 'Scope'],
        model.plugins.map((p) => [
            `\`${p.name}\``,
            p.latest,
            p.installed,
            p.enabled === null ? '?' : p.enabled ? 'yes' : 'no',
            p.state,
            p.scope,
        ]),
    ));
    out.push('');
    if (model.plugins.every((p) => p.enabled === null)) {
        out.push('No settings file was readable, so the enabled column says nothing.');
        out.push('');
    }

    out.push('### Scope');
    out.push('');
    out.push('What an update run does with each row. `installed` is a fact about this machine, `enabled` about this checkout, and the `components.<name>` stamp about the repository and everyone who shares it.');
    out.push('');
    const seen = model.plugins.map((p) => p.scope);
    out.push(table(
        ['Scope', 'Means', 'Plugins'],
        Object.entries(SCOPE)
            .filter(([name]) => seen.includes(name))
            .map(([name, means]) => [
                `\`${name}\``,
                means,
                model.plugins.filter((p) => p.scope === name).map((p) => `\`${p.name}\``).join(', '),
            ]),
    ));
    out.push('');

    const rank = (p) => {
        const i = RECONCILE_ORDER.indexOf(p.name);
        return i === -1 ? RECONCILE_ORDER.length : i;
    };
    const reconcile = model.plugins
        .filter((p) => p.scope === 'reconcile')
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    if (reconcile.length) {
        out.push('Run these **in this order** — derived needs devbook adopted first, procedures settle before the engine releases an older seed, and schedule reads the settled enable state — and let each write its own stamp:');
        out.push('');
        for (const p of reconcile) {
            const drift = p.stampedVersion && p.stampedVersion !== p.installed
                ? ` (stamped ${p.stampedVersion}, installed ${p.installed})`
                : '';
            out.push(`- \`${p.installSkill}\`${drift}`);
        }
        out.push('');
    }

    const blocked = model.plugins.filter((p) => p.scope === 'blocked');
    if (blocked.length) {
        out.push(`**Stamped but not installed here:** ${blocked.map((p) => `\`${p.name}\``).join(', ')}. The repository adopted them and this machine cannot reconcile them. Skip them and leave every stamp exactly as it is — a stamp is committed and shared, so dropping one un-adopts the component for everyone.`);
        out.push('');
    }

    const frozen = model.plugins.filter((p) => p.scope === 'frozen');
    if (frozen.length) {
        out.push(`**Stamped but not enabled in this checkout:** ${frozen.map((p) => `\`${p.name}\``).join(', ')}. Enable them here to reconcile them, or skip them; either way the stamp stands.`);
        out.push('');
    }

    const repo = model.repository;
    // A row carries its own flag so the table reads on its own; the section after the tables
    // explains it once and names both files.
    const warned = new Map((model.unenabled ?? []).map((w) => [`${w.where} ${w.key}`, w.plugins]));
    const warn = (where, key) => {
        const plugins = warned.get(`${where} ${key}`);
        return plugins ? ` - **not enabled here:** ${plugins.map((n) => `\`${n}\``).join(', ')}` : '';
    };
    out.push('## This repository');
    out.push('');
    if (repo.legacyPath) {
        out.push(`\`${repo.legacyPath}\` is still present. The stack config moved to \`.devbook/config.json\`; nothing reads the old path any more, so move the file before anything else.`);
        out.push('');
    }
    if (repo.legacyFlowContextPath) {
        out.push(`\`${repo.legacyFlowContextPath}\` is still present. The flow context file is retired and nothing reads it: its facts belong in the repository's \`start\` skill at \`.agents/skills/start.md\`, its QA depth in \`policy.qa.depth\`, and nothing-to-start is \`extensions.app.start\` set to \`null\`. Move what it says and delete it.`);
        out.push('');
    }
    for (const layer of repo.overlays.filter((l) => l.present)) {
        const touches = layer.keys.map((k) => `\`${k}\``).join(', ') || 'no engine-owned key';
        const ext = layer.ext.length ? `, and carries \`ext.${layer.ext.join('`, `ext.')}\` for the plugins of those names` : '';
        const scope = {
            user: 'true of this user in every repository',
            repository: `true of this user in the repository whose id is \`${repo.id}\``,
            checkout: "true of this checkout and of nobody else's",
        }[layer.scope];
        out.push(`\`${layer.path}\` is present (${layer.scope} overlay) and overlays ${touches}${ext}. It is never committed, so what it says is ${scope} - read the merged values, not the committed file alone.`);
        out.push('');
    }
    if (!repo.overlays.some((l) => l.scope !== 'checkout' && l.present)) {
        const user = repo.overlays.find((l) => l.scope === 'user');
        out.push(`No user overlay: neither \`${user.path}\` nor a \`repos/<id>/config.local.json\` beside it exists, so every run on this machine takes the team's defaults - QA depth, retry budget, role and MCP bindings - and the scheduler asks for its environment and model every time. Run \`devbook-config:local\` to say what is true of this machine.`);
        out.push('');
    }
    if (repo.modelSelection.present) {
        out.push(`\`${repo.modelSelection.path}\` is present (${repo.modelSelection.source === 'default' ? 'the default model-selection path' : 'named by `CLAUDE_FLOW_MODEL_SELECTION_PATH`'}), so a flow resolves each stage's model through it before the category default.`);
    } else {
        out.push(`No model-selection file at \`${repo.modelSelection.path}\`${repo.modelSelection.source === 'default' ? '' : ' (named by `CLAUDE_FLOW_MODEL_SELECTION_PATH`)'}: every flow stage runs at its category's default model. \`devbook-config:local\` writes one.`);
    }
    out.push('');
    if (repo.present && !repo.id) {
        out.push('`.devbook/config.json` carries no `id`, so no per-repository overlay is looked up for it. Add one - lowercase, digits, hyphens - to let a machine keep settings for this repository outside every clone of it.');
        out.push('');
    }
    if (!repo.present) {
        out.push('No `.devbook/config.json` - every engine setting takes its documented default, and no component has been reconciled here.');
        out.push('');
    } else {
        out.push(`\`.devbook/config.json\` declares ${repo.engineKeys.map((k) => `\`${k}\``).join(', ') || 'no engine-owned key'}${repo.components ? ', plus component stamps' : ''}.`);
        out.push('');
        out.push('### Roles and tracker');
        out.push('');
        out.push(`Tracker: ${describeValue(repo.tracker ?? undefined)}`);
        out.push('');
        out.push(repo.roles
            ? table(['Role', 'Bound to'], Object.entries(repo.roles).map(([k, v]) => [`\`${k}\``, describeValue(v) + warn('delivery.roles', k)]))
            : 'No `delivery.roles` binding - a flow consults no specialist by name.');
        out.push('');
        out.push(repo.mcp
            ? table(['Point', 'MCP servers'], Object.entries(repo.mcp).map(([k, v]) => [`\`${k}\``, v === null ? '`null` - deliberately none' : v.map((s) => `\`${s}\``).join(', ')]))
            : 'No `delivery.mcp` binding - every point takes the engine default MCP servers.');
        out.push('');
        out.push(describeMcpServers(repo.mcpServers));
        out.push('');
        out.push('### Extension points');
        out.push('');
        out.push(table(
            ['Point', 'Kind', 'Provider'],
            [
                ...SERVICES.map((p) => [`\`${p}\``, 'service', describeValue(repo.extensions?.[p]) + warn('extensions', p)]),
                ...CHORES.map((p) => [`\`${p}\``, 'chore', describeValue(repo.extensions?.[p]) + warn('extensions', p)]),
            ],
        ));
        out.push('');
        if (model.unenabled === null && (repo.roles || repo.extensions)) {
            out.push('No settings file was readable, so nothing is said about whether the plugins these bindings name are enabled here.');
            out.push('');
        } else if (model.unenabled?.length) {
            out.push('### Bindings nobody has enabled');
            out.push('');
            out.push(`These bindings name a plugin this checkout has not enabled. It is a warning and never a failure: a binding is committed and shared, enablement is personal to this checkout, and a stage that cannot reach its plugin falls back to what its role reference states. Reconcile \`${repo.path}\` against ${model.enabledPaths.map((f) => `\`${f}\``).join(', ')} - enable the plugin here, or rebind the key there.`);
            out.push('');
            out.push(table(
                ['Where', 'Key', 'Names', 'Not enabled'],
                model.unenabled.map((w) => [
                    `\`${w.where}\``,
                    `\`${w.key}\``,
                    describeValue(repo[w.where === 'delivery.roles' ? 'roles' : 'extensions']?.[w.key]),
                    w.plugins.map((n) => `\`${n}\``).join(', '),
                ]),
            ));
            out.push('');
        }
        out.push('### Policy and gates');
        out.push('');
        out.push(repo.policy
            ? table(['Switch', 'Value'], Object.entries(repo.policy).map(([k, v]) => [`\`${k}\``, describeValue(v)]))
            : 'No `policy` key - every switch takes its engine default.');
        out.push('');
        out.push(repo.gates?.length
            ? table(['At', 'When', 'Purpose', 'Unattended'], repo.gates.map((g) => [`\`${g.at}\``, g.when ?? '-', g.purpose ?? '-', g.unattended ?? '-']))
            : 'No `gates` key - Personal Validation is the only gate, and it is mandatory.');
        out.push('');
        if (repo.components) {
            out.push('### Component stamps');
            out.push('');
            out.push(table(
                ['Component', 'Stamped', 'Records', 'Contract', 'Ledger'],
                Object.entries(repo.components).map(([name, stamp]) => {
                    // null for a component this script has never heard of: read its fields and
                    // report what is there, rather than calling it payload-only on no evidence.
                    const versioned = COMPONENTS[name]?.contract ?? null;
                    return [
                        `\`${name}\``,
                        stamp?.pluginVersion ?? '-',
                        describeStamp(stamp),
                        versioned === false
                            ? 'payload-only'
                            : String(stamp?.contractVersion ?? stamp?.version ?? '-'),
                        versioned === false
                            ? 'payload-only'
                            : Array.isArray(stamp?.migrations) ? String(stamp.migrations.length) : '-',
                    ];
                }),
            ));
            out.push('');
            if (Object.keys(repo.components).some((name) => COMPONENTS[name]?.contract === false)) {
                out.push([
                    '`payload-only` is the shape, not a gap. A component that only copies files it',
                    'owns needs no contract version and no ledger: a copy still hashing to a release',
                    'that component shipped is stale and its install replaces it, and a copy hashing to',
                    'nothing shipped belongs to the repository and is never overwritten either way.',
                    'Only `devbook` rewrites content the repository authored, so only `devbook` carries',
                    'the other three fields -',
                    '`.devbook/arc42/adr/install.md`.',
                ].join(' '));
                out.push('');
            }
        }
    }

    out.push('### Devbook folders on disk');
    out.push('');
    out.push(table(
        ['Folder', 'Present as'],
        repo.folders.map((f) => [
            `\`${f.folder}/\``,
            (f.path ? `\`${f.path}\`` : 'absent') + (f.stray ? ` — a root-level \`.${f.folder}/\` also exists; only \`.devbook/\` is a layout, move it` : ''),
        ]),
    ));
    out.push('');

    if (model.deliverySkills || model.scheduleSkills) {
        const grouped = { flow: [], phase: [], schedule: [], other: [] };
        for (const skill of model.deliverySkills ?? []) {
            if (skill.startsWith('flow-')) grouped.flow.push(skill);
            else if (skill.startsWith('phase-')) grouped.phase.push(skill);
            else grouped.other.push(skill);
        }
        for (const skill of model.scheduleSkills ?? []) grouped.schedule.push(skill);
        out.push('## Procedures the plugins on disk ship');
        out.push('');
        out.push(table(
            ['Kind', 'Plugin', 'Count', 'Members'],
            [
                ['`flow-*`', '`delivery`', grouped.flow.length, grouped.flow.join(', ') || '-'],
                ['`phase-*`', '`delivery`', grouped.phase.length, grouped.phase.join(', ') || '-'],
                ['other', '`delivery`', grouped.other.length, grouped.other.join(', ') || '-'],
                ['`schedule-*`', '`delivery-schedule`', grouped.schedule.length, grouped.schedule.join(', ') || '-'],
            ],
        ));
        out.push('');
    }

    return out.join('\n');
}

function parseArgs(argv) {
    const options = { root: process.cwd(), marketplace: DEFAULT_MARKETPLACE, json: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') {
            options.json = true;
        } else if (arg === '--root' || arg === '--marketplace') {
            const value = argv[++i];
            if (value === undefined) return { error: `${arg} needs a value` };
            if (arg === '--root') options.root = value;
            else options.marketplace = value;
        } else {
            return { error: `unknown argument: ${arg}` };
        }
    }
    options.root = resolve(options.root);
    return { options };
}

function main(argv) {
    const { options, error } = parseArgs(argv);
    if (error) {
        process.stderr.write(`report: ${error}\n`);
        return 1;
    }

    const configDir = hostConfigDir();
    sources.push({
        what: 'host config directory',
        path: configDir,
        status: existsSync(configDir) ? 'read' : 'absent',
    });

    const catalogs = resolveCatalogs(options.root, configDir, options.marketplace);
    const installed = resolveInstalled(configDir);
    const enabled = resolveEnabled(options.root, configDir);
    const repository = buildRepository(options.root);
    const plugins = buildPluginRows(
        catalogs,
        installed,
        enabled.plugins,
        options.marketplace,
        repository.components,
    );

    const pluginRoot = (name) => plugins.find((p) => p.name === name)?.installPath
        ?? (catalogs[0] ? join(catalogs[0].root, 'plugins', name) : null);
    const deliveryRoot = pluginRoot('delivery');
    const scheduleRoot = pluginRoot('delivery-schedule');

    const model = {
        marketplace: options.marketplace,
        repoRoot: options.root,
        configDir,
        catalogs,
        plugins,
        repository,
        enabledPaths: enabled.paths,
        unenabled: unenabledBindings(repository, enabled.plugins),
        deliverySkills: deliveryRoot ? skillNames(deliveryRoot) : null,
        scheduleSkills: scheduleRoot ? skillNames(scheduleRoot) : null,
        sources,
    };

    process.stdout.write(options.json ? `${JSON.stringify(model, null, 2)}\n` : `${render(model)}\n`);
    return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
    process.exit(main(process.argv.slice(2)));
}

export { compareVersions, buildPluginRows, buildRepository, bindingPlugin, describeStamp, unenabledBindings, parseArgs };
