#!/usr/bin/env node
// 030-linked-walkthroughs — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo [--scenario-folder <dir>]
//
// Idempotent by construction: the state that must not be present is a free walkthrough,
// in a demo under `.devbook/domain/`, whose id is the slug of a `Proved by:` case and whose
// step count is its part's. Rewritten, it is linked and the rule no longer sees it. One
// the rule matches but cannot rewrite — its step count differs, or the slug names more
// than one part — is listed `not-applicable` with its reason on every run and never counts
// as work, so `--check` exits 0 once only those are left.
//
// The demo is read by the plugin's own tools. The pages and their parts are the shape of
// contracts 30 and 31, which the tools stopped reading at 32: they are read, resolved, and
// synced through the frozen copy in `../032-scenarios-md/legacy-page.mjs`, the code the
// checker and demo-sync ran when this migration shipped.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_MODEL_ID, parseDemo } from "../../tools/devbook-meta/demo.mjs";
import { DEVBOOK_PREFIX, provedByCases } from "../../tools/devbook-meta/metadata.mjs";
import { parseWithSpans } from "../../tools/scenarios/demo-sync.mjs";
import { DOMAIN_FOLDER, SCENARIO_FOLDER, slugify } from "../../tools/scenarios/parse.mjs";
import { resolveLinkedPage, scenarioPages, syncDemo } from "../032-scenarios-md/legacy-page.mjs";

const ID = "030-linked-walkthroughs";
const STAMP = ".devbook/config.json";
const DEMO_FILE = /\.demo\.html$/i;

/** A string as JSON that is safe inside `<script>`: `</` cannot close the element. */
const scriptString = (text) => JSON.stringify(text).replace(/<\//g, "<\\/");

async function exists(absPath) {
    try { await stat(absPath); return true; } catch { return false; }
}

/** Every file under `rel` matching `pattern`, as sorted POSIX paths, skipping `_meta/`. */
async function filesUnder(root, rel, pattern) {
    const out = [];
    let entries;
    try { entries = await readdir(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
    for (const entry of entries) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) { if (entry.name !== "_meta") out.push(...(await filesUnder(root, child, pattern))); }
        else if (entry.isFile() && pattern.test(entry.name)) out.push(child);
    }
    return out.sort();
}

/** The page a `Proved by:` target names, resolved from the requirement's file as the checker does. */
function provedPage(fromPath, pagePart, pages) {
    if (!pagePart.endsWith(".md")) return null;
    if (pagePart.startsWith(DEVBOOK_PREFIX)) return pages.has(pagePart) ? pagePart : null;
    if (pagePart.includes("/")) {
        const target = path.posix.join(path.posix.dirname(fromPath), pagePart);
        return pages.has(target) ? target : null;
    }
    const found = [...pages.values()].filter((page) => page.stem === pagePart.slice(0, -3));
    return found.length === 1 ? found[0].path : null;
}

/** The bounded context a path under `domain/` sits in: its folder there, or "" at the root. */
export function contextOf(relPath) {
    const segments = relPath.split("/");
    return segments.length > 3 ? segments[2] : "";
}

/**
 * Every `Proved by:` case under `domain/` that resolves to a part, keyed by the bounded
 * context its requirement sits in and then by the case's slug — the heading's own anchor
 * and its name without `Scenario:`, as a requirement's walkthrough id is matched — each to
 * the parts it names, `<page path>#<anchor>` to the pointer as written.
 */
async function provedCases(root, pages) {
    const byContext = new Map();
    for (const relPath of await filesUnder(root, DOMAIN_FOLDER, /\.md$/i)) {
        const markdown = await readFile(path.join(root, relPath), "utf8");
        for (const scenarioCase of provedByCases(relPath, markdown)) {
            if (scenarioCase.pointers.length !== 1) continue; // the checker reports two
            const target = scenarioCase.pointers[0].target;
            const hash = target.indexOf("#");
            if (hash <= 0) continue;
            const page = provedPage(relPath, target.slice(0, hash), pages);
            const anchor = target.slice(hash + 1);
            if (!page || !pages.get(page).page.parts.some((p) => p.anchor === anchor)) continue;
            const name = scenarioCase.heading.replace(/^\s*Scenario:\s*/i, "");
            const context = contextOf(relPath);
            if (!byContext.has(context)) byContext.set(context, new Map());
            const bySlug = byContext.get(context);
            for (const slug of new Set([slugify(scenarioCase.heading), slugify(name)])) {
                const parts = bySlug.get(slug) ?? new Map();
                if (!parts.has(`${page}#${anchor}`)) parts.set(`${page}#${anchor}`, { page, anchor, target, requirement: scenarioCase.requirement });
                bySlug.set(slug, parts);
            }
        }
    }
    return byContext;
}

/**
 * Rewrite one demo. Returns `{ html, linked, notApplicable }`: `html` the file with each
 * matched free walkthrough of the part's step count linked and its text copied, nothing
 * else moved; `linked` the ids rewritten; `notApplicable` one `{ id, reason }` per matched
 * walkthrough left free; `problem` what the sync could not resolve, when it could not.
 * Only a case whose requirement sits in the demo's own bounded context is matched.
 */
export function migrateDemo(html, relPath, pages, byContext) {
    const bySlug = byContext.get(contextOf(relPath)) ?? new Map();
    const linked = [];
    const notApplicable = [];
    const demo = parseDemo(html);
    if (demo.modelError) return { html, linked, notApplicable, skipped: `${relPath} ${demo.modelError}` };

    const script = demo.scripts.find((s) => s.id === DEMO_MODEL_ID);
    const bodyAt = html.indexOf(">", script.offset) + 1;
    const root = parseWithSpans(script.body);
    const edits = [];

    for (const node of root.members?.get("walkthroughs")?.items ?? []) {
        if (node.kind !== "object") continue;
        const id = node.members.get("id")?.value;
        if (typeof id !== "string" || node.members.has("part")) continue;
        const candidates = bySlug.get(id);
        if (!candidates) continue;
        if (candidates.size > 1) {
            notApplicable.push({ id, reason: `its id is the slug of \`Proved by:\` cases naming ${candidates.size} parts — ${[...candidates.keys()].join(", ")}; link it by hand` });
            continue;
        }
        const [{ page, anchor, target }] = candidates.values();
        const entry = pages.get(page);
        const partSteps = entry.page.parts.find((p) => p.anchor === anchor).steps;
        const steps = node.members.get("steps")?.items ?? [];
        if (steps.some((step) => step.kind !== "object")) {
            notApplicable.push({ id, reason: "a step is not an object, so it cannot carry `step`; fix the walkthrough's shape first" });
            continue;
        }
        if (steps.length !== partSteps.length) {
            notApplicable.push({ id, reason: `it has ${steps.length} step(s) and ${page}#${anchor} has ${partSteps.length}, so no step maps to a part step by position; link it by hand` });
            continue;
        }

        // `part` as the line wrote it where it resolves from the demo to the same page,
        // else the repository path, so the demo names the part the requirement does.
        const asWritten = target.slice(0, target.indexOf("#"));
        const part = resolveLinkedPage(relPath, asWritten, pages).path === page ? target : `${page}#${anchor}`;
        const signatureNode = node.members.get("signature");
        const idNode = node.members.get("id");
        if (signatureNode) {
            edits.push({ start: signatureNode.start, end: signatureNode.end, to: scriptString(entry.signature) });
            edits.push({ start: idNode.end, end: idNode.end, to: `, "part": ${scriptString(part)}` });
        } else {
            edits.push({ start: idNode.end, end: idNode.end, to: `, "part": ${scriptString(part)}, "signature": ${scriptString(entry.signature)}` });
        }
        steps.forEach((step, index) => {
            const stepNode = step.members.get("step");
            const add = [];
            if (stepNode) edits.push({ start: stepNode.start, end: stepNode.end, to: String(index + 1) });
            else add.push(`"step": ${index + 1}`);
            // A step with no text gets one for the sync to fill.
            if (step.members.get("text")?.kind !== "string") {
                const textNode = step.members.get("text");
                if (textNode) edits.push({ start: textNode.start, end: textNode.end, to: '""' });
                else add.push('"text": ""');
            }
            if (add.length) edits.push({ start: step.start + 1, end: step.start + 1, to: add.join(", ") + (step.members.size ? ", " : "") });
        });
        linked.push(id);
    }

    if (!edits.length) return { html, linked, notApplicable };
    let body = script.body;
    for (const edit of edits.sort((a, b) => b.start - a.start)) body = body.slice(0, edit.start) + edit.to + body.slice(edit.end);
    const rewritten = html.slice(0, bodyAt) + body + html.slice(bodyAt + script.body.length);
    // The step text is demo-sync's to copy: each linked step takes its part step's.
    // Only the walkthroughs linked here: an older linked one's drift is the checker's to report.
    const synced = syncDemo(rewritten, relPath, pages, { only: new Set(linked) });
    if (synced.problems.length) return { html, linked: [], notApplicable, problem: synced.problems.join("\n") };
    return { html: synced.html, linked, notApplicable };
}

async function main(argv) {
    const checkOnly = argv.includes("--check");
    const option = (name, fallback) => (argv.indexOf(name) !== -1 ? argv[argv.indexOf(name) + 1] : fallback);
    const ROOT = path.resolve(option("--root", process.cwd()));
    const scenarioFolder = option("--scenario-folder", SCENARIO_FOLDER);
    const done = (line) => { console.log(`${ID}: ${line}`); process.exit(0); };

    if (!(await exists(path.join(ROOT, STAMP)))) done("nothing to do — no stamp.");
    const devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
    if (!devbook) done("nothing to do — no components.devbook stamp.");
    if (!(devbook.adopted ?? []).includes("domain")) done("not-applicable — `domain` is not adopted.");

    const pages = await scenarioPages(ROOT, scenarioFolder);
    const byContext = await provedCases(ROOT, pages);
    let work = 0;
    let failed = false;
    for (const relPath of await filesUnder(ROOT, DOMAIN_FOLDER, DEMO_FILE)) {
        const file = path.join(ROOT, relPath);
        const html = await readFile(file, "utf8");
        let result;
        try {
            result = migrateDemo(html, relPath, pages, byContext);
        } catch (error) {
            result = { html, linked: [], notApplicable: [], skipped: `${relPath}: its \`${DEMO_MODEL_ID}\` is not valid JSON — ${error.message}` };
        }
        // A demo whose model does not read is the checker's to report; nothing here can link it.
        if (result.skipped) console.warn(`- skipped ${result.skipped}`);
        for (const { id, reason } of result.notApplicable) console.log(`- not-applicable ${relPath} walkthrough "${id}": left free — ${reason}.`);
        for (const id of result.linked) console.log(`- ${checkOnly ? "link" : "linked"} ${relPath} walkthrough "${id}"`);
        if (result.problem) { console.error(result.problem); failed = true; }
        work += result.linked.length;
        if (!checkOnly && result.html !== html) await writeFile(file, result.html, "utf8");
    }

    if (failed) process.exit(1);
    if (checkOnly) {
        if (work) process.exit(1);
        done("no free walkthrough left to link.");
    }
    done(work ? `applied; linked ${work} walkthrough(s).` : "nothing to do — no free walkthrough left to link.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
