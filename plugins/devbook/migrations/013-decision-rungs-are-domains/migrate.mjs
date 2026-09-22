#!/usr/bin/env node
// 013-decision-rungs-are-domains — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shape that must not be present is a `meta`
// block outside `.devbook/domain/` holding `status: approved`, `status:
// accepted`, or any of the six record fields. Once none is left there is
// nothing to see, which is what makes re-running it safe.
//
// Dependency-free ESM against node built-ins, like every other migration here.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

// The folders that lose the rungs. `domain/` keeps them and is never visited.
const FOLDERS = ["arc42", "tech", "design", "ai"];

// Where `active` is written by omitting the field, so deleting the status line
// lands the chapter back at rest.
const RESTING = new Set(["arc42", "design"]);

const RUNGS = new Set(["approved", "accepted"]);
const FIELDS = [
    "approved-by",
    "approved-at",
    "approved-hash",
    "accepted-by",
    "accepted-at",
    "accepted-hash",
];

let remaining = 0;
let needRating = 0;
const report = (line) => console.log(line);

async function* markdownFiles(dir) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "_meta") continue;
            yield* markdownFiles(full);
        } else if (entry.name.toLowerCase().endsWith(".md")) {
            yield full;
        }
    }
}

/**
 * Rewrite one file's `meta` fences, returning the new text and what was found.
 *
 * Only lines inside a ```meta fence are considered, so prose that happens to
 * say "status: approved" — a rule file, a migration note — is left alone.
 */
function rewrite(text, folder) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const out = [];
    const found = { rung: 0, fields: 0, ratingNeeded: 0 };

    let inMeta = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!inMeta) {
            if (/^```meta\s*$/.test(trimmed)) inMeta = true;
            out.push(line);
            continue;
        }
        if (trimmed === "```") {
            inMeta = false;
            out.push(line);
            continue;
        }

        const match = /^(\s*)([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (!match) {
            out.push(line);
            continue;
        }
        const key = match[2];
        const value = match[3].trim();

        if (key === "status" && RUNGS.has(value)) {
            found.rung++;
            if (RESTING.has(folder)) continue; // deleting it means `active`
            // A rating that cannot be recovered: keep the line so the file
            // still parses, and report it for a person to set.
            found.ratingNeeded++;
            out.push(line);
            continue;
        }
        if (FIELDS.includes(key)) {
            found.fields++;
            continue;
        }
        out.push(line);
    }

    return { text: out.join(eol), found };
}

for (const folder of FOLDERS) {
    const base = path.join(ROOT, ".devbook", folder);
    try {
        await stat(base);
    } catch {
        continue;
    }

    for await (const file of markdownFiles(base)) {
        const original = await readFile(file, "utf8");
        const { text, found } = rewrite(original, folder);
        if (found.rung === 0 && found.fields === 0) continue;

        const rel = path.relative(ROOT, file).split(path.sep).join("/");
        remaining++;
        const what = [
            found.rung ? `${found.rung} decision rung${found.rung === 1 ? "" : "s"}` : null,
            found.fields ? `${found.fields} record field${found.fields === 1 ? "" : "s"}` : null,
        ].filter(Boolean).join(" and ");

        if (checkOnly) {
            report(`${rel}: would take off ${what}`);
        } else {
            await writeFile(file, text, "utf8");
            report(`${rel}: took off ${what}`);
        }

        if (found.ratingNeeded) {
            needRating += found.ratingNeeded;
            report(
                `${rel}: ${found.ratingNeeded} block${found.ratingNeeded === 1 ? " still states" : "s still state"} ` +
                `a decision rung as \`status\`. ${folder}/ has no resting value and the rating the ` +
                `chapter had before it was approved is not in the file, so no script can restore it — ` +
                `set each one to a rating on ${folder}/'s own ladder.`,
            );
        }
    }
}

if (remaining === 0) report("013-decision-rungs-are-domains: nothing to do");
else if (needRating && !checkOnly) {
    report(`013-decision-rungs-are-domains: ${needRating} block(s) still need a rating set by hand.`);
}

// `--check` fails while anything remains. After an apply, the rungs that need a
// human rating are still present, so a following `--check` still exits 1 —
// which is the point: the migration is not done until a person rates them.
process.exit(checkOnly && remaining > 0 ? 1 : 0);
