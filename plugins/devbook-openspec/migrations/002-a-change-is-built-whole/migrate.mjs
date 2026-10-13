#!/usr/bin/env node
// 002-a-change-is-built-whole — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are the
// `workflow` field in `components.openspec`, a `Workflow:` line in an open
// proposal, a `branch:` or `PR:` line in an open tasks.md, and the per-step
// pull request line `init` seeded into `openspec/config.yaml`. Once none is
// left there is nothing to see.

import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const STAMP = ".devbook/config.json";
const CONFIG = "openspec/config.yaml";
const CHANGES = "openspec/changes";
// The exact guidance line `init` seeded, and what replaces it.
const OLD_GUIDANCE = "- Tick the step's tasks in the step's own pull request.";
const NEW_GUIDANCE = "- Build the change whole unless the caller names one step, and tick a step's tasks in the commit that completes them.";
const WORKFLOW_LINE = /^Workflow:[ \t]*(single-branch|proposal-first)[ \t]*(\r?\n|$)/gm;
const STEP_LINE = /^(branch|PR):[^\r\n]*(\r?\n|$)/gm;

const abs = (rel) => path.join(ROOT, rel);
const lf = (text) => text.replace(/\r\n/g, "\n");
const hash = (text) => `sha256:${createHash("sha256").update(lf(text), "utf8").digest("hex")}`;

async function exists(rel) {
    try { await stat(abs(rel)); return true; } catch { return false; }
}

/** Replaces the value of `"openspec"` in the stamp text, leaving every other byte alone. */
function replaceEntry(text, entry) {
    const key = '"openspec":';
    const at = text.indexOf(key);
    const open = text.indexOf("{", at);
    let depth = 0, inString = false, end = -1;
    for (let i = open; i < text.length; i++) {
        const c = text[i];
        if (inString) { if (c === "\\") i++; else if (c === '"') inString = false; continue; }
        if (c === '"') inString = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) { end = i; break; }
    }
    const indent = /[ \t]*$/.exec(text.slice(text.lastIndexOf("\n", at) + 1, at))[0];
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    // A list of strings stays on one line, as the stamp writes `tools`.
    const rendered = JSON.stringify(entry, null, 2)
        .replace(/\[\n\s*("[^"\n]*"(?:,\n\s*"[^"\n]*")*)\n\s*\]/g, (_, items) => `[${items.split(/,\n\s*/).join(", ")}]`)
        .split("\n").join(`${eol}${indent}`);
    return text.slice(0, open) + rendered + text.slice(end + 1);
}

const stampText = (await exists(STAMP)) ? await readFile(abs(STAMP), "utf8") : null;
const entry = stampText ? JSON.parse(stampText)?.components?.openspec : null;
if (!entry) { console.log("002-a-change-is-built-whole: no components.openspec, nothing to do."); process.exit(0); }

const plan = [];
const writes = new Map();
const next = structuredClone(entry);
let splitInFlight = entry.workflow === "proposal-first";

if ("workflow" in next) {
    delete next.workflow;
    plan.push(`drop components.openspec.workflow from ${STAMP}`);
}

if (await exists(CONFIG)) {
    const before = await readFile(abs(CONFIG), "utf8");
    if (before.includes(OLD_GUIDANCE)) {
        const after = before.replace(OLD_GUIDANCE, NEW_GUIDANCE);
        writes.set(CONFIG, after);
        plan.push(`replace the per-step pull request line in ${CONFIG}`);
        // A config still as it landed keeps reading as seeded; an edited one stays the repository's.
        const stamped = next.materialized?.[CONFIG];
        if (stamped?.hash === hash(before)) stamped.hash = hash(after);
    }
}

// Open changes only: archive/ is history and is never rewritten.
const names = (await exists(CHANGES))
    ? (await readdir(abs(CHANGES), { withFileTypes: true })).filter((d) => d.isDirectory() && d.name !== "archive").map((d) => d.name)
    : [];
for (const name of names.sort()) {
    for (const [file, pattern, what] of [["proposal.md", WORKFLOW_LINE, "its Workflow: line"], ["tasks.md", STEP_LINE, "its steps' branch: and PR: lines"]]) {
        const rel = `${CHANGES}/${name}/${file}`;
        if (!(await exists(rel))) continue;
        const before = await readFile(abs(rel), "utf8");
        if (file === "proposal.md" && /^Workflow:[ \t]*proposal-first/m.test(before)) splitInFlight = true;
        const after = before.replace(pattern, "");
        if (after === before) continue;
        writes.set(rel, after);
        plan.push(`remove ${what} from ${rel}`);
    }
}

if (!plan.length) { console.log("002-a-change-is-built-whole: nothing to do."); process.exit(0); }
for (const p of plan) console.log(`- ${p}`);
if (splitInFlight) {
    console.log("  note: a proposal-first change may have step/ or archive/ branches in flight; they are left as they are.");
}
if (checkOnly) process.exit(1);

for (const [rel, text] of writes) await writeFile(abs(rel), text, "utf8");
const newStamp = replaceEntry(stampText, next);
if (newStamp !== stampText) await writeFile(abs(STAMP), newStamp, "utf8");
console.log("002-a-change-is-built-whole: applied.");
