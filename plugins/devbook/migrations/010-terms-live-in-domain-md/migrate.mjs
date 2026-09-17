#!/usr/bin/env node
// 010-terms-live-in-domain-md — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are a
// `<context>/naming.md` under the domain folder and a reference into one. Once
// neither is left the migration has nothing to see, which is what makes
// re-running it safe.

import { readFile, writeFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

// Both layouts: five flat dot-folders, or the same five under `.devbook/`. A
// repository picks one, but a reference into `naming.md` can sit in any folder
// of either, so every folder that exists is scanned for references.
const FOLDER_NAMES = ["arc42", "domain", "tech", "design", "ai"];
const CANDIDATES = [
    ...FOLDER_NAMES.map((name) => `.${name}`),
    ...FOLDER_NAMES.map((name) => `.devbook/${name}`),
];

const GROUPING = "## Ubiquitous Language";
const GROUPING_BLOCK = `${GROUPING}\n\n\`\`\`meta\ntype: ubiquitous-language\n\`\`\`\n`;

// A path segment or a link/reference opener in front, an anchor or a closer
// behind: `.domain/orders/naming.md#order`, `(naming.md#order)`,
// `"../orders/naming.md#order"`. Prose naming the file in backticks is left
// exactly as written — this migration moves references, not sentences.
const REFERENCE = /([/("[])naming\.md(?=$|[#"')\],\s])/g;

async function exists(relPath) {
    try {
        await stat(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

async function markdownFiles(dir) {
    const out = [];
    for (const entry of await readdir(path.join(ROOT, dir), { withFileTypes: true })) {
        if (entry.name.startsWith("_")) continue;
        const rel = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...(await markdownFiles(rel)));
        else if (entry.name.endsWith(".md")) out.push(rel);
    }
    return out;
}

/** The `##` chapters of a naming.md, each demoted one level, fences respected. */
function chaptersOf(text) {
    const lines = text.split("\n");
    let start = -1;
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("```")) inFence = !inFence;
        else if (!inFence && /^## /.test(lines[i])) {
            start = i;
            break;
        }
    }
    if (start === -1) return "";
    inFence = false;
    const demoted = lines.slice(start).map((line) => {
        if (line.startsWith("```")) {
            inFence = !inFence;
            return line;
        }
        return !inFence && /^#{2,5} /.test(line) ? `#${line}` : line;
    });
    return `${demoted.join("\n").trimEnd()}\n`;
}

/** domain.md with the chapters appended under its grouping, created if absent. */
function fold(domainText, chapters) {
    const lines = domainText.split("\n");
    let grouping = -1;
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("```")) inFence = !inFence;
        else if (!inFence && lines[i].trim() === GROUPING) grouping = i;
    }
    if (grouping === -1) {
        return `${domainText.trimEnd()}\n\n${GROUPING_BLOCK}\n${chapters}`;
    }
    // The grouping is last by convention; when something still follows it, the
    // terms go in front of the next `##` so they stay inside the grouping.
    inFence = false;
    let end = lines.length;
    for (let i = grouping + 1; i < lines.length; i++) {
        if (lines[i].startsWith("```")) inFence = !inFence;
        else if (!inFence && /^## /.test(lines[i])) {
            end = i;
            break;
        }
    }
    const head = lines.slice(0, end).join("\n").trimEnd();
    const tail = lines.slice(end).join("\n");
    return `${head}\n\n${chapters}${tail ? `\n${tail}` : ""}`;
}

const folders = [];
for (const candidate of CANDIDATES) {
    if (await exists(candidate)) folders.push(candidate);
}

const folds = [];
const rewrites = [];

for (const domainDir of folders.filter((f) => f.endsWith("domain"))) {
    for (const entry of await readdir(path.join(ROOT, domainDir), { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
        const context = path.posix.join(domainDir, entry.name);
        const naming = path.posix.join(context, "naming.md");
        if (!(await exists(naming))) continue;
        // A term relating to a sibling term references the file it is leaving.
        const text = (await readFile(path.join(ROOT, naming), "utf8")).replace(REFERENCE, "$1domain.md");
        const chapters = chaptersOf(text);
        folds.push({
            naming,
            domain: path.posix.join(context, "domain.md"),
            chapters,
            count: (chapters.match(/^### /gm) ?? []).length,
        });
    }
}

const leaving = new Set(folds.map((item) => item.naming));
for (const folder of folders) {
    for (const file of await markdownFiles(folder)) {
        if (leaving.has(file)) continue;
        const text = await readFile(path.join(ROOT, file), "utf8");
        const count = (text.match(REFERENCE) ?? []).length;
        if (count > 0) rewrites.push({ file, text: text.replace(REFERENCE, "$1domain.md"), count });
    }
}

if (folds.length === 0 && rewrites.length === 0) {
    console.log(`010-terms-live-in-domain-md: nothing to do under ${ROOT}.`);
    process.exit(0);
}

const verb = checkOnly ? "would" : "will";
for (const item of folds) {
    console.log(`  ${verb} fold ${item.naming} into ${item.domain} (${item.count} chapter(s)) and delete it`);
}
for (const item of rewrites) {
    console.log(`  ${verb} rewrite ${item.count} reference(s) in ${item.file}`);
}

if (checkOnly) {
    console.error(`\n010-terms-live-in-domain-md: ${folds.length + rewrites.length} item(s) still to migrate.`);
    process.exit(1);
}

// References first: a rewrite may target domain.md, and the fold below reads
// the file fresh so the two never overwrite each other.
for (const { file, text } of rewrites) {
    await writeFile(path.join(ROOT, file), text, "utf8");
}
for (const { naming, domain, chapters } of folds) {
    if (chapters) {
        const domainText = (await exists(domain))
            ? await readFile(path.join(ROOT, domain), "utf8")
            : "";
        await writeFile(path.join(ROOT, domain), fold(domainText, chapters), "utf8");
    }
    await unlink(path.join(ROOT, naming));
}

console.log(`\n010-terms-live-in-domain-md: applied ${folds.length + rewrites.length} change(s).`);
