#!/usr/bin/env node
// check-assets.mjs — the review lint AGENTS.md describes, as a script.
//
//   node tools/check-assets.mjs            # report, exit 1 on any error
//   node tools/check-assets.mjs --budgets  # also list every asset over its body budget
//
// Checks what the removed sync generator used to lint and what a reviewer is otherwise
// expected to catch by eye across seventeen plugins:
//
//   marketplace   every entry has a folder, every folder with a Claude manifest has an
//                 entry, and name/version/description agree across the three files
//   dependencies  a declared range contains the current version of the plugin it names,
//                 so the combination the host resolves is reachable, and names this
//                 marketplace, not a retired one; a Copilot manifest lists only paths
//                 that exist, and lists skills/ when the folder is there; no plugin
//                 carries an UPGRADING.md
//   agents        name equals the filename, a description exists, a model pin is a value
//                 Claude accepts, Skill is granted, and a role plugin's agent carries no
//                 session-spawning or delegation tool (see the decision "A Role Plugin
//                 Holds No Flow Control")
//   hooks         hooks/hooks.json never uses type: prompt on SessionStart
//   rules         every .agents/rules/<topic>.md has a wrapper per host, the wrappers'
//                 globs and description are derived from it, and neither wrapper has
//                 grown a rule of its own (see the decision "One Rule, One Wrapper Per
//                 Host"); a rule named for a plugins/*/rules/<name>.md is a delivered
//                 copy — verbatim, globs from that plugin's rules.json
//   procedures    every .agents/skills/<name>.md has a wrapper per host, rendered from
//                 the devbook-procedures seed and pointing at the copy
//   plugin rules  every plugins/*/rules/<name>.md has a name matching its filename, a
//                 description, no glob of its own, and an entry with globs in the
//                 rules.json beside it (see the decision "A Plugin's Rules Reach a Host
//                 Through the Install"). Only a plugin whose install delivers rules has
//                 the folder at all (see "Only a Delivered Rule Lives in rules/")
//   skills        every plugins/*/skills/<name>/SKILL.md opens with the line that reports
//                 its plugin name and version from the manifest beside it (see the
//                 decision "Every Skill Opens With Its Plugin Version")
//   vendored      .devbook/_tools/devbook-meta/ and devbook-tech/, where present, are
//                 byte-identical over LF to plugins/devbook/tools/ (see the decision
//                 "Install")
//   budgets       body-line counts against the budgets in AGENTS.md — reported, never
//                 an error (see the decision "Budgets Are Disclosure Triggers, Not Gates"
//                 and debt record 1)
//
// Dependency-free ESM against node: built-ins, like everything else executable here.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS = path.join(ROOT, "plugins");
const SHARED_RULES = path.join(ROOT, ".agents", "rules");
const CLAUDE_RULES = path.join(ROOT, ".claude", "rules");
const COPILOT_RULES = path.join(ROOT, ".github", "instructions");
const showBudgets = process.argv.includes("--budgets");

const BUDGETS = { "SKILL.md": 40, "rule": 60, ".agent.md": 80 };
// A wrapper is frontmatter plus one sentence. Three lines is slack, not licence.
const WRAPPER_BODY_MAX = 3;
const MODEL_PIN = /^(opus|sonnet|haiku|fable|inherit|claude-[\w.-]+)$/;
// Tools that sequence, spawn, or delegate. Only the runner's agent may carry them.
const FLOW_CONTROL_TOOLS = new Set([
    "Agent", "agent", "SendMessage", "create_session", "send_session_message",
    "respond_to_session_plan", "list_sessions_and_chats", "get_session",
]);
// Plugins whose agents may delegate: the engine's runner. No specialist ships here any more,
// so this guards agents added later rather than any on disk today.
const RUNNER_PLUGINS = new Set(["delivery"]);

const errors = [];
const notes = [];
const error = (msg) => errors.push(msg);

async function exists(p) {
    try { await stat(p); return true; } catch { return false; }
}
async function json(p) {
    return JSON.parse(await readFile(p, "utf8"));
}
async function walk(dir, acc = []) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(p, acc);
        else acc.push(p);
    }
    return acc;
}
function frontmatter(text) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
    if (!m) return { fm: "", body: text };
    return { fm: m[1], body: text.slice(m[0].length) };
}
function bodyLines(body) {
    return body.split(/\r?\n/).filter((l) => l.trim() !== "").length;
}
function rel(p) {
    return path.relative(ROOT, p).replace(/\\/g, "/");
}

// ── marketplace ─────────────────────────────────────────────────────────────

const marketplace = await json(path.join(ROOT, ".claude-plugin", "marketplace.json"));
const listed = new Map(marketplace.plugins.map((e) => [e.name, e]));
const manifests = new Map();
const folders = (await readdir(PLUGINS, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

for (const [name, entry] of listed) {
    const dir = path.join(PLUGINS, name);
    if (entry.source !== `./plugins/${name}`) error(`marketplace: ${name} has source ${entry.source}, expected ./plugins/${name}`);
    if (!(await exists(dir))) { error(`marketplace: ${name} is listed but plugins/${name} does not exist`); continue; }
    const claudePath = path.join(dir, ".claude-plugin", "plugin.json");
    if (!(await exists(claudePath))) { error(`${name}: listed in the marketplace but has no .claude-plugin/plugin.json`); continue; }
    const claude = await json(claudePath);
    manifests.set(name, claude);
    for (const field of ["name", "version", "description"]) {
        if (claude[field] !== entry[field]) error(`${name}: ${field} differs between marketplace.json and .claude-plugin/plugin.json`);
    }
    if ("skills" in claude) error(`${name}: Claude manifest names skills; Claude scans skills/ already`);
    if ("hooks" in claude) error(`${name}: Claude manifest names hooks; that fails with "Duplicate hooks file detected"`);
    const copilotPath = path.join(dir, ".github", "plugin", "plugin.json");
    if (await exists(copilotPath)) {
        const copilot = await json(copilotPath);
        for (const field of ["name", "version", "description"]) {
            if (copilot[field] !== claude[field]) error(`${name}: ${field} differs between the Claude and Copilot manifests`);
        }
        // Copilot loads only what the manifest names, and a named path must exist.
        for (const key of ["skills", "hooks", "agents", "extensions"]) {
            const value = copilot[key];
            if (value === undefined) continue;
            for (const rel of Array.isArray(value) ? value : [value]) {
                if (typeof rel !== "string" || !(await exists(path.join(dir, rel)))) {
                    error(`${name}: Copilot manifest lists ${key} ${JSON.stringify(rel)}, which does not exist`);
                }
            }
        }
        if ((await exists(path.join(dir, "skills"))) && copilot.skills === undefined) {
            error(`${name}: ships skills/ but the Copilot manifest does not declare it, so Copilot sees none of them`);
        }
    } else {
        error(`${name}: ships only the Claude manifest; every plugin here ships both`);
    }
    // Every agent file the manifest lists must exist, and every agent file must be listed.
    const declared = new Set((claude.agents ?? []).map((a) => a.replace(/^\.\//, "").replace(/\\/g, "/")));
    const agentFiles = (await exists(path.join(dir, "agents")))
        ? (await walk(path.join(dir, "agents"))).filter((f) => f.endsWith(".agent.md")).map((f) => path.relative(dir, f).replace(/\\/g, "/"))
        : [];
    for (const f of agentFiles) if (!declared.has(f)) error(`${name}: ${f} is not listed under agents in the Claude manifest, so handoffs to it dangle`);
    for (const d of declared) if (!(await exists(path.join(dir, d)))) error(`${name}: Claude manifest lists ${d}, which does not exist`);
}
// ── declared dependencies ───────────────────────────────────────────────────
// A range that excludes the current version of the plugin it names makes the
// combination unreachable: the host resolves the dependency and finds nothing
// legal to install. A range naming a plugin outside this marketplace is not
// ours to resolve, so it is left alone.

const order = (v) => v.split(".").map((n) => Number(n) || 0);
const compare = (a, b) => {
    const [x, y] = [order(a), order(b)];
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
};
const satisfies = (version, range) => range.trim().split(/\s+/).every((clause) => {
    const m = /^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/.exec(clause);
    if (!m) return true; // an exotic clause is the host's business, not this lint's
    const c = compare(version, m[2]);
    switch (m[1] ?? "=") {
        case ">=": return c >= 0;
        case "<=": return c <= 0;
        case ">": return c > 0;
        case "<": return c < 0;
        default: return c === 0;
    }
});

for (const [name, claude] of manifests) {
    for (const dep of claude.dependencies ?? []) {
        if (dep.marketplace !== undefined && dep.marketplace !== marketplace.name) {
            error(`${name}: declares ${dep.name}@${dep.marketplace}, but this marketplace is ${marketplace.name}; the host resolves the dependency against a marketplace it does not have`);
        }
        const target = manifests.get(dep.name);
        if (!target) continue;
        if (!satisfies(target.version, dep.version)) {
            error(`${name}: declares ${dep.name} ${dep.version}, which excludes ${dep.name} ${target.version} — the combination is unreachable`);
        }
    }
}

for (const folder of folders) {
    if (await exists(path.join(PLUGINS, folder, "UPGRADING.md"))) {
        error(`plugins/${folder}/UPGRADING.md: no plugin carries one; git history is the upgrade note`);
    }
    if (listed.has(folder)) continue;
    if (await exists(path.join(PLUGINS, folder, ".claude-plugin", "plugin.json"))) {
        error(`plugins/${folder} has a Claude manifest but no marketplace entry, so Claude Code will not offer it`);
    } else {
        notes.push(`plugins/${folder}: not in the marketplace and has no Claude manifest (a Copilot-only profile)`);
    }
}

// ── agents ──────────────────────────────────────────────────────────────────

for (const folder of folders) {
    const agentsDir = path.join(PLUGINS, folder, "agents");
    if (!(await exists(agentsDir))) continue;
    for (const file of (await walk(agentsDir)).filter((f) => f.endsWith(".agent.md"))) {
        const { fm, body } = frontmatter(await readFile(file, "utf8"));
        const label = rel(file);
        const expected = path.basename(file, ".agent.md");
        const name = (/^name:\s*['"]?([^'"\r\n]+)['"]?\s*$/m.exec(fm) ?? [])[1];
        if (name !== expected) error(`${label}: frontmatter name "${name}" must equal the filename "${expected}"`);
        if (!/^description:\s*\S/m.test(fm)) error(`${label}: description is required; Claude refuses to load an agent without one`);
        const model = (/^model:\s*['"]?([^'"\r\n]+)['"]?\s*$/m.exec(fm) ?? [])[1];
        if (model && !MODEL_PIN.test(model.trim())) error(`${label}: model "${model}" is not a value Claude accepts; put the preference in a ## Model section`);
        const tools = new Set([...fm.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]));
        if (!tools.has("Skill")) error(`${label}: tools does not include Skill, so the agent cannot reach plugin skills`);
        if (!RUNNER_PLUGINS.has(folder)) {
            const carried = [...tools].filter((t) => FLOW_CONTROL_TOOLS.has(t));
            if (carried.length) error(`${label}: only a runner plugin's agent may carry flow-control tools: ${carried.join(", ")}`);
        }
        if (/^handoffs:/m.test(fm)) {
            for (const m of fm.matchAll(/^\s+agent:\s*['"]?([\w-]+)/gm)) {
                if (!body.includes(`\`${m[1]}\``) && !body.includes(`${m[1]} agent`) && !body.includes(`${m[1]}.agent.md`)) {
                    error(`${label}: handoff target "${m[1]}" is not named in the body; Claude ignores the handoffs key`);
                }
            }
        }
    }
}

// ── hooks ───────────────────────────────────────────────────────────────────

for (const folder of folders) {
    const hooksPath = path.join(PLUGINS, folder, "hooks", "hooks.json");
    if (!(await exists(hooksPath))) continue;
    const doc = await json(hooksPath);
    const events = doc.hooks ?? doc;
    for (const group of events.SessionStart ?? []) {
        for (const hook of group.hooks ?? []) {
            if (hook.type === "prompt") error(`${folder}/hooks/hooks.json: SessionStart type: prompt fails silently in Claude Code; author it as a command hook`);
        }
    }
}

// ── rules ───────────────────────────────────────────────────────────────────
//
// One authored rule per topic in .agents/rules/, a thin wrapper per host. The Claude
// wrapper copies `paths` verbatim; the Copilot wrapper's `applyTo` is that list joined
// with commas. Both are therefore derivable from the shared file, which is what makes
// drift checkable without a generator owning the files.

function yamlPaths(fm) {
    const m = /^paths:\s*$/m.exec(fm);
    if (!m) return null;
    const out = [];
    for (const line of fm.slice(m.index + m[0].length).split(/\r?\n/)) {
        if (line.trim() === "") continue;
        const item = /^\s+-\s*(.+?)\s*$/.exec(line);
        if (!item) break;                       // the list ended; the next key starts here
        out.push(item[1].replace(/^['"]|['"]$/g, ""));
    }
    return out;
}
function scalar(fm, key) {
    const m = new RegExp(String.raw`^${key}:\s*(.+?)\s*$`, "m").exec(fm);
    return m ? m[1].replace(/^['"]|['"]$/g, "") : null;
}

// A delivered rule is the other shape in the same folder: a plugin's rules/<name>.md that its
// install copied here verbatim, with no globs of its own. Its wrappers derive from the plugin's
// rules.json instead (see plugins/devbook/assets/rule-wrappers.md). It is recognized by name,
// and in the repository that authors it the copy must still be the plugin file, or it is stale.

const lf = (text) => text.replace(/\r\n/g, "\n");
const delivered = new Map();
for (const folder of await readdir(PLUGINS)) {
    const mapPath = path.join(PLUGINS, folder, "rules", "rules.json");
    if (!(await exists(mapPath))) continue;
    for (const [name, entry] of Object.entries((await json(mapPath)).rules ?? {})) {
        delivered.set(name, { source: `plugins/${folder}/rules/${name}.md`, paths: entry.paths ?? [] });
    }
}

if (await exists(SHARED_RULES)) {
    const topics = new Set();
    for (const entry of await readdir(SHARED_RULES)) {
        if (!entry.endsWith(".md") || entry === "README.md") continue;
        const topic = entry.slice(0, -3);
        topics.add(topic);
        const shared = `.agents/rules/${entry}`;
        const text = await readFile(path.join(SHARED_RULES, entry), "utf8");
        const { fm } = frontmatter(text);

        if (scalar(fm, "name") !== topic) error(`${shared}: frontmatter name must equal the filename "${topic}"`);
        const description = scalar(fm, "description");
        if (!description) error(`${shared}: description is required; the Copilot wrapper copies it`);
        let paths;
        let globs = shared;
        const source = delivered.get(topic);
        if (source) {
            const shipped = path.join(ROOT, source.source);
            if (!(await exists(shipped)) || lf(await readFile(shipped, "utf8")) !== lf(text)) {
                error(`${shared}: differs from ${source.source}; a delivered rule is that file verbatim — refresh it with devbook:update`);
            }
            paths = source.paths;
            globs = source.source.replace(/[^/]+$/, `rules.json (${topic})`);
        } else {
            paths = yamlPaths(fm);
            if (!paths || paths.length === 0) {
                error(`${shared}: needs a paths list; without one neither wrapper can be derived`);
                continue;
            }
        }

        const claudePath = path.join(CLAUDE_RULES, `${topic}.md`);
        if (!(await exists(claudePath))) {
            error(`${shared}: no .claude/rules/${topic}.md, so Claude applies this rule nowhere`);
        } else {
            const { fm: cfm, body } = frontmatter(await readFile(claudePath, "utf8"));
            const cpaths = yamlPaths(cfm) ?? [];
            if (cpaths.join(",") !== paths.join(",")) {
                error(`.claude/rules/${topic}.md: paths differ from ${globs} (${cpaths.join(",")} vs ${paths.join(",")})`);
            }
            const lines = bodyLines(body);
            if (lines > WRAPPER_BODY_MAX) error(`.claude/rules/${topic}.md: ${lines} body lines; a wrapper points at ${shared}, it does not restate it`);
        }

        const copilotPath = path.join(COPILOT_RULES, `${topic}.instructions.md`);
        if (!(await exists(copilotPath))) {
            error(`${shared}: no .github/instructions/${topic}.instructions.md, so Copilot applies this rule nowhere`);
        } else {
            const { fm: gfm, body } = frontmatter(await readFile(copilotPath, "utf8"));
            const applyTo = scalar(gfm, "applyTo");
            if (applyTo !== paths.join(",")) {
                error(`.github/instructions/${topic}.instructions.md: applyTo must be ${globs}'s paths joined with commas (${paths.join(",")})`);
            }
            if (scalar(gfm, "description") !== description) {
                error(`.github/instructions/${topic}.instructions.md: description differs from ${shared}`);
            }
            const lines = bodyLines(body);
            if (lines > WRAPPER_BODY_MAX) error(`.github/instructions/${topic}.instructions.md: ${lines} body lines; a wrapper points at ${shared}, it does not restate it`);
        }
    }

    // A wrapper with nothing behind it is a rule that lives in one host only.
    for (const [dir, suffix, label] of [
        [CLAUDE_RULES, ".md", ".claude/rules"],
        [COPILOT_RULES, ".instructions.md", ".github/instructions"],
    ]) {
        if (!(await exists(dir))) continue;
        for (const entry of await readdir(dir)) {
            if (!entry.endsWith(suffix)) continue;
            const topic = entry.slice(0, -suffix.length);
            if (!topics.has(topic)) error(`${label}/${entry}: no .agents/rules/${topic}.md behind it; a rule is authored once and wrapped, never written in a wrapper`);
        }
    }
}

// ── procedures ──────────────────────────────────────────────────────────────
//
// The rule trio with the ownership reversed (see plugins/devbook-procedures/assets/
// skill-wrappers.md): .agents/skills/<name>.md is the repository's and may say anything, so
// only its name and goal are checked; each host's wrapper is rendered from the plugin's seed,
// so its name and description must be the seed's and its body must point at the copy.

const SHARED_SKILLS = path.join(ROOT, ".agents", "skills");
const SEEDS = path.join(PLUGINS, "devbook-procedures", "assets", "skills");
const SKILL_WRAPPERS = [[".claude", "skills"], [".github", "skills"]];

if (await exists(SHARED_SKILLS)) {
    const procedures = new Set();
    for (const entry of await readdir(SHARED_SKILLS)) {
        if (!entry.endsWith(".md") || entry === "README.md") continue;
        const name = entry.slice(0, -3);
        procedures.add(name);
        const shared = `.agents/skills/${entry}`;
        const { fm } = frontmatter(await readFile(path.join(SHARED_SKILLS, entry), "utf8"));
        if (scalar(fm, "name") !== name) error(`${shared}: frontmatter name must equal the filename "${name}"`);
        if (!scalar(fm, "goal")) error(`${shared}: goal is required; the wrappers carry it`);
        const seedPath = path.join(SEEDS, entry);
        const seed = (await exists(seedPath)) ? frontmatter(await readFile(seedPath, "utf8")).fm : fm;
        const pointer = `Read \`.agents/skills/${name}.md\``;
        for (const parts of SKILL_WRAPPERS) {
            const label = [...parts, name, "SKILL.md"].join("/");
            const file = path.join(ROOT, ...parts, name, "SKILL.md");
            if (!(await exists(file))) { error(`${shared}: no ${label}, so that host never loads it`); continue; }
            const { fm: wfm, body } = frontmatter(await readFile(file, "utf8"));
            if (scalar(wfm, "name") !== name) error(`${label}: name must be "${name}"`);
            if (scalar(wfm, "description") !== scalar(seed, "description")) error(`${label}: description differs from the seed's; the wrapper is rendered from it`);
            if (!body.includes(pointer)) error(`${label}: body must point at .agents/skills/${name}.md, never restate it`);
        }
    }
    // A wrapper that points into .agents/skills/ at nothing is a procedure in one host only.
    for (const parts of SKILL_WRAPPERS) {
        const dir = path.join(ROOT, ...parts);
        if (!(await exists(dir))) continue;
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name, "SKILL.md");
            if (!entry.isDirectory() || !(await exists(file))) continue;
            const body = await readFile(file, "utf8");
            if (body.includes(`.agents/skills/${entry.name}.md`) && !procedures.has(entry.name)) {
                error(`${[...parts, entry.name].join("/")}/SKILL.md: points at .agents/skills/${entry.name}.md, which does not exist`);
            }
        }
    }
}

// ── plugin rules ────────────────────────────────────────────────────────────
//
// A plugin rule is a template an install skill materializes into a repository, and that is the
// only thing rules/ holds — shared text an asset reads by path lives in resources/ (see the
// decision "Only a Delivered Rule Lives in rules/"). So a rule carries no host's spelling of
// anything: `name` and `description` in the file, and the globs in the plugin's
// rules/rules.json beside it, where that skill reads them (see the decision "A Plugin's Rules
// Reach a Host Through the Install").

for (const folder of await readdir(PLUGINS)) {
    const dir = path.join(PLUGINS, folder, "rules");
    if (!(await exists(dir))) continue;
    const mapPath = path.join(dir, "rules.json");
    if (!(await exists(mapPath))) {
        error(`plugins/${folder}/rules: no rules.json, so the install has no globs to derive from`);
        continue;
    }
    const declared = (await json(mapPath)).rules ?? {};
    const onDisk = new Set();

    for (const entry of await readdir(dir)) {
        if (!entry.endsWith(".md")) continue;
        const name = entry.slice(0, -3);
        onDisk.add(name);
        const where = `plugins/${folder}/rules/${entry}`;
        const { fm } = frontmatter(await readFile(path.join(dir, entry), "utf8"));

        if (scalar(fm, "applyTo") !== null) error(`${where}: applyTo is Copilot's spelling; the globs live in rules.json`);
        if (yamlPaths(fm) !== null) error(`${where}: paths belongs in rules.json, not in the rule`);
        if (scalar(fm, "name") !== name) error(`${where}: frontmatter name must equal the filename "${name}"`);
        if (!scalar(fm, "description")) error(`${where}: description is required; every host wrapper copies it`);
        if (!(name in declared)) error(`${where}: no entry in rules.json, so nothing ever applies it`);
    }

    for (const [name, entry] of Object.entries(declared)) {
        const label = `plugins/${folder}/rules/rules.json: ${name}`;
        if (!onDisk.has(name)) error(`${label} has no ${name}.md behind it`);
        if (!Array.isArray(entry.paths) || entry.paths.length === 0) error(`${label} needs a non-empty paths array`);
    }
}

// ── skills ──────────────────────────────────────────────────────────────────
//
// Every skill opens its reply with the plugin name and version, read from the Claude
// manifest beside it rather than recalled, so a consumer can tell which release answered
// (see the decision "Every Skill Opens With Its Plugin Version"). The line is authored in
// each skill because a plugin is installed on its own and a rule in this repository never
// reaches it; what is checked here is that the line is there, names the right plugin, and
// points at a manifest that exists from the skill folder.

const VERSION_LINE = (plugin) =>
    "Open the reply with `" + plugin + "@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.";

for (const folder of await readdir(PLUGINS)) {
    const dir = path.join(PLUGINS, folder, "skills");
    if (!(await exists(dir))) continue;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = path.join(dir, entry.name, "SKILL.md");
        if (!(await exists(file))) continue;
        const where = `plugins/${folder}/skills/${entry.name}/SKILL.md`;
        const { body } = frontmatter(await readFile(file, "utf8"));
        if (!body.split(/\r?\n/).some((l) => l.trim() === VERSION_LINE(folder))) {
            error(`${where}: missing the version line "${VERSION_LINE(folder)}"`);
        }
        if (!(await exists(path.resolve(path.dirname(file), "../../.claude-plugin/plugin.json")))) {
            error(`${where}: ../../.claude-plugin/plugin.json does not resolve from the skill folder`);
        }
    }
}

// ── vendored tools ──────────────────────────────────────────────────────────
//
// devbook's init copies tools/devbook-meta/ and tools/devbook-tech/ whole into
// .devbook/_tools/. In the repository that authors them the copy could drift on the first
// edit, which is why vendoring was once rejected here; this check makes drift an error
// instead. Compared over LF, because the working tree is CRLF and the index LF.

for (const tool of ["devbook-meta", "devbook-tech"]) {
    const copy = path.join(ROOT, ".devbook", "_tools", tool);
    if (!(await exists(copy))) continue;
    const source = path.join(PLUGINS, "devbook", "tools", tool);
    const label = `.devbook/_tools/${tool}`;
    const files = async (dir) => (await walk(dir)).map((f) => path.relative(dir, f).replace(/\\/g, "/"));
    const shipped = new Set(await files(source));
    const vendored = new Set(await files(copy));
    for (const f of shipped) {
        if (!vendored.has(f)) error(`${label}/${f}: missing; the vendored copy must equal plugins/devbook/tools/${tool}/ — refresh it with devbook:update`);
        else if (lf(await readFile(path.join(copy, f), "utf8")) !== lf(await readFile(path.join(source, f), "utf8"))) {
            error(`${label}/${f}: differs from plugins/devbook/tools/${tool}/${f}; edit the plugin and refresh the copy in the same commit`);
        }
    }
    for (const f of vendored) if (!shipped.has(f)) error(`${label}/${f}: not in plugins/devbook/tools/${tool}/; the vendored copy carries nothing of its own`);
}

// ── budgets (report only) ───────────────────────────────────────────────────

const over = [];
let budgeted = 0;
for (const file of await walk(PLUGINS)) {
    const base = path.basename(file);
    if (!base.endsWith(".md")) continue;
    const parent = path.basename(path.dirname(file));
    const { fm, body } = frontmatter(await readFile(file, "utf8"));
    // A delivered rule under rules/ and a contract under resources/ are the same kind of
    // prose and take the same budget. What else sits in resources/ — a prompt fragment, a
    // template copied into a repository — carries no name/description and is not guidance,
    // so it is not budgeted; nor is a resources/schedules/ catalog entry, one folder down.
    const isContract = parent === "resources" && scalar(fm, "name") !== null && scalar(fm, "description") !== null;
    const key = base === "SKILL.md" ? "SKILL.md"
        : parent === "rules" || isContract ? "rule"
        : base.endsWith(".agent.md") ? ".agent.md"
        : null;
    if (!key) continue;
    budgeted++;
    const lines = bodyLines(body);
    if (lines > BUDGETS[key]) over.push({ file: rel(file), lines, budget: BUDGETS[key] });
}
over.sort((a, b) => b.lines / b.budget - a.lines / a.budget);

// ── report ──────────────────────────────────────────────────────────────────

for (const n of notes) console.log(`note   ${n}`);
for (const e of errors) console.log(`error  ${e}`);
console.log(`\nbudgets: ${over.length} of ${budgeted} budgeted assets exceed their budget (reported, not an error)`);
if (showBudgets) for (const o of over) console.log(`  ${String(o.lines).padStart(4)} / ${o.budget}  ${o.file}`);
console.log(`\n${errors.length} error(s).`);
process.exit(errors.length ? 1 : 0);
