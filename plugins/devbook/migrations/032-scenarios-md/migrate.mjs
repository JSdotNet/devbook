#!/usr/bin/env node
// 032-scenarios-md — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo [--scenario-folder <dir>]
//
// Idempotent by construction: the shape that must not be present is a page
// under `.devbook/domain/<context>/` typed `scenario` on its `#` block. Each one
// is folded into its context's `scenarios.md` as one `##` journey and removed,
// and every reference to it — `Proved by:`, `related` and the other reference
// fields, prose links, `scenario:` images, a demo walkthrough's `part`, its run
// folder, its spec header — moves with it in the same run. Once no such page
// is left, nothing resolves to one and the migration has nothing to see.
//
// A page it cannot fold — one directly under `domain/` with no context, or one
// whose journey, part, or label anchor the context's `scenarios.md` already
// holds — is listed `not-applicable` with its reason on every run and never
// counts as work, so `--check` exits 0 once only those are left.
//
// The old pages are read through `legacy-page.mjs` beside this file: the page
// parser of contracts 30 and 31, frozen.

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { changePathParts } from "../../tools/devbook-meta/metadata.mjs";
import { parseScenarioPage, stemOf } from "./legacy-page.mjs";
import { slugify } from "../../tools/scenarios/parse.mjs";

const ID = "032-scenarios-md";
const STAMP = ".devbook/config.json";
const DOMAIN = ".devbook/domain";
const CHANGES = "openspec/changes";
const SCENARIO_FOLDER = ".devbook/scenarios";
const SPEC_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
const SKIP_DIRS = new Set(["node_modules", "bin", "obj", "dist", "build", "out", "coverage", "test-results", "playwright-report", "_meta", "_tools"]);
const SETUP_REFERENCES = ["actor", "flags", "settings"];
const FILE_HEADER = "# Scenarios\n\n```meta\ntype: scenarios\n```\n\nThe end-to-end journeys of this bounded context, one per `##`.\n";

// ── Files ───────────────────────────────────────────────────────────────────

async function exists(root, rel) {
    try {
        await stat(path.join(root, rel));
        return true;
    } catch {
        return false;
    }
}

/** Read as LF, remembering the line ending, so a CRLF checkout is migrated without a whole-file diff. */
async function readText(root, rel) {
    const raw = await readFile(path.join(root, rel), "utf8");
    return { text: raw.replace(/\r\n/g, "\n"), eol: raw.includes("\r\n") ? "\r\n" : "\n" };
}

async function writeText(root, rel, text, eol = "\n") {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), eol === "\n" ? text : text.replace(/\n/g, eol), "utf8");
}

/** Every file under `rel` whose name matches, as sorted POSIX paths; dot-folders and build output are skipped. */
async function filesUnder(root, rel, pattern) {
    const out = [];
    let entries;
    try {
        entries = await readdir(path.join(root, rel), { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        const child = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
            out.push(...(await filesUnder(root, child, pattern)));
        } else if (entry.isFile() && pattern.test(entry.name)) {
            out.push(child);
        }
    }
    return out.sort();
}

/** Every Markdown file a reference may sit in: the devbook folders and the open changes. */
async function referencingFiles(root) {
    const devbook = [];
    for (const entry of await readdir(path.join(root, ".devbook"), { withFileTypes: true }).catch(() => [])) {
        if (entry.isDirectory() && !entry.name.startsWith("_")) devbook.push(...(await filesUnder(root, `.devbook/${entry.name}`, /\.md$/i)));
    }
    return [...devbook, ...(await filesUnder(root, CHANGES, /\.md$/i))];
}

// ── The page, as a journey ──────────────────────────────────────────────────

/** Shift every heading outside a fence one level down: a page's `##` parts become a journey's `###`. */
function deepen(markdown) {
    let fence = null;
    return markdown
        .split("\n")
        .map((line) => {
            const marker = /^\s*(`{3,}|~{3,})/.exec(line);
            if (fence) {
                if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
                return line;
            }
            if (marker) {
                fence = marker[1];
                return line;
            }
            return /^#{1,5}\s/.test(line) ? `#${line}` : line;
        })
        .join("\n");
}

/**
 * A reference written from `fromDir`, rewritten to be read from `toDir`. Only
 * one whose file exists from `fromDir` moves: a setup field fell back to the
 * bounded context, so one that resolved there already reads the same from it.
 * A repository path stays as it is.
 */
function rebase(ref, fromDir, toDir, resolves) {
    if (ref.startsWith(".devbook/") || !/\.md(?:#|$)/.test(ref)) return ref;
    const target = path.posix.normalize(path.posix.join(fromDir, ref));
    if (!resolves(target.split("#")[0])) return ref;
    return path.posix.relative(toDir, target) || ref;
}

/** One setup or reference entry, rebased, keeping a portal prefix, a leading `-`, or a trailing `=<value>`. */
function rebaseEntry(entry, field, fromDir, toDir, resolves) {
    let prefix = "";
    let rest = entry;
    let suffix = "";
    if (field === "actor") {
        const portal = /^([a-z0-9][a-z0-9-]*):(.+)$/.exec(rest);
        if (portal && !portal[2].startsWith("/")) [prefix, rest] = [`${portal[1]}:`, portal[2]];
    }
    if (field === "flags" && rest.startsWith("-")) [prefix, rest] = ["-", rest.slice(1)];
    if (field === "settings" && rest.includes("=")) [rest, suffix] = [rest.slice(0, rest.indexOf("=")), rest.slice(rest.indexOf("="))];
    return `${prefix}${rebase(rest, fromDir, toDir, resolves)}${suffix}`;
}

/**
 * A page's text as one journey of its context's scenarios file: `# Title`
 * becomes `## Title`, its block follows with `type: scenario` kept and every
 * relative reference rebased from the page's folder to the context's, and every
 * heading below moves one level down. `resolves(relPath)` says whether a file
 * exists.
 */
export function journeyOf(markdown, pageDir, contextDir, resolves = () => false) {
    const lines = markdown.replace(/^﻿/, "").split("\n");
    const titleAt = lines.findIndex((line) => /^#\s/.test(line));
    let at = titleAt + 1;
    while (at < lines.length && lines[at].trim() === "") at++;
    const blockStart = at;
    let blockEnd = at;
    if (/^```meta\s*$/.test(lines[at]?.trim() ?? "")) {
        blockEnd = at + 1;
        while (blockEnd < lines.length && lines[blockEnd].trim() !== "```") blockEnd++;
    }
    const block = lines.slice(blockStart + 1, blockEnd).map((line) => {
        const field = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
        if (!field || !["related", "depends-on", ...SETUP_REFERENCES].includes(field[1]) || pageDir === contextDir) return line;
        const value = field[2].trim();
        const list = value.startsWith("[") && value.endsWith("]");
        const entries = (list ? value.slice(1, -1).split(",") : [value]).map((entry) => entry.trim()).filter(Boolean);
        const rebased = entries.map((entry) => rebaseEntry(entry, field[1], pageDir, contextDir, resolves));
        return `${field[1]}: ${list ? `[${rebased.join(", ")}]` : rebased[0]}`;
    });
    const rest = lines.slice(blockEnd + 1).join("\n");
    return `#${lines[titleAt]}\n\n\`\`\`meta\n${block.join("\n")}\n\`\`\`\n${deepen(rest)}`;
}

/** Every `##` and `###` anchor, and every `shot:` label, a scenarios file already holds. */
function anchorsOf(markdown) {
    const anchors = new Set();
    const labels = new Set();
    let fence = null;
    for (const line of markdown.split("\n")) {
        const marker = /^\s*(`{3,}|~{3,})/.exec(line);
        if (fence) {
            if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
            continue;
        }
        if (marker) {
            fence = marker[1];
            continue;
        }
        const heading = /^#{2,3}\s+(.*)$/.exec(line);
        if (heading) anchors.add(slugify(heading[1]));
        for (const shot of line.matchAll(/\]\(\s*<?shot:([^)\s>]*)/g)) labels.add(shot[1]);
    }
    return { anchors, labels };
}

// ── The plan ────────────────────────────────────────────────────────────────

/**
 * Every page of the old shape, with where it lands: `{ path, stem, context,
 * file, slug, parts, title, journey }`, or `{ path, reason }` for one that is
 * not applicable. `scenariosText` maps each target file to its text after every
 * applicable page is appended.
 */
async function plan(root) {
    const moves = [];
    const skipped = [];
    const scenariosText = new Map();
    const taken = new Map();
    for (const rel of await filesUnder(root, DOMAIN, /\.md$/i)) {
        const { text } = await readText(root, rel);
        if (!/^type:\s*scenario\s*$/m.test(text)) continue;
        const page = parseScenarioPage(text, rel);
        if (!page.isScenario) continue;
        const segments = rel.split("/");
        if (segments.length < 4) {
            skipped.push({ path: rel, reason: "it sits directly under `.devbook/domain/`, in no bounded context; move it into the context whose requirements it proves and run this again" });
            continue;
        }
        const contextDir = segments.slice(0, 3).join("/");
        const file = `${contextDir}/scenarios.md`;
        if (!scenariosText.has(file)) {
            const current = (await exists(root, file)) ? (await readText(root, file)).text : null;
            scenariosText.set(file, current);
            taken.set(file, anchorsOf(current ?? ""));
        }
        const slug = slugify(page.title ?? stemOf(rel));
        const own = taken.get(file);
        const clashes = [slug, ...page.parts.map((part) => part.anchor)].filter((anchor) => own.anchors.has(anchor));
        const labelClashes = page.shots.map((shot) => shot.label).filter((label) => own.labels.has(label));
        if (clashes.length || labelClashes.length) {
            const what = [...clashes.map((anchor) => `anchor "#${anchor}"`), ...labelClashes.map((label) => `label "${label}"`)].join(", ");
            skipped.push({ path: rel, reason: `${file} already holds its ${what}; retitle the heading or rename the label on one side and run this again` });
            continue;
        }
        own.anchors.add(slug);
        for (const part of page.parts) own.anchors.add(part.anchor);
        for (const shot of page.shots) own.labels.add(shot.label);
        const journey = journeyOf(text, path.posix.dirname(rel), contextDir, (target) => existsSync(path.join(root, target)));
        const before = scenariosText.get(file);
        scenariosText.set(file, `${(before ?? FILE_HEADER).replace(/\n*$/, "\n")}\n${journey.replace(/\n*$/, "\n")}`);
        moves.push({ path: rel, stem: stemOf(rel), context: segments[2], file, slug, parts: new Set(page.parts.map((part) => part.anchor)) });
    }
    return { moves, skipped, scenariosText };
}

/** The move an old page reference names: a repository path, a path from `fromDir`, or a bare `<stem>.md`. */
function moveFor(ref, fromDir, byPath, byStem) {
    if (ref.startsWith(".devbook/")) return byPath.get(ref);
    if (ref.includes("/")) return byPath.get(path.posix.normalize(path.posix.join(fromDir, ref)));
    return byStem.get(ref.replace(/\.md$/i, ""));
}

/** A new reference to `move`, written the way the old one was: a repository path stays one. */
function newRef(ref, fromDir, move, anchor) {
    const file = ref.startsWith(".devbook/") ? move.file : path.posix.relative(fromDir, move.file);
    return `${file}#${anchor && move.parts.has(anchor) ? anchor : move.slug}`;
}

/**
 * One Markdown file with every reference to a moved page rewritten:
 * `Proved by:` lines, reference entries in `meta` blocks, prose links, and
 * `scenario:` images. Returns the new text.
 */
export function rewriteReferences(relPath, markdown, byPath, byStem) {
    const fromDir = path.posix.dirname(changePathParts(relPath)?.target ?? relPath);
    const swapRef = (whole, ref, anchor) => {
        const move = moveFor(ref, fromDir, byPath, byStem);
        return move ? whole.replace(`${ref}${anchor ? `#${anchor}` : ""}`, newRef(ref, fromDir, move, anchor)) : whole;
    };
    let inMeta = false;
    let fence = null;
    return markdown
        .split("\n")
        .map((line) => {
            const marker = /^\s*(`{3,}|~{3,})(\w*)/.exec(line);
            if (fence) {
                if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
                    fence = null;
                    inMeta = false;
                    return line;
                }
                if (!inMeta) return line;
                return line.replace(/([^\s,[\]]+\.md)(?:#([^\s,\]]+))?/g, (whole, ref, anchor) => swapRef(whole, ref, anchor));
            }
            if (marker) {
                fence = marker[1];
                inMeta = marker[2] === "meta";
                return line;
            }
            const proved = /^(\s*Proved by:\s*)(\S+?\.md)#(\S+)\s*$/.exec(line);
            if (proved) {
                const move = moveFor(proved[2], fromDir, byPath, byStem);
                return move ? `${proved[1]}${newRef(proved[2], fromDir, move, proved[3])}` : line;
            }
            return line
                .replace(/(\]\(\s*<?)scenario:([^)\s#>]+)#([^)\s>]+)/g, (whole, open, stem, label) => {
                    const move = byStem.get(stem);
                    return move ? `${open}scenario:${move.file.slice(DOMAIN.length + 1)}#${label}` : whole;
                })
                .replace(/(\]\(\s*<?)(?!scenario:|shot:|https?:)([^)\s#>]+\.md)(?:#([^)\s>]+))?/g, (whole, open, ref, anchor) => {
                    // A prose link is a path, never a stem.
                    const move = byPath.get(ref.startsWith(".devbook/") ? ref : path.posix.normalize(path.posix.join(fromDir, ref)));
                    return move ? `${open}${newRef(ref, fromDir, move, anchor)}` : whole;
                });
        })
        .join("\n");
}

/** A demo's `"part"` values that name a moved page, rewritten from the demo's landing folder. */
export function rewriteDemo(relPath, html, byPath, byStem) {
    const fromDir = path.posix.dirname(changePathParts(relPath)?.target ?? relPath);
    return html.replace(/("part"\s*:\s*")([^"#]+\.md)#([^"]+)(")/g, (whole, open, ref, anchor, close) => {
        const move = moveFor(ref, fromDir, byPath, byStem);
        return move ? `${open}${newRef(ref, fromDir, move, anchor)}${close}` : whole;
    });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(argv) {
    const checkOnly = argv.includes("--check");
    const option = (name, fallback) => (argv.indexOf(name) !== -1 ? argv[argv.indexOf(name) + 1] : fallback);
    const ROOT = path.resolve(option("--root", process.cwd()));
    const scenarioFolder = option("--scenario-folder", SCENARIO_FOLDER);
    const done = (line) => {
        console.log(`${ID}: ${line}`);
        process.exit(0);
    };

    if (!(await exists(ROOT, STAMP))) done("nothing to do — no stamp.");
    const devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
    if (!devbook) done("nothing to do — no components.devbook stamp.");
    if (!(devbook.adopted ?? []).includes("domain")) done("not-applicable — `domain` is not adopted.");

    const { moves, skipped, scenariosText } = await plan(ROOT);
    for (const { path: rel, reason } of skipped) console.log(`- not-applicable ${rel}: left as it is — ${reason}.`);
    for (const move of moves) console.log(`- ${checkOnly ? "fold" : "folded"} ${move.path} into ${move.file}#${move.slug}`);
    if (!moves.length) done("nothing to do — no journey page left to fold.");
    if (checkOnly) process.exit(1);

    const byPath = new Map(moves.map((move) => [move.path, move]));
    const byStem = new Map(moves.map((move) => [move.stem, move]));

    // The scenarios files, then every reference, before any page is removed.
    for (const [file, text] of scenariosText) {
        if (text === null) continue;
        const eol = (await exists(ROOT, file)) ? (await readText(ROOT, file)).eol : "\n";
        await writeText(ROOT, file, text, eol);
    }
    for (const rel of await referencingFiles(ROOT)) {
        if (byPath.has(rel)) continue;
        const { text, eol } = await readText(ROOT, rel);
        const rewritten = rewriteReferences(rel, text, byPath, byStem);
        if (rewritten !== text) await writeText(ROOT, rel, rewritten, eol);
    }
    for (const rel of [...(await filesUnder(ROOT, DOMAIN, /\.demo\.html$/i)), ...(await filesUnder(ROOT, CHANGES, /\.demo\.html$/i))]) {
        const { text, eol } = await readText(ROOT, rel);
        const rewritten = rewriteDemo(rel, text, byPath, byStem);
        if (rewritten !== text) await writeText(ROOT, rel, rewritten, eol);
    }

    // Each run folder beside its journey's file, as run.json version 3.
    for (const move of moves) {
        const from = `${scenarioFolder}/${move.stem}`;
        if (!(await exists(ROOT, from))) continue;
        const to = `${move.file.replace(/\.md$/, "")}/${move.slug}`;
        await mkdir(path.dirname(path.join(ROOT, to)), { recursive: true });
        await rm(path.join(ROOT, to), { recursive: true, force: true });
        await rename(path.join(ROOT, from), path.join(ROOT, to));
        if (await exists(ROOT, `${to}/run.json`)) {
            const { text, eol } = await readText(ROOT, `${to}/run.json`);
            const run = JSON.parse(text);
            const { version: _version, page: _page, ...rest } = run;
            await writeText(ROOT, `${to}/run.json`, `${JSON.stringify({ version: 3, journey: `${move.file}#${move.slug}`, ...rest }, null, 2)}\n`, eol);
        }
    }

    // Each spec header names the journey's address; its signature is unchanged.
    for (const rel of await filesUnder(ROOT, "", SPEC_FILE)) {
        const { text, eol } = await readText(ROOT, rel);
        const head = text.split("\n").slice(0, 10).join("\n");
        const header = /^(\s*\/\/\s*scenario:\s*)(\S+)\s*$/m.exec(head);
        const move = header && byPath.get(header[2].replace(/^(?:\.\/)+/, ""));
        if (!move) continue;
        await writeText(ROOT, rel, text.replace(header[0], `${header[1]}${move.file}#${move.slug}`), eol);
    }

    for (const move of moves) await rm(path.join(ROOT, move.path));
    done(`applied; folded ${moves.length} page(s) into scenarios.md.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
