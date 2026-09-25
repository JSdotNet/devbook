#!/usr/bin/env node
// 018-behaviour-titles — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shape that must not be present is a
// behaviour file whose `#` title is not its kind. Once every one reads
// `# Requirements` or `# Invariants` the migration has nothing to see.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const DOMAIN = ".devbook/domain";

/** The title a behaviour file takes, or null for every other file. */
function titleFor(name) {
    if (/^requirements(?:\.[^.]+)?\.md$/.test(name)) return "Requirements";
    if (/^domain(?:\.[^.]+)?\.invariants\.md$/.test(name)) return "Invariants";
    return null;
}

async function exists(relPath) {
    try {
        await stat(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

/** The text with its first `#` heading outside a fence set to `title`, or null when it has none. */
function retitle(text, title) {
    const lines = text.split("\n");
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("```")) inFence = !inFence;
        else if (!inFence && /^# /.test(lines[i])) {
            lines[i] = `# ${title}`;
            return lines.join("\n");
        }
    }
    return null;
}

const report = (line) => console.log(line);
let remaining = 0;

if (await exists(DOMAIN)) {
    for (const entry of await readdir(path.join(ROOT, DOMAIN), { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
        const context = path.posix.join(DOMAIN, entry.name);
        for (const name of (await readdir(path.join(ROOT, context))).sort()) {
            const title = titleFor(name);
            if (!title) continue;
            const file = path.posix.join(context, name);
            // Files are read as LF and written back with the line ending they
            // had, so a CRLF checkout is migrated without a whole-file diff.
            const raw = await readFile(path.join(ROOT, file), "utf8");
            const eol = raw.includes("\r\n") ? "\r\n" : "\n";
            const text = raw.replace(/\r\n/g, "\n");
            const next = retitle(text, title);
            if (next === null || next === text) continue;
            remaining++;
            if (checkOnly) {
                report(`${file}: would retitle to # ${title}`);
                continue;
            }
            await writeFile(path.join(ROOT, file), eol === "\n" ? next : next.replace(/\n/g, eol), "utf8");
            report(`${file}: retitled to # ${title}`);
        }
    }
}

if (remaining === 0) report("018-behaviour-titles: nothing to do.");
process.exit(checkOnly && remaining > 0 ? 1 : 0);
