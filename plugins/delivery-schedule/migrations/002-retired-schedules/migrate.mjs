#!/usr/bin/env node
// 002-retired-schedules — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           print the plan; writes nothing
//   node migrate.mjs --root ../other-repo
//
// The selection names schedules the catalog no longer ships. delivery-schedule:update drops
// them in step 1, disables their routines in step 6, and writes the stamp in step 7, its only
// writer. Idempotent by content: once neither `enabled` nor `overrides` names a retired
// schedule, there is nothing to do, whatever version is stamped.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STAMP = ".devbook/config.json";

/**
 * The catalog entries this release retires, each with the title its routine carries as
 * `<owner>/<repo> · <title>` — the rows the contract's *Retired Schedules* table adds.
 */
export const RETIRED = {
    "devbook-pull-sweep": "Devbook pull sweep",
    "devbook-push-sweep": "Devbook push sweep",
    "morning-brief": "Morning brief",
};
const NAMES = Object.keys(RETIRED);

/**
 * The selection with every retired name dropped, and the names that were. Pure: the entry
 * passed in is not changed, and a key the entry lacks is not added.
 */
export function retire(entry) {
    const gone = new Set(NAMES);
    const dropped = new Set();
    const next = { ...entry };
    if (Array.isArray(entry?.enabled)) {
        next.enabled = entry.enabled.filter((name) => !(gone.has(name) && dropped.add(name)));
    }
    if (entry?.overrides && typeof entry.overrides === "object") {
        next.overrides = Object.fromEntries(
            Object.entries(entry.overrides).filter(([name]) => !(gone.has(name) && dropped.add(name))),
        );
    }
    return { entry: next, dropped: NAMES.filter((name) => dropped.has(name)) };
}

/** Exit code for `--check`: 1 while the stamp at `root` names a retired schedule. */
export async function main(argv) {
    const checkOnly = argv.includes("--check");
    const rootIndex = argv.indexOf("--root");
    const root = path.resolve(rootIndex !== -1 ? argv[rootIndex + 1] ?? "." : process.cwd());

    let entry = null;
    try {
        entry = JSON.parse(await readFile(path.join(root, STAMP), "utf8"))?.components?.schedule ?? null;
    } catch { /* no stack config: nothing scheduled */ }

    const { dropped } = entry ? retire(entry) : { dropped: [] };
    if (!dropped.length) {
        console.log("002-retired-schedules: nothing to do.");
        return 0;
    }
    console.log("delivery-schedule:update drops these from components.schedule and disables their routines:");
    for (const name of dropped) console.log(`- ${name}: the routine titled "${RETIRED[name]}"`);
    if (checkOnly) return 1;
    console.log("002-retired-schedules: nothing written; run delivery-schedule:update to apply.");
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
