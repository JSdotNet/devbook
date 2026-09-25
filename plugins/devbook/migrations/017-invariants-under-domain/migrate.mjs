#!/usr/bin/env node
// 017-invariants-under-domain — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are a
// bounded context holding `invariants.md` or `invariants.<name>.md`, and a
// reference anywhere under `.devbook/` naming one of them. Once none is left
// the migration has nothing to see, which is what makes re-running it safe.

import { readFile, writeFile, readdir, stat, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const DEVBOOK = ".devbook";
const DOMAIN = ".devbook/domain";
const LEGACY = /^invariants(?:\.([^.]+))?\.md$/;

// Files are read as LF and written back with the line ending they had, so a
// CRLF checkout is migrated without a whole-file diff.
async function readText(relPath) {
    const raw = await readFile(path.join(ROOT, relPath), "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    return { text: raw.replace(/\r\n/g, "\n"), eol };
}

async function writeText(relPath, text, eol) {
    await writeFile(path.join(ROOT, relPath), eol === "\n" ? text : text.replace(/\n/g, eol), "utf8");
}

async function exists(relPath) {
    try {
        await stat(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

/**
 * Where a legacy file's chapters belong. `invariants.md` is the subpage of
 * `domain.md`; `invariants.<name>.md` is the subpage of `domain.<name>.md` when
 * that split page exists, and otherwise its aggregate is still on `domain.md`,
 * so its chapters join `domain.invariants.md`.
 */
async function targetOf(context, name) {
    const split = LEGACY.exec(name)?.[1];
    if (split && (await exists(path.posix.join(context, `domain.${split}.md`)))) {
        return `domain.${split}.invariants.md`;
    }
    return "domain.invariants.md";
}

/** The chapters of a file: everything from its first `##` outside a fence. */
function chaptersOf(text) {
    const lines = text.split("\n");
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("```")) inFence = !inFence;
        else if (!inFence && /^## /.test(lines[i])) return lines.slice(i).join("\n").replace(/\n+$/, "\n");
    }
    return "";
}

async function markdownUnder(relDir, found = []) {
    let entries;
    try {
        entries = await readdir(path.join(ROOT, relDir), { withFileTypes: true });
    } catch {
        return found;
    }
    for (const entry of entries) {
        const rel = path.posix.join(relDir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "_meta") await markdownUnder(rel, found);
        } else if (entry.name.endsWith(".md")) found.push(rel);
    }
    return found;
}

// ── Plan: every legacy file, and where its chapters go ─────────────────────

const moves = []; // { context, from, to }
if (await exists(DOMAIN)) {
    for (const entry of await readdir(path.join(ROOT, DOMAIN), { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
        const context = path.posix.join(DOMAIN, entry.name);
        const names = (await readdir(path.join(ROOT, context))).filter((n) => LEGACY.test(n)).sort();
        // `invariants.md` first, so a split merging into `domain.invariants.md`
        // lands after the chapters that were already there.
        names.sort((a, b) => (a === "invariants.md" ? -1 : b === "invariants.md" ? 1 : 0));
        for (const from of names) {
            const to = await targetOf(context, from);
            moves.push({ context, from, to });
        }
    }
}

// References to a legacy file that no longer exists still need rewriting on a
// second run after a partial one, so every reference is mapped by rule too.
async function rewriteRef(context, name) {
    return path.posix.join(context, await targetOf(context, name));
}

const LEGACY_REF = /(\.devbook\/domain\/[^/\s\])"'#,]+)\/(invariants(?:\.[^.\s/\])"'#,]+)?\.md)/g;
const LEGACY_LINK = /(\]\((?:\.\/)?)(invariants(?:\.[^.\s/)#]+)?\.md)/g;

async function rewriteText(relPath, text) {
    let next = text;
    for (const match of [...text.matchAll(LEGACY_REF)]) {
        const [whole, context, name] = match;
        if (!LEGACY.test(name)) continue;
        next = next.split(whole).join(await rewriteRef(context, name));
    }
    // A relative link inside the same context folder.
    const own = path.posix.dirname(relPath);
    if (own.startsWith(`${DOMAIN}/`) && own.split("/").length === 3) {
        for (const match of [...next.matchAll(LEGACY_LINK)]) {
            const [whole, prefix, name] = match;
            if (!LEGACY.test(name)) continue;
            next = next.split(whole).join(`${prefix}${await targetOf(own, name)}`);
        }
    }
    return next;
}

// ── Report, and apply unless --check ───────────────────────────────────────

const report = (line) => console.log(line);
let remaining = 0;

for (const { context, from, to } of moves) {
    remaining++;
    const fromPath = path.posix.join(context, from);
    const toPath = path.posix.join(context, to);
    const merging = await exists(toPath);
    if (checkOnly) {
        report(`${fromPath}: would ${merging ? "append its chapters to" : "move to"} ${toPath}`);
        continue;
    }
    const source = await readText(fromPath);
    if (merging) {
        const target = await readText(toPath);
        const chapters = chaptersOf(source.text);
        if (chapters) await writeText(toPath, `${target.text.replace(/\n+$/, "")}\n\n${chapters}`, target.eol);
    } else {
        await writeText(toPath, source.text, source.eol);
    }
    await rm(path.join(ROOT, fromPath));
    report(`${fromPath}: ${merging ? "chapters appended to" : "moved to"} ${toPath}`);
}

for (const file of await markdownUnder(DEVBOOK)) {
    if (!(await exists(file))) continue;
    const { text, eol } = await readText(file);
    const next = await rewriteText(file, text);
    if (next === text) continue;
    remaining++;
    if (checkOnly) report(`${file}: would rewrite references to a legacy invariants file`);
    else {
        await writeText(file, next, eol);
        report(`${file}: rewrote references to a legacy invariants file`);
    }
}

if (remaining === 0) report("017-invariants-under-domain: nothing to do.");
process.exit(checkOnly && remaining > 0 ? 1 : 0);
