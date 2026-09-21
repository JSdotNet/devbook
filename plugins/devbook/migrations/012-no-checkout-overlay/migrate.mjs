#!/usr/bin/env node
// 012-no-checkout-overlay — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are the
// devbook block in `.gitignore`, the `.gitignore#devbook` entry in the stamp,
// and a personal file under `.devbook/`. Once none is left the migration has
// nothing to see, which is what makes re-running it safe.

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

const STAMP = ".devbook/config.json";
const BEGIN = "# devbook:begin";
const END = "# devbook:end";

// Every text a release shipped between the markers, LF, as the stamp hashed it.
// A block hashing to none of these was edited by hand and is left alone.
const SHIPPED = new Set([
    "# Machine-scope, never committed. See AGENTS.md.\nAGENTS.local.md\n.devbook/config.local.json\n",
]);

// The personal files that lived in the checkout, and where each goes now.
const PERSONAL = ["config.local.json", "AGENTS.local.md"];

function userConfigDir(env = process.env) {
    if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, "devbook");
    if (process.platform === "win32" && env.APPDATA) return path.join(env.APPDATA, "devbook");
    return path.join(homedir(), ".config", "devbook");
}

async function exists(absPath) {
    try {
        await stat(absPath);
        return true;
    } catch {
        return false;
    }
}

async function readText(absPath) {
    const raw = await readFile(absPath, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    return { text: raw.replace(/\r\n/g, "\n"), eol };
}

async function writeText(absPath, text, eol) {
    await writeFile(absPath, eol === "\n" ? text : text.replace(/\n/g, eol), "utf8");
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** The `.gitignore` block: what to do about it, and the file without it. */
async function planGitignore() {
    const file = path.join(ROOT, ".gitignore");
    if (!(await exists(file))) return null;
    const { text, eol } = await readText(file);
    const lines = text.split("\n");
    const begin = lines.indexOf(BEGIN);
    const end = lines.indexOf(END, begin + 1);
    if (begin === -1 || end === -1) return null;
    const inner = lines.slice(begin + 1, end).join("\n") + "\n";
    if (![...SHIPPED].some((shipped) => sha256(shipped) === sha256(inner))) {
        return { file, customized: true };
    }
    // The block and the one blank line the reconcile put before it.
    const from = begin > 0 && lines[begin - 1] === "" ? begin - 1 : begin;
    const rest = [...lines.slice(0, from), ...lines.slice(end + 1)];
    return { file, customized: false, rest: rest.join("\n"), eol };
}

async function planStamp() {
    const file = path.join(ROOT, STAMP);
    if (!(await exists(file))) return null;
    const { text, eol } = await readText(file);
    const stamp = JSON.parse(text);
    const materialized = stamp?.components?.devbook?.materialized;
    if (!materialized || !(".gitignore#devbook" in materialized)) return null;
    return { file, stamp, eol };
}

async function planPersonal() {
    const moves = [];
    const stampFile = path.join(ROOT, STAMP);
    let id = null;
    if (await exists(stampFile)) {
        const { text } = await readText(stampFile);
        const parsed = JSON.parse(text);
        if (typeof parsed.id === "string") id = parsed.id;
    }
    for (const name of PERSONAL) {
        const from = path.join(ROOT, ".devbook", name);
        if (!(await exists(from))) continue;
        if (!id) {
            moves.push({ from, blocked: "the committed config carries no `id`, so there is no `repos/<id>/` to move it to" });
            continue;
        }
        const to = path.join(userConfigDir(), "repos", id, name);
        if (await exists(to)) {
            moves.push({ from, to, blocked: "a file is already there; merge them by hand and delete this one" });
            continue;
        }
        moves.push({ from, to });
    }
    return moves;
}

const report = (line) => console.log(line);
let remaining = 0;

const gitignore = await planGitignore();
if (gitignore?.customized) {
    report(`${gitignore.file}: devbook block does not match any shipped text — customized, left alone; remove it yourself`);
} else if (gitignore) {
    remaining++;
    if (checkOnly) report(`${gitignore.file}: devbook block would be removed`);
    else {
        if (gitignore.rest.trim() === "") await rm(gitignore.file);
        else await writeText(gitignore.file, gitignore.rest, gitignore.eol);
        report(`${gitignore.file}: devbook block removed`);
    }
}

const stamp = await planStamp();
if (stamp) {
    remaining++;
    if (checkOnly) report(`${stamp.file}: materialized[".gitignore#devbook"] would be dropped`);
    else {
        delete stamp.stamp.components.devbook.materialized[".gitignore#devbook"];
        await writeText(stamp.file, JSON.stringify(stamp.stamp, null, 2) + "\n", stamp.eol);
        report(`${stamp.file}: materialized[".gitignore#devbook"] dropped`);
    }
}

for (const move of await planPersonal()) {
    remaining++;
    if (move.blocked) {
        report(`${move.from}: not moved — ${move.blocked}${move.to ? ` (${move.to})` : ""}`);
    } else if (checkOnly) {
        report(`${move.from}: would move to ${move.to}`);
    } else {
        await mkdir(path.dirname(move.to), { recursive: true });
        await rename(move.from, move.to);
        report(`${move.from}: moved to ${move.to}`);
    }
}

if (remaining === 0) report("012-no-checkout-overlay: nothing to do");
process.exit(checkOnly && remaining > 0 ? 1 : 0);
