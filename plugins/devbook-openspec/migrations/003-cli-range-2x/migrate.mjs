#!/usr/bin/env node
// 003-cli-range-2x — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the one shape that must not be present is the
// old default range in `components.openspec.cli`. A range a person chose is
// never touched.

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const STAMP = path.join(ROOT, ".devbook/config.json");
const OLD_RANGE = ">=1.13.2 <2.0.0";
const NEW_RANGE = ">=1.13.2 <3.0.0";

let text;
try { await stat(STAMP); text = await readFile(STAMP, "utf8"); } catch { text = null; }
const entry = text ? JSON.parse(text)?.components?.openspec : null;
if (!entry) { console.log("003-cli-range-2x: no components.openspec, nothing to do."); process.exit(0); }
if (entry.cli !== OLD_RANGE) { console.log("003-cli-range-2x: nothing to do."); process.exit(0); }

console.log(`- widen components.openspec.cli from "${OLD_RANGE}" to "${NEW_RANGE}" in .devbook/config.json`);
if (checkOnly) process.exit(1);

// Rewrite the one value inside the openspec entry, leaving every other byte alone.
const at = text.indexOf('"openspec":');
const cli = new RegExp(`("cli"\\s*:\\s*)"${OLD_RANGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
const tail = text.slice(at).replace(cli, `$1"${NEW_RANGE}"`);
await writeFile(STAMP, text.slice(0, at) + tail, "utf8");
console.log("003-cli-range-2x: applied.");
