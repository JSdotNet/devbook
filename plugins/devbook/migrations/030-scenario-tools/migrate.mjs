#!/usr/bin/env node
// 030-scenario-tools — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the state that must not be present, where `domain` is
// adopted, is a `.devbook/_tools/scenarios/` that is missing or hashes to an older
// release. Once the folder hashes to the copy this plugin ships, the migration has
// nothing to see. A copy hashing to no release is the repository's and is never written.

import { createHash } from "node:crypto";
import { cp, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const ID = "030-scenario-tools";
const STAMP = ".devbook/config.json";
const TARGET = ".devbook/_tools/scenarios";
const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "tools", "scenarios");

// Every folder hash a release shipped before this one, per the folder rule in
// assets/reconcile-protocol.md. The copy this plugin ships now is hashed live from SOURCE.
// A copy hashing to none of these, and to no hash the stamp recorded as managed, was
// edited by hand and is left alone.
const SHIPPED = new Set([
    "sha256:9a8deb1f6589db5c3cfee03ad8d25c5ed18ad151141d2b9f8cc88aebeb6d9f81", // 1.21.0, 1.22.0
    "sha256:ac980259318b18bdd8b1c7a54f8b443734ef6bc8232acc48a32261eba0ba5483", // 1.23.0
]);

async function exists(absPath) {
    try { await stat(absPath); return true; } catch { return false; }
}

async function walk(dir, prefix = "") {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...(await walk(path.join(dir, entry.name), rel)));
        else if (entry.isFile()) out.push(rel);
    }
    return out;
}

/** The folder rule: each file in sorted POSIX order, its path, a newline, its LF content, a newline. */
async function folderHash(dir) {
    const files = (await walk(dir)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const hash = createHash("sha256");
    for (const f of files) {
        const content = (await readFile(path.join(dir, ...f.split("/")), "utf8")).replace(/\r\n/g, "\n");
        hash.update(`${f}\n${content}\n`, "utf8");
    }
    return `sha256:${hash.digest("hex")}`;
}

const done = (line) => { console.log(`${ID}: ${line}`); process.exit(0); };

if (!(await exists(path.join(ROOT, STAMP)))) done("nothing to do — no stamp.");
const devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
if (!devbook) done("nothing to do — no components.devbook stamp.");
if (!(devbook.adopted ?? []).includes("domain")) done("not-applicable — `domain` is not adopted.");

const target = path.join(ROOT, TARGET);
const recorded = devbook.materialized?.[TARGET];
const current = await folderHash(SOURCE);

let action;
if (!(await exists(target))) {
    action = "create";
} else if (recorded?.managed === false) {
    done(`${TARGET} is managed: false in the stamp — customized, left alone.`);
} else {
    const onDisk = await folderHash(target);
    if (onDisk === current) done(`${TARGET} is current — nothing to do.`);
    const stale = SHIPPED.has(onDisk) || recorded?.hash === onDisk;
    if (!stale) done(`${TARGET} hashes to no shipped release — customized, left alone; refresh it by hand or mark it managed: false.`);
    action = "update";
}

if (checkOnly) {
    console.log(`- ${action} ${TARGET} from the shipped tools/scenarios/`);
    process.exit(1);
}

// A stale copy holds only shipped files, so it is replaced whole: a file a later release
// dropped goes with it, and the result hashes to exactly what ships.
if (action === "update") await rm(target, { recursive: true, force: true });
await cp(SOURCE, target, { recursive: true });
console.log(`- ${action === "create" ? "created" : "updated"} ${TARGET}`);
console.log(`${ID}: applied; the reconcile's stamp phase records ${TARGET} at ${current}.`);
