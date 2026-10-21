#!/usr/bin/env node
// 034-delivery-path-stages — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shape that must not be present is a `stage`
// entry in an `ai/` `meta` block that names a word only the DevOps loop had —
// `plan`, `build`, `test`, `deploy`, `monitor`. `release` is a word of both
// vocabularies, so a block is read as the loop's when it carries one of those
// five, and a block carrying only shared words (`code`, `release`, `operate`)
// is read as the loop's when another block in the same folder does. Once every
// loop word is rewritten, no block reads as the loop's, so nothing is left to
// see and a moved `release` is never moved twice.
//
// It adds no `substage`, `layer`, `feeds`, or `evidence`: those are the
// repository's to place, and the report says so.
//
// Dependency-free ESM against node built-ins and the plugin's own vocabulary.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AI_STAGES } from "../../tools/devbook-meta/metadata.mjs";

const ID = "034-delivery-path-stages";
const STAMP = ".devbook/config.json";
const AI = ".devbook/ai";

/** The loop's eight words onto the path's seven, per devbook-ai.md. */
export const STAGE_MAP = {
    plan: "specify",
    code: "code",
    build: "integrate",
    test: "verify",
    release: "integrate",
    deploy: "release",
    operate: "operate",
    monitor: "operate",
};
const LOOP_ONLY = Object.keys(STAGE_MAP).filter((word) => !AI_STAGES.includes(word));
const PATH_ONLY = AI_STAGES.filter((word) => !(word in STAGE_MAP));

const stripQuotes = (value) => value.replace(/^(["'])(.*)\1$/, "$2");

/** A `stage` value as written — scalar or `[a, b]` — as its list of words. */
function wordsOf(raw) {
    const value = raw.trim();
    const inner = /^\[(.*)\]$/.exec(value);
    const entries = inner ? inner[1].split(",") : [value];
    return entries.map((entry) => stripQuotes(entry.trim())).filter(Boolean);
}

/** The path's words in path order, then any word off both vocabularies in its own order. */
function ordered(words) {
    const unique = [...new Set(words)];
    const known = AI_STAGES.filter((word) => unique.includes(word));
    return [...known, ...unique.filter((word) => !AI_STAGES.includes(word))];
}

/**
 * Every `stage` line inside a ```meta fence of one file, with its line index,
 * the heading above it, and its words. Lines in any other fence are never read.
 */
export function stageLines(text) {
    const lines = text.split(/\r?\n/);
    const found = [];
    let heading = null;
    let open = null;
    for (const [index, line] of lines.entries()) {
        const fence = /^(`{3,}|~{3,})\s*([^\s`~]*)\s*$/.exec(line.trim());
        if (fence && open === null) {
            open = { marker: fence[1], label: fence[2].toLowerCase() };
            continue;
        }
        if (fence && open && fence[1][0] === open.marker[0] && fence[1].length >= open.marker.length && fence[2] === "") {
            open = null;
            continue;
        }
        if (!open) {
            const h = /^#{1,6}\s+(.*)$/.exec(line);
            if (h) heading = h[1].trim();
            continue;
        }
        if (open.label !== "meta") continue;
        const match = /^(\s*stage\s*:)(.*)$/.exec(line);
        if (match) found.push({ index, heading, prefix: match[1], words: wordsOf(match[2]) });
    }
    return found;
}

const isLoop = (words) => words.some((word) => LOOP_ONLY.includes(word));
const isPath = (words) => words.some((word) => PATH_ONLY.includes(word));

/**
 * The rewrite of one block's words, or null when it is left as it is.
 * `folderIsLoop` is true when any block of the folder carries a loop-only word.
 * Returns `{ words, note }`; `note` explains a block left or partly moved.
 */
export function rewriteWords(words, folderIsLoop) {
    const loop = isLoop(words);
    const pathWords = isPath(words);
    if (loop && pathWords) {
        // Half moved by hand: move the loop-only words, keep the rest as written.
        const moved = ordered(words.map((word) => (LOOP_ONLY.includes(word) ? STAGE_MAP[word] : word)));
        const note = words.includes("release") ? "mixes both vocabularies; `release` was kept as the path's Release & deploy — check it" : null;
        return { words: moved, note };
    }
    if (loop || (!pathWords && folderIsLoop)) {
        return { words: ordered(words.map((word) => STAGE_MAP[word] ?? word)), note: null };
    }
    if (!pathWords && words.includes("release")) {
        return { words: null, note: "reads the same under both vocabularies; `release` was left as the path's Release & deploy — if it meant the loop's release, it is `integrate`" };
    }
    return { words: null, note: null };
}

const format = (prefix, original, words) => {
    const raw = original.slice(prefix.length).trim();
    const scalar = !/^\[/.test(raw) && words.length === 1;
    return `${prefix} ${scalar ? words[0] : `[${words.join(", ")}]`}`;
};

/** Every chapter file under `.devbook/ai/`, as sorted POSIX paths; `_` folders are generated. */
async function chapterFiles(root, rel = AI) {
    let entries;
    try {
        entries = await readdir(path.join(root, rel), { withFileTypes: true });
    } catch {
        return [];
    }
    const out = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) {
            if (!entry.name.startsWith("_")) out.push(...(await chapterFiles(root, child)));
        } else if (entry.name.toLowerCase().endsWith(".md")) out.push(child);
    }
    return out;
}

/**
 * The plan for a repository: per file, its rewritten text when it changed,
 * and every report line. Pure over the texts it is given.
 */
export function planFolder(files) {
    const parsed = files.map(({ rel, text }) => ({ rel, text, stages: stageLines(text) }));
    const folderIsLoop = parsed.some((file) => file.stages.some((s) => isLoop(s.words)));
    const changes = [];
    const notes = [];
    for (const file of parsed) {
        const eol = file.text.includes("\r\n") ? "\r\n" : "\n";
        const lines = file.text.split(/\r?\n/);
        const moved = [];
        for (const s of file.stages) {
            const { words, note } = rewriteWords(s.words, folderIsLoop);
            const where = `${file.rel}:${s.index + 1} (${s.heading ?? "no heading"})`;
            if (note) notes.push(`${where}: ${note}.`);
            if (!words || words.join(",") === s.words.join(",")) continue;
            lines[s.index] = format(s.prefix, lines[s.index], words);
            moved.push(`${where}: stage [${s.words.join(", ")}] → [${words.join(", ")}]`);
        }
        if (moved.length) changes.push({ rel: file.rel, text: lines.join(eol), moved });
    }
    return { changes, notes };
}

async function main(argv) {
    const checkOnly = argv.includes("--check");
    const rootIndex = argv.indexOf("--root");
    const ROOT = path.resolve(rootIndex !== -1 ? argv[rootIndex + 1] : process.cwd());
    const done = (line, code = 0) => {
        console.log(`${ID}: ${line}`);
        process.exit(code);
    };

    let devbook = null;
    try {
        devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
    } catch {
        done("nothing to do — no stamp.");
    }
    if (!devbook) done("nothing to do — no components.devbook stamp.");
    if (!(devbook.adopted ?? []).includes("ai")) done("not-applicable — `ai` is not adopted.");
    try {
        await stat(path.join(ROOT, AI));
    } catch {
        done("nothing to do — no .devbook/ai/ folder.");
    }

    const files = [];
    for (const rel of await chapterFiles(ROOT)) files.push({ rel, text: await readFile(path.join(ROOT, rel), "utf8") });
    const { changes, notes } = planFolder(files);

    for (const note of notes) console.log(`- left ${note}`);
    for (const change of changes) for (const line of change.moved) console.log(`- ${checkOnly ? "would move" : "moved"} ${line}`);
    if (!changes.length) done("nothing to do — no `stage` entry names a loop word.");
    if (checkOnly) done(`${changes.length} file(s) to rewrite.`, 1);

    for (const change of changes) await writeFile(path.join(ROOT, change.rel), change.text, "utf8");
    done(
        `applied; rewrote ${changes.length} file(s). Nothing was placed on a layer, split into a ` +
        "`substage`, or given `feeds` or `evidence`, and no **Moves up when** bullet was written: " +
        "those are the repository's to place, per devbook-ai.md. A usage that runs under every " +
        "stage — a worktree, a rule, a scheduled job — now sits at the stage its old word mapped " +
        "to and likely belongs on `thread`, `upkeep`, or `harness`.",
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
