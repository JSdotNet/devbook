#!/usr/bin/env node
// 038-workflow-state-leaves-the-chapter — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shape that must not be present is a `meta`
// block holding one of the moved fields, a `status` in `tech/` or `ai/`, or an
// `annotation` fence. Once every one is deleted or renamed `rating`, nothing is
// left to see, which is what makes re-running it safe.
//
// It writes no export file. Each host imports the state and the open notes
// from the default branch's Markdown with its own parser before this runs; the
// report lists every value and note taken off so the person running it can
// check the import has it.
//
// Dependency-free ESM against node built-ins, self-contained so it reads the
// Markdown as it stands rather than through a checker that no longer knows the
// fields.

import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID = "038-workflow-state-leaves-the-chapter";
const STAMP = ".devbook/config.json";
const STATUSES = ".devbook/statuses.json";
const CHANGES = "openspec/changes";
const DELTA = "devbook-delta";

export const FOLDERS = ["domain", "arc42", "tech", "design", "ai"];

// The checker's files contract 38 retired. Reconcile replaces a vendored copy
// and never deletes one, so each would stay behind as an orphan — and the
// tests import what metadata.mjs no longer exports, so they fail where
// anyone runs the folder's tests. Nothing reads any of them. The last four
// went with the `annotation` fence.
const TOOLS = ".devbook/_tools/devbook-meta";
export const RETIRED_TOOL_FILES = [
    "statuses.mjs",
    "statuses.test.mjs",
    "accepted-rung.test.mjs",
    "status-optional.test.mjs",
    "sync-field.test.mjs",
    "annotations.mjs",
    "annotations-index.mjs",
    "annotations.test.mjs",
    "annotations-write.test.mjs",
];

// The delivered rule for the fence and its two host wrappers. Reconcile
// orphans a rule nothing ships any more and leaves it, and this one tells a
// model to write a fence through a tool that is gone.
export const RETIRED_RULE_FILES = [
    ".agents/rules/devbook-annotations.md",
    ".claude/rules/devbook-annotations.md",
    ".github/instructions/devbook-annotations.instructions.md",
];

/** The retired checker and rule files still present, as repository paths. */
export async function retiredFiles(root) {
    const found = [];
    for (const name of RETIRED_TOOL_FILES) if (await exists(path.join(root, ...TOOLS.split("/"), name))) found.push(`${TOOLS}/${name}`);
    for (const rel of RETIRED_RULE_FILES) if (await exists(path.join(root, ...rel.split("/")))) found.push(rel);
    return found;
}

/** The folders whose `status` is a rating, renamed `rating` rather than deleted. */
export const RATING_FOLDERS = ["tech", "ai"];

/** The fields deleted from every block. `status` joins them outside the rating folders. */
export const MOVED_FIELDS = [
    "approved-by",
    "approved-at",
    "approved-hash",
    "accepted-by",
    "accepted-at",
    "accepted-hash",
    "sync",
    "issue",
    "effort",
    "roadmap",
    "change",
];

const unquote = (value) => value.replace(/^(["'])(.*)\1$/, "$2");
const FIELD_LINE = /^(\s*)([A-Za-z][\w.-]*)(\s*:\s*)(.*)$/;

/**
 * Rewrite one file's top-level ```meta fences. `rating` is true where `status`
 * is a rating (`tech/`, `ai/`, or a delta landing there); `deltaHeader` is true
 * for a delta file, whose first block is its header and keeps `change`.
 *
 * Returns the new text and, per block it changed, `{ heading, line, removed,
 * renamed, conflict }` — `removed` the fields taken off with their values.
 */
export function rewrite(text, { rating = false, deltaHeader = false } = {}) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const out = [];
    const blocks = [];
    let heading = null;
    let openFence = null;
    let current = null;
    let metaSeen = 0;

    const finish = () => {
        if (!current) return;
        const lines = current.lines;
        const ratingAt = lines.findIndex((l) => l.key === "rating");
        const block = { heading: current.heading, line: current.line, removed: [], renamed: null, conflict: null };
        const kept = [];
        for (const entry of lines) {
            if (entry.key === null) {
                kept.push(entry.text);
                continue;
            }
            const header = current.header && (entry.key === "change" || entry.key === "delta");
            if (header) {
                kept.push(entry.text);
                continue;
            }
            if (entry.key === "status" && rating) {
                if (ratingAt === -1) {
                    const m = FIELD_LINE.exec(entry.text);
                    kept.push(`${m[1]}rating${m[3]}${m[4]}`);
                    block.renamed = entry.value;
                } else {
                    const other = lines[ratingAt].value;
                    block.removed.push(["status", entry.value]);
                    if (other !== entry.value) block.conflict = { status: entry.value, rating: other };
                }
                continue;
            }
            if (entry.key === "status" || MOVED_FIELDS.includes(entry.key)) {
                block.removed.push([entry.key, entry.value]);
                continue;
            }
            kept.push(entry.text);
        }
        out.push(...kept);
        if (block.removed.length || block.renamed !== null) blocks.push(block);
        current = null;
    };

    for (const [index, line] of lines.entries()) {
        const trimmed = line.trim();
        // Any info string opens a fence, as the checker reads it; only a bare
        // run of the opening marker closes one.
        const fence = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);

        if (fence && openFence === null) {
            openFence = { marker: fence[1], label: (fence[2].trim().split(/\s+/)[0] ?? "").toLowerCase() };
            if (openFence.label === "meta") {
                current = { heading, line: index + 1, lines: [], header: deltaHeader && metaSeen === 0 };
                metaSeen++;
            }
            out.push(line);
            continue;
        }
        if (fence && openFence && fence[1][0] === openFence.marker[0] &&
            fence[1].length >= openFence.marker.length && fence[2].trim() === "") {
            finish();
            openFence = null;
            out.push(line);
            continue;
        }
        if (!openFence) {
            const h = /^#{1,6}\s+(.*)$/.exec(line);
            if (h) heading = h[1].trim();
            out.push(line);
            continue;
        }
        if (openFence.label !== "meta") {
            out.push(line);
            continue;
        }
        const match = FIELD_LINE.exec(line);
        // The checker trims a key's indentation, so an indented key is the field too.
        current.lines.push(match
            ? { key: match[2], value: unquote(match[4].trim()), text: line }
            : { key: null, text: line });
    }
    // An unclosed fence at end of file: keep what it held untouched.
    if (current) out.push(...current.lines.map((l) => l.text));

    return { text: out.join(eol), blocks };
}

/** A fence closer: a bare run of the opener's character, at least as long. */
const closes = (line, marker) => {
    const m = /^(`{3,}|~{3,})\s*$/.exec(line.trim());
    return m !== null && m[1][0] === marker[0] && m[1].length >= marker.length;
};

/** What a report line says about one note: its kind, status, author, and the start of its body. */
function noteSummary(body) {
    const fields = {};
    let text = null;
    for (const [index, line] of body.entries()) {
        const m = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (m && !(m[1] in fields)) {
            fields[m[1]] = unquote(m[2].trim());
            if (m[1] === "body" && /^[|>][+-]?$/.test(fields.body)) {
                fields.body = (body.slice(index + 1).find((l) => l.trim() !== "") ?? "").trim();
            }
            continue;
        }
        if (text === null && line.trim() !== "" && !/^\s/.test(line)) text = line.trim();
    }
    const said = String(fields.body ?? text ?? "").trim();
    return {
        kind: fields.kind ?? "comment",
        status: fields.status ?? "open",
        author: fields.author ?? null,
        body: said.length > 80 ? `${said.slice(0, 77)}...` : said,
    };
}

/**
 * Delete every top-level `annotation` fence, open or resolved, with the blank
 * line it sat in, so the gap closes up. A fence inside another fence is that
 * fence's content, and an unclosed one is left as it is.
 *
 * Returns the new text and, per fence, `{ heading, line, kind, status, author,
 * body }` — what the report prints, since no export file is written.
 */
export function stripAnnotations(text) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const out = [];
    const fences = [];
    let heading = null;
    for (let i = 0; i < lines.length; i++) {
        const fence = /^(`{3,}|~{3,})(.*)$/.exec(lines[i].trim());
        if (!fence) {
            const h = /^#{1,6}\s+(.*)$/.exec(lines[i]);
            if (h) heading = h[1].trim();
            out.push(lines[i]);
            continue;
        }
        let k = i + 1;
        while (k < lines.length && !closes(lines[k], fence[1])) k++;
        if (k >= lines.length) {
            out.push(...lines.slice(i));
            break;
        }
        // The whole info string, as the checker reads a fence: `annotation title`
        // was never a note, so it is content and stays.
        if (fence[2].trim().toLowerCase() !== "annotation") {
            out.push(...lines.slice(i, k + 1));
            i = k;
            continue;
        }
        fences.push({ heading, line: i + 1, ...noteSummary(lines.slice(i + 1, k)) });
        const blankBefore = out.length > 0 && out[out.length - 1].trim() === "";
        const blankAfter = k + 1 >= lines.length || lines[k + 1].trim() === "";
        if (blankBefore && blankAfter) out.pop();
        // Two blocks the fence sat between stay two blocks.
        else if (!blankBefore && !blankAfter && out.length > 0) out.push("");
        // A fence that opened the file takes the blank line after it along.
        else if (out.length === 0 && blankAfter && k + 1 < lines.length - 1) k++;
        i = k;
    }
    return { text: out.join(eol), fences };
}

/** One report line per deleted fence. */
export function describeFence(rel, fence) {
    const by = fence.author ? ` by ${fence.author}` : "";
    return `${rel}:${fence.line} (${fence.heading ?? "no heading"}): annotation, ${fence.kind} ${fence.status}${by} — "${fence.body}"`;
}

async function* markdownFiles(dir) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.startsWith("_")) continue; // _meta, _tools: never chapters
            yield* markdownFiles(full);
        } else if (entry.name.toLowerCase().endsWith(".md")) {
            yield full;
        }
    }
}

async function exists(p) {
    try {
        await stat(p);
        return true;
    } catch {
        return false;
    }
}

/** The adopted folders: the stamp's `adopted`, else the folders on disk. */
async function adoptedFolders(root) {
    try {
        const stamp = JSON.parse((await readFile(path.join(root, STAMP), "utf8")).replace(/^﻿/, ""));
        const adopted = stamp?.components?.devbook?.adopted;
        if (Array.isArray(adopted)) return FOLDERS.filter((f) => adopted.includes(f));
    } catch {
        // No stamp: fall back to what is on disk.
    }
    const found = [];
    for (const folder of FOLDERS) if (await exists(path.join(root, ".devbook", folder))) found.push(folder);
    return found;
}

/** Every file to rewrite, with how to read it. */
export async function plan(root) {
    const files = [];
    for (const folder of await adoptedFolders(root)) {
        for await (const file of markdownFiles(path.join(root, ".devbook", folder))) {
            files.push({ file, rating: RATING_FOLDERS.includes(folder), deltaHeader: false });
        }
    }
    const changes = path.join(root, ...CHANGES.split("/"));
    let names = [];
    try {
        names = (await readdir(changes, { withFileTypes: true }))
            .filter((e) => e.isDirectory() && e.name !== "archive")
            .map((e) => e.name)
            .sort();
    } catch {
        // No change folder.
    }
    for (const name of names) {
        const base = path.join(changes, name);
        if (await exists(path.join(base, "proposal.md"))) files.push({ file: path.join(base, "proposal.md"), rating: false, deltaHeader: false });
        const deltas = path.join(base, DELTA);
        for await (const file of markdownFiles(deltas)) {
            const target = path.relative(deltas, file).split(path.sep)[0];
            files.push({ file, rating: RATING_FOLDERS.includes(target), deltaHeader: true });
        }
    }

    const results = [];
    for (const entry of files) {
        const original = await readFile(entry.file, "utf8");
        const rewritten = rewrite(original, entry);
        // Report each fence at its line in the file as it stands, before `meta` lines come off.
        const { fences } = stripAnnotations(original);
        const { text } = stripAnnotations(rewritten.text);
        const blocks = rewritten.blocks;
        if (!blocks.length && !fences.length) continue;
        results.push({ rel: path.relative(root, entry.file).split(path.sep).join("/"), file: entry.file, text, blocks, fences });
    }
    return results;
}

/** One report line per block: what came off, value included. */
export function describe(rel, block) {
    const parts = block.removed.map(([key, value]) => `${key} ${value}`);
    if (block.renamed !== null) parts.unshift(`status ${block.renamed} renamed rating`);
    const conflict = block.conflict
        ? ` — conflict: status ${block.conflict.status} differs from rating ${block.conflict.rating}; rating kept`
        : "";
    return `${rel}:${block.line} (${block.heading ?? "no heading"}): ${parts.join(", ")}${conflict}`;
}

async function main(argv) {
    const checkOnly = argv.includes("--check");
    const rootIndex = argv.indexOf("--root");
    const ROOT = path.resolve(rootIndex !== -1 ? argv[rootIndex + 1] : process.cwd());

    const results = await plan(ROOT);
    const orphans = await retiredFiles(ROOT);
    const verb = checkOnly ? "would take off" : "took off";
    for (const result of results) {
        for (const block of result.blocks) console.log(`- ${verb} ${describe(result.rel, block)}`);
        for (const fence of result.fences) console.log(`- ${verb} ${describeFence(result.rel, fence)}`);
    }
    for (const orphan of orphans) console.log(`- ${checkOnly ? "would delete" : "deleted"} ${orphan}, which devbook no longer ships`);
    // A change's fingerprint covers its proposal and every delta, `meta`
    // blocks included, so a rewritten change no longer matches a decision a
    // host imported at the old fingerprint. Its `annotation` fences are not
    // part of it, so deleting one moves nothing.
    const changes = [...new Set(results.filter((r) => r.blocks.length && r.rel.startsWith(`${CHANGES}/`)).map((r) => r.rel.split("/")[2]))];
    for (const name of changes) {
        console.log(`- ${CHANGES}/${name}/ fingerprints anew once rewritten: a decision a host imported at the old fingerprint is decided again`);
    }
    if (await exists(path.join(ROOT, STATUSES))) {
        console.log(
            `- ${STATUSES} is no longer read by the check. Each host imports its ladders into its own ` +
            "configuration; delete the file once they have. This migration leaves it in place.",
        );
    }

    if (!results.length && !orphans.length) {
        console.log(`${ID}: nothing to do`);
        process.exit(0);
    }
    if (checkOnly) {
        console.log(`${ID}: ${results.length} file(s) to rewrite, ${orphans.length} retired file(s) to delete.`);
        process.exit(1);
    }
    for (const result of results) await writeFile(result.file, result.text, "utf8");
    for (const orphan of orphans) await rm(path.join(ROOT, ...orphan.split("/")));
    console.log(
        `${ID}: applied; rewrote ${results.length} file(s), deleted ${orphans.length} retired file(s). No export file was written: the values ` +
        "and notes above live on only in git history, so check that each host imported them from the default branch.",
    );
    process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
