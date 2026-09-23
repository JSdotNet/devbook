#!/usr/bin/env node
// 015-openspec-verbs — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are the old
// skill ids as string values in the committed config and in both overlay
// layers, and the old schedule name in `components.schedule`. Once none is left
// the migration has nothing to see, which is what makes re-running it safe.
//
// The files are rewritten as text, one quoted token for another, so a config's
// own formatting survives; the result is parsed back and compared with the
// same rename applied to the parsed value before anything is written.

import { readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const STAMP = ".devbook/config.json";

// Every provider id a repository or an overlay may have bound, old to new.
const RENAMED = {
    "devbook:install": "devbook:update",
    "devbook:check": "devbook:validate",
    "devbook-derived:install": "devbook-derived:update",
    "devbook-procedures:install": "devbook-procedures:update",
    "delivery:install": "delivery:update",
    "delivery-schedule:install": "delivery-schedule:update",
    "devbook-config:setup": "devbook-config:init",
    "delivery-schedule:schedule-devbook-check": "delivery-schedule:schedule-devbook-validate",
};

// The catalog entry the schedule stamp selects by name, old to new.
const SCHEDULES = { "devbook-check": "devbook-validate" };

function userConfigDir(env = process.env) {
    if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, "devbook");
    if (process.platform === "win32" && env.APPDATA) return path.join(env.APPDATA, "devbook");
    return path.join(homedir(), ".config", "devbook");
}

async function exists(absPath) {
    try {
        await stat(absPath);
        return true;
    } catch {
        return false;
    }
}

const quoted = (value) => JSON.stringify(value);

/** Every string value anywhere in `node` that is an old id, renamed. Keys are left alone. */
function renameValues(node) {
    if (typeof node === "string") return RENAMED[node] ?? node;
    if (Array.isArray(node)) return node.map(renameValues);
    if (node && typeof node === "object") {
        return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, renameValues(v)]));
    }
    return node;
}

/** The schedule stamp's `enabled` entries and `overrides` keys, renamed. */
function renameSchedules(config) {
    const schedule = config?.components?.schedule;
    if (!schedule) return config;
    const next = structuredClone(config);
    const s = next.components.schedule;
    if (Array.isArray(s.enabled)) s.enabled = s.enabled.map((name) => SCHEDULES[name] ?? name);
    if (s.overrides && typeof s.overrides === "object") {
        s.overrides = Object.fromEntries(
            Object.entries(s.overrides).map(([name, v]) => [SCHEDULES[name] ?? name, v]),
        );
    }
    return next;
}

function scheduleNamesPresent(config) {
    const s = config?.components?.schedule;
    if (!s) return [];
    const names = [...(Array.isArray(s.enabled) ? s.enabled : []), ...Object.keys(s.overrides ?? {})];
    return names.filter((name) => name in SCHEDULES);
}

function idsPresent(node, found = new Set()) {
    if (typeof node === "string" && node in RENAMED) found.add(node);
    else if (Array.isArray(node)) node.forEach((v) => idsPresent(v, found));
    else if (node && typeof node === "object") Object.values(node).forEach((v) => idsPresent(v, found));
    return found;
}

/** Plan one config file: the old names it holds, and its text with them renamed. */
async function plan(file, { schedules }) {
    if (!(await exists(file))) return null;
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    const ids = [...idsPresent(parsed)];
    const names = schedules ? scheduleNamesPresent(parsed) : [];
    if (ids.length === 0 && names.length === 0) return null;

    let text = raw;
    for (const id of ids) text = text.split(quoted(id)).join(quoted(RENAMED[id]));
    for (const name of names) text = text.split(quoted(name)).join(quoted(SCHEDULES[name]));

    const expected = schedules ? renameSchedules(renameValues(parsed)) : renameValues(parsed);
    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(expected)) {
        return { file, ids, names, blocked: "an old id also appears where it is not a value this migration renames; rename it by hand" };
    }
    return { file, ids, names, text };
}

const report = (line) => console.log(line);
let remaining = 0;

const targets = [{ file: path.join(ROOT, STAMP), schedules: true }];
const configDir = userConfigDir();
targets.push({ file: path.join(configDir, "config.local.json"), schedules: false });
try {
    const committed = JSON.parse(await readFile(path.join(ROOT, STAMP), "utf8"));
    if (typeof committed.id === "string") {
        targets.push({ file: path.join(configDir, "repos", committed.id, "config.local.json"), schedules: false });
    }
} catch {
    // No committed config, or one that does not parse: nothing keys a repository layer.
}

for (const target of targets) {
    const step = await plan(target.file, target);
    if (!step) continue;
    remaining++;
    const what = [
        ...step.ids.map((id) => `${id} -> ${RENAMED[id]}`),
        ...step.names.map((name) => `schedule ${name} -> ${SCHEDULES[name]}`),
    ].join(", ");
    if (step.blocked) report(`${step.file}: not rewritten — ${step.blocked} (${what})`);
    else if (checkOnly) report(`${step.file}: would rename ${what}`);
    else {
        await writeFile(step.file, step.text, "utf8");
        report(`${step.file}: renamed ${what}`);
    }
}

if (remaining === 0) report("015-openspec-verbs: nothing to do");
process.exit(checkOnly && remaining > 0 ? 1 : 0);
