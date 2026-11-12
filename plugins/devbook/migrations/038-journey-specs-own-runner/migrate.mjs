#!/usr/bin/env node
// 038-journey-specs-own-runner — see MIGRATION.md.
//
//   node migrate.mjs --check            verify only; exit 1 while work remains
//   node migrate.mjs                    apply; a second run changes nothing
//   node migrate.mjs --to e2e/support   put the runner there instead of beside the specs
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the state that must not be present is a source file whose
// import resolves to `.devbook/_tools/scenarios/setup`. Once every such import points at the
// repository's own copy of the runner, the migration has nothing to see.

import { existsSync, lstatSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const option = (name) => {
    const at = args.indexOf(name);
    return at !== -1 ? args[at + 1] : undefined;
};
const ROOT = path.resolve(option("--root") ?? process.cwd());
const TO = option("--to");

const ID = "038-journey-specs-own-runner";
const STAMP = ".devbook/config.json";
const TOOLS = ".devbook/_tools/scenarios";
const RUNNER = "scenario-runner";
const PAYLOAD = path.join(path.dirname(fileURLToPath(import.meta.url)), "runner");

// Folders no spec lives in. A nested `.git` marks another checkout or a worktree, skipped too.
const SKIP = new Set([".git", ".devbook", "node_modules", "bin", "obj", "dist", "build", "out", "coverage", "test-results", "playwright-report"]);
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
// A quoted module specifier ending in `.devbook/_tools/scenarios/setup`, with or without an extension.
const SPECIFIER = /(['"])([^'"\n]*\.devbook\/_tools\/scenarios\/setup)(\.[cm]?[jt]s)?\1/g;
// The runner's own relative imports, which stay in `.devbook/_tools/scenarios/`.
const SIBLING = /(['"])\.\/(parse\.mjs|playwright\.mjs|shot(?:\.ts|\.js)?)\1/g;
const BANNER = `// Moved here from ${TOOLS}/ by devbook migration ${ID}.\n// The repository owns this file: devbook no longer ships or updates it.\n`;
const PACKAGE = '{\n  "private": true,\n  "type": "module"\n}\n';

const posix = (p) => p.split(path.sep).join("/");
const lf = (text) => text.replace(/\r\n/g, "\n");
const relative = (fromDir, to) => {
    const rel = posix(path.relative(fromDir, to));
    return rel === ".." || rel.startsWith("../") ? rel : `./${rel}`;
};
const done = (line) => { console.log(`${ID}: ${line}`); process.exit(0); };
const fail = (line) => { console.error(`${ID}: ${line}`); process.exit(2); };

async function sources(dir, out = []) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP.has(entry.name) || existsSync(path.join(abs, ".git"))) continue;
            await sources(abs, out);
        } else if (entry.isFile() && SOURCE.test(entry.name)) {
            out.push(abs);
        }
    }
    return out;
}

/** Whether `index` sits on a `//` or ` * ` comment line, such as the usage example atop the runner. */
function inComment(text, index) {
    const line = text.slice(text.lastIndexOf("\n", index - 1) + 1, index).trimStart();
    return line.startsWith("//") || line.startsWith("*") || line.startsWith("/*");
}

/** An import in `file` that resolves to the runner devbook shipped. */
const isRunnerImport = (file, text, match) =>
    !inComment(text, match.index) && path.resolve(path.dirname(file), match[2]) === runnerPath;

/** The deepest folder holding every file. */
function commonFolder(files) {
    let common = path.dirname(files[0]);
    for (const file of files.slice(1)) {
        while (path.relative(common, file).startsWith("..")) common = path.dirname(common);
    }
    return common;
}

if (!existsSync(path.join(ROOT, STAMP))) done("nothing to do — no stamp.");
const devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
if (!devbook) done("nothing to do — no components.devbook stamp.");
if (!(devbook.adopted ?? []).includes("domain")) done("not-applicable — `domain` is not adopted.");

const runnerPath = path.join(ROOT, TOOLS, "setup");
const importers = [];
for (const file of await sources(ROOT)) {
    const text = await readFile(file, "utf8");
    if ([...text.matchAll(SPECIFIER)].some((m) => isRunnerImport(file, text, m))) importers.push({ file, text });
}
if (!importers.length) done(`nothing to do — no file imports ${TOOLS}/setup.`);

const dest = TO ? path.resolve(ROOT, TO) : path.join(commonFolder(importers.map((i) => i.file)), RUNNER);
if (path.relative(ROOT, dest).startsWith("..")) fail(`--to ${TO} resolves outside the repository.`);

// The names a module exports, and the names a runner file imports from each sibling.
const exportsOf = (text) => new Set([
    ...[...text.matchAll(/\bexport\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([\w$]+)/g)].map((m) => m[1]),
    ...[...text.matchAll(/\bexport\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
]);
const siblingImports = (text) => [...text.matchAll(/\bimport\s*(?:type\s*)?\{([^}]*)\}\s*from\s*(['"])\.\/(parse\.mjs|playwright\.mjs|shot(?:\.ts|\.js)?)\2/g)]
    .map((m) => ({ file: m[3].startsWith("shot") ? "shot.ts" : m[3], names: m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean) }));

// The repository's own copy is what its specs run today, customizations included, so it moves
// when it still loads against the tools this release ships beside it. An older release's runner
// imports names those tools dropped, and once the reconcile has replaced the folder its
// setup.mjs no longer carries runSetup: either way the copy frozen beside this script stands in,
// the runner as devbook last shipped it.
const SHIPPED_TOOLS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "tools", "scenarios");
async function loadsAgainstShipped(dir) {
    for (const name of ["setup.ts", "setup.mjs"]) {
        for (const { file, names } of siblingImports(await readFile(path.join(dir, name), "utf8"))) {
            const exported = exportsOf(await readFile(path.join(SHIPPED_TOOLS, file), "utf8"));
            if (names.some((n) => !exported.has(n))) return false;
        }
    }
    return true;
}
const ownDir = path.join(ROOT, TOOLS);
const ownMjs = path.join(ownDir, "setup.mjs");
const hasOwn = existsSync(path.join(ownDir, "setup.ts")) && existsSync(ownMjs) && /export async function runSetup\(/.test(await readFile(ownMjs, "utf8"));
const own = hasOwn && (await loadsAgainstShipped(ownDir));
const from = own ? ownDir : PAYLOAD;
if (hasOwn && !own) console.log(`- ${TOOLS}/setup.ts is an older release's runner; the one devbook last shipped moves instead`);

const toTools = relative(dest, path.join(ROOT, TOOLS));
const unresolved = [];
const vendor = (name, text) => {
    const body = lf(text).replace(SIBLING, (_, q, file) => `${q}${toTools}/${file}${q}`);
    for (const m of body.matchAll(/\bfrom\s*(['"])(\.\.?\/[^'"\n]*)\1/g)) {
        if (!inComment(body, m.index) && m[2] !== "./setup.mjs" && !m[2].startsWith(toTools)) unresolved.push(`${name} imports ${m[2]}`);
    }
    return BANNER + body;
};
const files = {
    "setup.ts": vendor("setup.ts", await readFile(path.join(from, "setup.ts"), "utf8")),
    "setup.mjs": vendor("setup.mjs", await readFile(path.join(from, "setup.mjs"), "utf8")),
    "package.json": PACKAGE,
};
if (unresolved.length) fail(`the runner at ${posix(path.relative(ROOT, from))} has imports this migration cannot move: ${unresolved.join("; ")}. Move it by hand.`);

const writes = [];
for (const [name, content] of Object.entries(files)) {
    const target = path.join(dest, name);
    if (existsSync(target)) {
        if (lstatSync(target).isFile() && lf(await readFile(target, "utf8")) === content) continue;
        fail(`${posix(path.relative(ROOT, target))} exists and is not the runner; pass --to <folder> to put the runner elsewhere.`);
    }
    writes.push({ target, content });
}

const rewrites = importers.map(({ file, text }) => {
    const spec = relative(path.dirname(file), path.join(dest, "setup"));
    let next = "";
    let last = 0;
    for (const m of text.matchAll(SPECIFIER)) {
        if (!isRunnerImport(file, text, m)) continue;
        next += `${text.slice(last, m.index)}${m[1]}${spec}${m[3] ?? ""}${m[1]}`;
        last = m.index + m[0].length;
    }
    return { file, next: next + text.slice(last) };
});

if (checkOnly) {
    console.log(`- move the scenario runner ${own ? `from ${TOOLS}/` : "devbook last shipped"} to ${posix(path.relative(ROOT, dest))}/`);
    for (const { file } of rewrites) console.log(`- point ${posix(path.relative(ROOT, file))} at it`);
    process.exit(1);
}

await mkdir(dest, { recursive: true });
for (const { target, content } of writes) await writeFile(target, content);
for (const { file, next } of rewrites) await writeFile(file, next);
console.log(`- moved the scenario runner to ${posix(path.relative(ROOT, dest))}/`);
for (const { file } of rewrites) console.log(`- pointed ${posix(path.relative(ROOT, file))} at it`);
console.log(`${ID}: applied; ${TOOLS}/setup.ts is no longer imported, and the reconcile replaces the folder without it.`);
