#!/usr/bin/env node
// check.mjs — validate the schedule catalog against schedule-catalog-contract.md.
//
//   node plugins/delivery-schedule/tools/schedule-catalog/check.mjs
//
// Fails on: a missing or malformed frontmatter field, a name that is not the file stem, a
// cron that is not five fields or could fire more than once an hour, a target whose skill
// folder does not exist in this marketplace, is a flow-* skill, or sets
// disable-model-invocation, a plugin in `requires` the
// marketplace does not list or that omits the target's plugin, a tool list without `Skill`,
// a `result` that is not `session` or `github`, an empty body, a placeholder outside the
// five the contract names — in a body, the preamble, or the pickup gate — or a `maxResolve` that is not a whole number or that the body never uses as
// {{maxResolve}}, the one placeholder a schedule carrying that field may add, or that the
// plugin README's catalog row or the target skill's `maxResolve` input line does not restate.
// A bundle — a schedule carrying `jobs` — also fails on an empty or repeated job list, a job
// that is not a catalog name or is itself a bundle, a `result` other than github, a tool list
// without Workflow, a body placeholder other than {{name}} and {{title}}, and a target with no
// bundle.workflow.js beside it or one whose JOBS table leaves a job out.
//
// Dependency-free ESM against node: built-ins, like everything else executable here.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..");
const ROOT = path.resolve(PLUGIN, "..", "..");
const CATALOG = path.join(PLUGIN, "resources", "schedules");
const PREAMBLE = path.join(PLUGIN, "resources", "schedule-preamble.md");
const GATE = path.join(PLUGIN, "resources", "schedule-pickup-gate.md");
const README = path.join(PLUGIN, "README.md");

const REQUIRED = ["name", "title", "cadence", "cron", "target", "requires", "tools", "result"];
const RESULTS = new Set(["session", "github"]);
const CADENCES = new Set(["daily", "weekdays", "weekly"]);
const PLACEHOLDER = /\{\{\s*([A-Za-z]+)\s*\}\}/g;
const ALLOWED_PLACEHOLDERS = new Set(["repo", "base", "name", "title", "checkout"]);
const FIELD_PLACEHOLDERS = new Set(["maxResolve"]);

const errors = [];
const error = (file, msg) => errors.push(`${path.relative(ROOT, file)}: ${msg}`);

async function exists(p) {
    try { await stat(p); return true; } catch { return false; }
}

// Frontmatter is deliberately narrow: scalars and inline lists, nothing nested.
function frontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return null;
    const fields = {};
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
        if (!kv) continue;
        let value = kv[2].trim();
        if (value.startsWith("[") && value.endsWith("]")) {
            value = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        } else {
            value = value.replace(/^["']|["']$/g, "");
        }
        fields[kv[1]] = value;
    }
    return { fields, body: m[2] };
}

function checkPlaceholders(file, text, fields = {}) {
    for (const [, key] of text.matchAll(PLACEHOLDER)) {
        if (!ALLOWED_PLACEHOLDERS.has(key) && !(FIELD_PLACEHOLDERS.has(key) && key in fields)) error(file, `placeholder {{${key}}} is not one the contract names`);
    }
}

const marketplace = JSON.parse(await readFile(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
const plugins = new Set(marketplace.plugins.map((p) => p.name));

if (await exists(PREAMBLE)) checkPlaceholders(PREAMBLE, await readFile(PREAMBLE, "utf8"));
else error(PREAMBLE, "missing — every prompt starts with it");
if (await exists(GATE)) checkPlaceholders(GATE, await readFile(GATE, "utf8"));
else error(GATE, "missing — every result: session prompt carries it");

const readmeRows = (await exists(README)) ? (await readFile(README, "utf8")).split(/\r?\n/).filter((l) => l.startsWith("| `")) : [];

const files = (await readdir(CATALOG)).filter((f) => f.endsWith(".schedule.md")).sort();
if (files.length === 0) error(CATALOG, "the catalog is empty");

// Every entry's frontmatter up front, so a bundle can check the jobs it names.
const catalog = new Map();
for (const name of files) {
    const parsed = frontmatter(await readFile(path.join(CATALOG, name), "utf8"));
    if (parsed) catalog.set(name.replace(/\.schedule\.md$/, ""), parsed.fields);
}
const BUNDLE_PLACEHOLDERS = new Set(["name", "title"]);

for (const name of files) {
    const file = path.join(CATALOG, name);
    const parsed = frontmatter(await readFile(file, "utf8"));
    if (!parsed) { error(file, "no frontmatter"); continue; }
    const { fields, body } = parsed;

    for (const key of REQUIRED) if (!(key in fields)) error(file, `missing field ${key}`);

    const stem = name.replace(/\.schedule\.md$/, "");
    if (fields.name && fields.name !== stem) error(file, `name ${fields.name} is not the file stem ${stem}`);
    if (fields.result && !RESULTS.has(fields.result)) error(file, `result ${fields.result} is not session or github`);
    if (fields.cadence && !CADENCES.has(fields.cadence)) error(file, `cadence ${fields.cadence} is not daily, weekdays, or weekly`);

    if (typeof fields.cron === "string") {
        const parts = fields.cron.trim().split(/\s+/);
        if (parts.length !== 5) error(file, `cron "${fields.cron}" is not five fields`);
        else if (!/^\d{1,2}$/.test(parts[0])) error(file, `cron minute field "${parts[0]}" must be one number: the minimum interval is one hour`);
    }

    let targetPlugin = null;
    let skillText = null;
    if (typeof fields.target === "string") {
        const m = fields.target.match(/^([a-z0-9-]+):([a-z0-9-]+)$/);
        if (!m) error(file, `target ${fields.target} is not <plugin>:<skill>`);
        else {
            targetPlugin = m[1];
            if (m[2].startsWith("flow-")) error(file, `target ${fields.target} is a flow — a flow ends at a gate no unattended run can pass`);
            const skill = path.join(ROOT, "plugins", m[1], "skills", m[2], "SKILL.md");
            if (!(await exists(skill))) error(file, `target ${fields.target} has no skill folder in this marketplace`);
            else if (frontmatter(skillText = await readFile(skill, "utf8"))?.fields["disable-model-invocation"] === "true") error(file, `target ${fields.target} sets disable-model-invocation — the scheduled session reaches it through the model, so every run would stop at step 1`);
        }
    }

    if (Array.isArray(fields.requires)) {
        for (const p of fields.requires) if (!plugins.has(p)) error(file, `requires ${p}, which the marketplace does not list`);
        if (targetPlugin && !fields.requires.includes(targetPlugin)) error(file, `requires omits the target's own plugin ${targetPlugin}`);
    } else if (fields.requires !== undefined) error(file, "requires is not a list");

    if (Array.isArray(fields.tools)) {
        if (!fields.tools.includes("Skill")) error(file, "tools omits Skill, so the session cannot reach its target");
    } else if (fields.tools !== undefined) error(file, "tools is not a list");

    if (!body.trim()) error(file, "empty body — the prompt has no task half");
    if ("maxResolve" in fields) {
        if (!/^\d+$/.test(fields.maxResolve)) error(file, `maxResolve ${fields.maxResolve} is not a whole number`);
        if (!body.includes("{{maxResolve}}")) error(file, "maxResolve is set but the body never says {{maxResolve}}, so an override would change nothing");
        // The default is restated by hand where a reader meets it first; each copy must agree.
        const want = `\`${fields.maxResolve}\``;
        const row = readmeRows.find((l) => l.startsWith(`| \`${stem}\` |`));
        if (!row) error(README, `the catalog table has no row for ${stem}`);
        else if (!row.includes(`\`maxResolve ${fields.maxResolve}\``)) error(README, `the ${stem} row does not say maxResolve ${fields.maxResolve}, the schedule's default`);
        const line = skillText?.split(/\r?\n/).find((l) => l.startsWith("- `maxResolve`:"));
        if (skillText && !line) error(file, `target ${fields.target} has no "- \`maxResolve\`:" input line stating the default`);
        else if (line && !line.includes(want)) error(file, `target ${fields.target} states a maxResolve default other than ${want}`);
    }
    if ("jobs" in fields) await checkBundle(file, fields, body, targetPlugin);
    else checkPlaceholders(file, body, fields);
}

async function checkBundle(file, fields, body, targetPlugin) {
    const jobs = fields.jobs;
    if (!Array.isArray(jobs) || jobs.length === 0) { error(file, "jobs is not a non-empty list"); return; }
    if (new Set(jobs).size !== jobs.length) error(file, "jobs names a job twice");
    for (const job of jobs) {
        const entry = catalog.get(job);
        if (!entry) error(file, `job ${job} is not a catalog schedule`);
        else if ("jobs" in entry) error(file, `job ${job} is itself a bundle`);
    }
    if (fields.result && fields.result !== "github") error(file, "a bundle's result is github: its changes wait as drafts, and a bundle has no pickup check");
    if (Array.isArray(fields.tools) && !fields.tools.includes("Workflow")) error(file, "tools omits Workflow, so the bundle cannot fan out its jobs");
    for (const [, key] of body.matchAll(PLACEHOLDER)) {
        if (!BUNDLE_PLACEHOLDERS.has(key)) error(file, `placeholder {{${key}}} — a bundle's body is synced with {{name}} and {{title}} alone`);
    }
    const m = typeof fields.target === "string" && fields.target.match(/^([a-z0-9-]+):([a-z0-9-]+)$/);
    if (!m || !targetPlugin) return;
    const script = path.join(ROOT, "plugins", m[1], "skills", m[2], "bundle.workflow.js");
    if (!(await exists(script))) { error(file, `target ${fields.target} has no bundle.workflow.js beside its SKILL.md`); return; }
    const text = await readFile(script, "utf8");
    for (const job of jobs) if (!text.includes(`'${job}':`)) error(file, `bundle.workflow.js has no JOBS entry for ${job}, so its precondition and whether it writes are unknown`);
}

for (const e of errors) console.error(`error  ${e}`);
console.log(`schedule catalog: ${files.length} schedule(s), ${errors.length} error(s).`);
process.exit(errors.length ? 1 : 0);
