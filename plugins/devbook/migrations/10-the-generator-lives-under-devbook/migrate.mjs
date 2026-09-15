#!/usr/bin/env node
// 10-the-generator-lives-under-devbook — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are a tool
// folder under `.github/tools/` and the old path in a file the install owns.
// Once both are gone the migration has nothing to see.

import { readdir, readFile, writeFile, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

const ID = "10-the-generator-lives-under-devbook";
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const OLD_ROOT = ".github/tools";
const NEW_ROOT = ".devbook/tools";
const TOOLS = ["devbook-meta", "devbook-tech"];

// The files the install writes that name the generator. Anything else that
// names it is the repository's own, and is left for the reader.
const OWNED_FILES = [
    ".github/workflows/devbook-meta.yml",
    ".github/workflows/devbook-meta-nightly.yml",
    "build/Update-DevbookIndex.ps1",
    "AGENTS.md",
    ".devbook/config.json",
];

async function exists(relPath) {
    try {
        await stat(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

// Every file under a folder as sorted paths relative to it, so two copies of a
// tool can be compared without trusting either listing's order.
async function tree(relPath) {
    const files = [];
    async function walk(dir) {
        for (const entry of await readdir(path.join(ROOT, dir), { withFileTypes: true })) {
            const child = path.posix.join(dir, entry.name);
            if (entry.isDirectory()) await walk(child);
            else files.push(path.posix.relative(relPath, child));
        }
    }
    await walk(relPath);
    return files.sort();
}

async function identical(a, b) {
    const [ta, tb] = await Promise.all([tree(a), tree(b)]);
    if (ta.length !== tb.length || ta.some((file, i) => file !== tb[i])) return false;
    for (const file of ta) {
        const [ca, cb] = await Promise.all([
            readFile(path.join(ROOT, a, file)),
            readFile(path.join(ROOT, b, file)),
        ]);
        if (!ca.equals(cb)) return false;
    }
    return true;
}

const work = [];

for (const tool of TOOLS) {
    const from = `${OLD_ROOT}/${tool}`;
    const to = `${NEW_ROOT}/${tool}`;
    if (!(await exists(from))) continue;
    if (!(await exists(to))) {
        work.push({
            describe: `move ${from} to ${to}`,
            apply: async () => {
                await mkdir(path.join(ROOT, NEW_ROOT), { recursive: true });
                await rename(path.join(ROOT, from), path.join(ROOT, to));
            },
        });
    } else if (await identical(from, to)) {
        work.push({
            describe: `delete ${from}, already copied to ${to}`,
            apply: () => rm(path.join(ROOT, from), { recursive: true }),
        });
    } else {
        // Two copies that disagree means one was edited, and choosing which
        // edit survives is not this script's call.
        console.error(
            `${ID}: ${from} and ${to} both exist and differ.\n` +
                "  Merge them by hand into the new path, then delete the old folder.\n" +
                "  Nothing was changed."
        );
        process.exit(1);
    }
}

const oldPath = new RegExp(`\\.github/tools/(${TOOLS.join("|")})`, "g");

for (const relPath of OWNED_FILES) {
    if (!(await exists(relPath))) continue;
    const text = await readFile(path.join(ROOT, relPath), "utf8");
    if (!text.match(oldPath)) continue;
    work.push({
        describe: `rewrite ${OLD_ROOT}/ to ${NEW_ROOT}/ in ${relPath}`,
        apply: () =>
            writeFile(path.join(ROOT, relPath), text.replace(oldPath, `${NEW_ROOT}/$1`), "utf8"),
    });
}

if (!work.length) {
    console.log(`${ID}: nothing to do under ${ROOT}.`);
    process.exit(0);
}

if (checkOnly) {
    for (const item of work) console.log(`  would fix ${item.describe}`);
    console.error(`\n${ID}: ${work.length} item(s) still to migrate.`);
    process.exit(1);
}

for (const item of work) {
    await item.apply();
    console.log(`  fixed    ${item.describe}`);
}
console.log(`\n${ID}: applied ${work.length} change(s).`);
