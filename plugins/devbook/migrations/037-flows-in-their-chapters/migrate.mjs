#!/usr/bin/env node
// 037-flows-in-their-chapters — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while a flow page is left
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --place <flow file>[#<section>]=<chapter | file | drop> ...
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shape that must not be present is a page
// under `.devbook/domain/<context>/` typed `flow` on its `#` block. Each of its
// sections — every `##`, and the content between the title and the first `##`
// — is a unit, and each unit moves into the chapter of what it draws, directly
// under that chapter's `meta` block, ahead of its prose. A page is removed once
// every unit has moved, and every reference to it — `related` and the other
// reference fields, prose links — moves with the units in the same run.
//
// Where a unit goes is read from the page when the page says it: `--place`
// first, then a split page's `related` or name naming one chapter, then a
// chapter headed exactly as the unit, then — for a state diagram — the one
// aggregate or entity its heading names. Every other unit is printed as an
// `ask` line with its candidates and the `--place` flag that answers it: the
// session running the migration puts the question to the person and runs
// again with the answer. Units without one stay on their page, so the page,
// and the exit code `1`, stay until every question is answered.

import { existsSync } from "node:fs";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { changePathParts, slugify } from "../../tools/devbook-meta/metadata.mjs";

const ID = "037-flows-in-their-chapters";
const STAMP = ".devbook/config.json";
const DOMAIN = ".devbook/domain";
const CHANGES = "openspec/changes";
const RUNTIME_VIEW = ".devbook/arc42/06-runtime-view.md";
const SKIP_DIRS = new Set(["node_modules", "bin", "obj", "dist", "build", "out", "coverage", "_meta", "_tools"]);
// The chapter kinds a diagram can open: what moves, and what runs a process.
const PLACEABLE = new Set(["aggregate", "entity", "value-object", "enum", "domain-service", "feature", "sub-feature"]);
const STATE_KINDS = new Set(["aggregate", "entity", "value-object", "enum"]);
const REFERENCE_FIELDS = new Set(["related", "depends-on"]);
const FENCE = /^\s*(`{3,}|~{3,})(\w*)/;

// ── Files ───────────────────────────────────────────────────────────────────

async function exists(root, rel) {
    try {
        await stat(path.join(root, rel));
        return true;
    } catch {
        return false;
    }
}

/** Every file under `rel` whose name matches, as sorted POSIX paths; build output is skipped. */
async function filesUnder(root, rel, pattern) {
    const out = [];
    let entries;
    try {
        entries = await readdir(path.join(root, rel), { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) out.push(...(await filesUnder(root, child, pattern)));
        } else if (entry.isFile() && pattern.test(entry.name)) out.push(child);
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

/** Texts read as LF and written back with the line ending they had, so a CRLF checkout gets no whole-file diff. */
class Texts {
    constructor(root) {
        this.root = root;
        this.files = new Map();
    }
    async get(rel) {
        if (!this.files.has(rel)) {
            const raw = await readFile(path.join(this.root, rel), "utf8");
            this.files.set(rel, { text: raw.replace(/\r\n/g, "\n"), eol: raw.includes("\r\n") ? "\r\n" : "\n", original: raw.replace(/\r\n/g, "\n") });
        }
        return this.files.get(rel).text;
    }
    set(rel, text) {
        this.files.get(rel).text = text;
    }
    async flush() {
        for (const [rel, { text, eol, original }] of this.files) {
            if (text === original) continue;
            await writeFile(path.join(this.root, rel), eol === "\n" ? text : text.replace(/\n/g, eol), "utf8");
        }
    }
}

// ── Reading a page ──────────────────────────────────────────────────────────

/** Each line with whether it sits inside a fence, and the fence's info word when it opens one. */
function scan(lines) {
    let fence = null;
    return lines.map((line) => {
        const marker = FENCE.exec(line);
        if (fence) {
            if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2]) fence = null;
            return { line, inFence: true };
        }
        if (marker) {
            fence = marker[1];
            return { line, inFence: true, opens: marker[2] || "" };
        }
        return { line, inFence: false };
    });
}

/** The value of one field in a `meta` fence's lines, as a list. */
function listField(blockLines, field) {
    const line = blockLines.find((l) => l.startsWith(`${field}:`));
    if (!line) return [];
    const value = line.slice(field.length + 1).trim();
    return (value.startsWith("[") ? value.slice(1, -1).split(",") : [value]).map((v) => v.trim()).filter(Boolean);
}

/**
 * A flow page as its units: `{ title, type, related, head, summary, units }`,
 * `head` being the title, block, and summary a partly moved page keeps; each unit
 * `{ heading, anchor, body, kind }` where `kind` is the first diagram's type.
 * The lead blockquote is the page's summary and moves nowhere.
 */
export function readFlowPage(markdown) {
    const lines = markdown.replace(/^﻿/, "").split("\n");
    const scanned = scan(lines);
    const titleAt = lines.findIndex((l, i) => !scanned[i].inFence && /^#\s/.test(l));
    const title = titleAt === -1 ? "" : lines[titleAt].replace(/^#\s+/, "").trim();
    let at = titleAt + 1;
    while (at < lines.length && lines[at].trim() === "") at++;
    let related = [];
    let type = null;
    if (scanned[at]?.opens === "meta") {
        const start = at + 1;
        let end = start;
        while (end < lines.length && lines[end].trim() !== "```") end++;
        related = listField(lines.slice(start, end), "related");
        type = listField(lines.slice(start, end), "type")[0] ?? null;
        at = end + 1;
    }
    while (at < lines.length && lines[at].trim() === "") at++;
    const summary = [];
    while (at < lines.length && /^\s*>/.test(lines[at])) summary.push(lines[at++].replace(/^\s*>\s?/, ""));
    const head = lines.slice(0, at).join("\n").trimEnd();

    const units = [];
    let current = { heading: title, anchor: slugify(title), lines: [], lead: true };
    for (let i = at; i < lines.length; i++) {
        if (!scanned[i].inFence && /^##\s/.test(lines[i])) {
            units.push(current);
            const heading = lines[i].replace(/^##\s+/, "").trim();
            current = { heading, anchor: slugify(heading), lines: [] };
            continue;
        }
        current.lines.push(lines[i]);
    }
    units.push(current);
    return {
        title,
        type,
        related,
        head,
        summary: summary.join(" ").trim(),
        units: units
            .map(({ heading, anchor, lines: body, lead }) => {
                const text = body.join("\n").trim();
                const kind = /```mermaid\s*\n\s*(?:%%[^\n]*\n\s*)*(\S+)/.exec(text)?.[1] ?? null;
                return { heading, anchor, body: text, kind, lead: Boolean(lead) };
            })
            .filter((unit) => unit.body !== ""),
    };
}

/** Whether a page's summary is the `flow.md` template's, which says nothing a chapter needs. */
function isBoilerplate(summary) {
    return /^Lifecycle and process flows for this bounded context/i.test(summary) || /Complementary to `model\.md`/i.test(summary);
}

/** A unit's body as it reads inside a chapter: a heading below it becomes a bold line, since a chapter's sub-headings are chapters. */
function flatten(body) {
    const scanned = scan(body.split("\n"));
    return scanned.map(({ line, inFence }) => (!inFence && /^#{3,6}\s/.test(line) ? `**${line.replace(/^#{3,6}\s+/, "").trim()}**` : line)).join("\n");
}

/** Every heading of a context's chapter files followed by a `meta` block with a type: `{ file, anchor, name, type }`. */
async function chaptersOf(texts, files) {
    const chapters = [];
    for (const file of files) {
        const lines = (await texts.get(file)).split("\n");
        const scanned = scan(lines);
        for (let i = 0; i < lines.length; i++) {
            const heading = !scanned[i].inFence && /^#{2,4}\s+(.*)$/.exec(lines[i]);
            if (!heading) continue;
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === "") j++;
            if (scanned[j]?.opens !== "meta") continue;
            const block = [];
            for (let k = j + 1; k < lines.length && lines[k].trim() !== "```"; k++) block.push(lines[k]);
            const type = listField(block, "type")[0] ?? null;
            const name = heading[1].trim();
            chapters.push({ file, anchor: slugify(name), name, type });
        }
    }
    return chapters;
}

// ── Where a unit goes ───────────────────────────────────────────────────────

/** A reference written from `fromDir`, as a repository path, with its anchor. */
function resolveRef(ref, fromDir) {
    const [file, anchor = null] = ref.split("#");
    return { file: file.startsWith(".devbook/") ? file : path.posix.normalize(path.posix.join(fromDir, file)), anchor };
}

const address = ({ file, anchor }) => (anchor ? `${file}#${anchor}` : file);

/** The one placeable chapter whose name the heading carries as a whole phrase, the longest winning; null on a tie. */
function namedIn(heading, chapters) {
    const text = heading.toLowerCase();
    const hits = chapters.filter((c) => new RegExp(`(^|[^\\p{L}\\p{N}])${c.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "u").test(text));
    if (!hits.length) return null;
    const longest = Math.max(...hits.map((c) => c.name.length));
    const top = hits.filter((c) => c.name.length === longest);
    return top.length === 1 ? top[0] : null;
}

/**
 * Every flow page with each unit's destination: `{ path, context, page, units }`,
 * each unit carrying `target` (`{ file, anchor }`, `"drop"`, or null) and, when
 * null, `candidates`. `places` maps `<page>#<anchor>` or `<page>` to an answer.
 */
async function plan(root, texts, places) {
    const pages = [];
    const skipped = [];
    for (const rel of await filesUnder(root, DOMAIN, /\.md$/i)) {
        const text = await texts.get(rel);
        if (!/^type:\s*flow\s*$/m.test(text)) continue;
        const segments = rel.split("/");
        const page = readFlowPage(text);
        if (segments.length !== 4 || page.type !== "flow") continue;
        const contextDir = segments.slice(0, 3).join("/");
        const own = (await filesUnder(root, contextDir, /\.md$/i)).filter((f) => f.split("/").length === 4);
        const chapterFiles = own.filter((f) => /^(domain|features|skills)(\.[^/]+)?\.md$/i.test(path.posix.basename(f)) && !/\.invariants\.md$/i.test(f));
        const chapters = (await chaptersOf(texts, chapterFiles)).filter((c) => PLACEABLE.has(c.type));
        const byAddress = new Map(chapters.map((c) => [address(c), c]));

        // A split page says what it belongs to through `related`, or through its name.
        let pageTarget = null;
        const split = /^flow\.(.+)\.md$/i.exec(segments[3])?.[1] ?? null;
        if (split) {
            const named = page.related.map((r) => byAddress.get(address(resolveRef(r, contextDir)))).filter(Boolean);
            if (named.length === 1) pageTarget = named[0];
            else if (!named.length) {
                const same = chapters.filter((c) => c.anchor === slugify(split.replace(/-/g, " ")) || c.anchor === split);
                if (same.length === 1) pageTarget = same[0];
            }
        }

        const units = page.units.map((unit) => {
            const answer = places.get(`${rel}#${unit.anchor}`) ?? places.get(rel);
            if (answer) return { ...unit, target: answer, by: "--place" };
            if (pageTarget) return { ...unit, target: pageTarget, by: "the page's own chapter" };
            const exact = chapters.filter((c) => c.anchor === unit.anchor);
            if (exact.length === 1) return { ...unit, target: exact[0], by: "the chapter of the same name" };
            if (unit.kind === "stateDiagram-v2" || unit.kind === "stateDiagram") {
                const named = namedIn(unit.heading, chapters.filter((c) => STATE_KINDS.has(c.type)));
                if (named) return { ...unit, target: named, by: `the ${named.type} its heading names` };
            }
            const candidates = new Set();
            for (const r of page.related) {
                const c = byAddress.get(address(resolveRef(r, contextDir)));
                if (c) candidates.add(address(c));
            }
            for (const c of chapters) if (unit.heading.toLowerCase().includes(c.name.toLowerCase())) candidates.add(address(c));
            candidates.add(`${contextDir}/context.md`);
            if (unit.kind === "sequenceDiagram" && existsSync(path.join(root, RUNTIME_VIEW))) candidates.add(RUNTIME_VIEW);
            return { ...unit, target: null, candidates: [...candidates].slice(0, 6) };
        });
        pages.push({ path: rel, context: contextDir, summary: page.summary, title: page.title, units });
    }
    for (const rel of await filesUnder(root, CHANGES, /^flow(\.[^.]+)*\.md$/i)) {
        if (/^type:\s*flow\s*$/m.test(await texts.get(rel))) skipped.push(rel);
    }
    return { pages, skipped };
}

/** An answer to `--place`: a chapter or file that exists, or `drop`. */
async function parsePlaces(argv, texts, root) {
    const places = new Map();
    const problems = [];
    argv.forEach((arg, i) => {
        if (arg === "--place" && argv[i + 1]) places.set(...argv[i + 1].split(/=(.*)/s).slice(0, 2));
    });
    for (const [key, value] of places) {
        if (value === "drop") continue;
        const target = resolveRef(value, ".");
        if (!(await exists(root, target.file))) {
            problems.push(`--place ${key}=${value}: ${target.file} does not exist`);
            places.delete(key);
            continue;
        }
        if (target.anchor) {
            const found = (await chaptersOf(texts, [target.file])).some((c) => c.anchor === target.anchor);
            if (!found) {
                problems.push(`--place ${key}=${value}: no chapter with a \`meta\` block is anchored #${target.anchor} in ${target.file}`);
                places.delete(key);
                continue;
            }
        }
        places.set(key, target);
    }
    return { places, problems };
}

// ── Moving ──────────────────────────────────────────────────────────────────

/** A unit's body ready for its target: in-page anchors named by page, relative links rebased to the target's folder. */
function carried(unit, pageRel, targetFile) {
    const fromDir = path.posix.dirname(pageRel);
    const toDir = path.posix.dirname(targetFile);
    const page = path.posix.basename(pageRel);
    return flatten(unit.body).replace(/(\]\(\s*<?)(?!https?:|mailto:)([^)\s>]*)/g, (whole, open, ref) => {
        if (ref.startsWith("#")) ref = `${page}${ref}`;
        if (!ref || ref.startsWith(".devbook/") || ref.startsWith("/")) return `${open}${ref}`;
        if (fromDir === toDir) return `${open}${ref}`;
        const [file, anchor] = ref.split("#");
        const rebased = path.posix.relative(toDir, path.posix.join(fromDir, file)) || path.posix.basename(file);
        return `${open}${rebased}${anchor !== undefined ? `#${anchor}` : ""}`;
    });
}

/**
 * The target's text with `blocks` inserted: under a chapter's heading, after its
 * `meta` block and the annotation fences that follow it; in a file without an
 * anchor, before its first `##`.
 */
export function insertInto(markdown, anchor, blocks) {
    const lines = markdown.split("\n");
    const scanned = scan(lines);
    let at = -1;
    if (anchor) {
        const headingAt = lines.findIndex((l, i) => !scanned[i].inFence && /^#{2,6}\s/.test(l) && slugify(l.replace(/^#{2,6}\s+/, "").trim()) === anchor);
        if (headingAt === -1) return null;
        at = headingAt + 1;
        for (;;) {
            let j = at;
            while (j < lines.length && lines[j].trim() === "") j++;
            if (!["meta", "annotation"].includes(scanned[j]?.opens)) break;
            j++;
            while (j < lines.length && lines[j].trim() !== "```") j++;
            at = j + 1;
        }
    } else {
        at = lines.findIndex((l, i) => !scanned[i].inFence && /^##\s/.test(l));
        if (at === -1) at = lines.length;
    }
    const before = lines.slice(0, at).join("\n").replace(/\n*$/, "");
    const after = lines.slice(at).join("\n").replace(/^\n*/, "");
    return `${before}\n\n${blocks.join("\n\n")}\n${after ? `\n${after}` : ""}`.replace(/\n*$/, "\n");
}

/**
 * One Markdown file with every reference to a moved unit rewritten — the
 * entries of `related` and `depends-on`, and prose links — dropping a `meta`
 * entry that now names the chapter carrying it, or that repeats one.
 * `moved(file, anchor)` answers the new address, or null.
 */
export function rewriteReferences(relPath, markdown, moved) {
    const fromDir = path.posix.dirname(changePathParts(relPath)?.target ?? relPath);
    const fromRepo = changePathParts(relPath)?.target ?? relPath;
    const swap = (ref) => {
        const target = moved(resolveRef(ref, fromDir));
        if (!target) return null;
        const file = ref.startsWith(".devbook/") ? target.file : path.posix.relative(fromDir, target.file) || path.posix.basename(target.file);
        return { ref: target.anchor ? `${file}#${target.anchor}` : file, address: address(target) };
    };
    const lines = markdown.split("\n");
    const scanned = scan(lines);
    let self = fromRepo;
    let inMeta = false;
    return lines
        .map((line, i) => {
            if (scanned[i].opens !== undefined) {
                inMeta = scanned[i].opens === "meta";
                return line;
            }
            if (scanned[i].inFence) {
                if (!inMeta) return line;
                const field = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
                if (!field || !REFERENCE_FIELDS.has(field[1])) return line;
                const value = field[2].trim();
                const list = value.startsWith("[");
                const entries = (list ? value.slice(1, -1).split(",") : [value]).map((e) => e.trim()).filter(Boolean);
                const seen = new Set();
                const kept = [];
                let changed = false;
                for (const quoted of entries) {
                    // An entry may be quoted, YAML-style; the quote is kept.
                    const quote = /^(["'])(.*)\1$/.exec(quoted);
                    const entry = quote ? quote[2] : quoted;
                    const swapped = swap(entry);
                    const ref = swapped ? (quote ? `${quote[1]}${swapped.ref}${quote[1]}` : swapped.ref) : quoted;
                    const at = swapped?.address ?? address(resolveRef(entry, fromDir));
                    changed ||= Boolean(swapped);
                    if (swapped && at === self) continue;
                    if (seen.has(at)) {
                        changed = true;
                        continue;
                    }
                    seen.add(at);
                    kept.push(ref);
                }
                if (!changed) return line;
                if (!kept.length) return null;
                return `${field[1]}: ${list ? `[${kept.join(", ")}]` : kept[0]}`;
            }
            inMeta = false;
            const heading = /^#{2,6}\s+(.*)$/.exec(line);
            if (heading) self = `${fromRepo}#${slugify(heading[1].trim())}`;
            return line.replace(/(\]\(\s*<?)(?!https?:|mailto:)([^)\s#>]+\.md)(#[^)\s>]+)?/g, (whole, open, file, anchor) => {
                const swapped = swap(`${file}${anchor ?? ""}`);
                return swapped ? `${open}${swapped.ref}` : whole;
            });
        })
        .filter((line) => line !== null)
        .join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(argv) {
    const checkOnly = argv.includes("--check");
    const rootAt = argv.indexOf("--root");
    const ROOT = path.resolve(rootAt !== -1 ? argv[rootAt + 1] : process.cwd());
    const say = (line) => console.log(line);
    const done = (line, code = 0) => {
        console.log(`${ID}: ${line}`);
        process.exit(code);
    };

    if (!(await exists(ROOT, STAMP))) done("nothing to do — no stamp.");
    const devbook = JSON.parse((await readFile(path.join(ROOT, STAMP), "utf8")).replace(/^﻿/, ""))?.components?.devbook;
    if (!devbook) done("nothing to do — no components.devbook stamp.");
    if (!(devbook.adopted ?? []).includes("domain")) done("not-applicable — `domain` is not adopted.");

    const texts = new Texts(ROOT);
    const { places, problems } = await parsePlaces(argv, texts, ROOT);
    for (const problem of problems) say(`- refused ${problem}.`);
    const { pages, skipped } = await plan(ROOT, texts, places);
    for (const rel of skipped) say(`- left ${rel}: a flow page in an open change is not rewritten; write its diagrams as deltas of the chapters they open.`);
    if (!pages.length) done("nothing to do — no flow page left.");

    const asks = pages.flatMap((page) => page.units.filter((unit) => !unit.target).map((unit) => ({ page, unit })));
    for (const page of pages) {
        for (const unit of page.units.filter((u) => u.target)) {
            const where = unit.target === "drop" ? "nowhere — dropped" : address(unit.target);
            say(`- ${checkOnly ? "move" : "moved"} ${page.path}#${unit.anchor} ("${unit.heading}") to ${where}, by ${unit.by}`);
        }
        if (page.summary && page.units.every((u) => u.target)) {
            const into = page.units.find((u) => u.target !== "drop");
            say(isBoilerplate(page.summary) || !into
                ? `- ${checkOnly ? "drop" : "dropped"} the template summary of ${page.path}`
                : `- ${checkOnly ? "carry" : "carried"} the summary of ${page.path} under ${page.path}#${into.anchor}`);
        }
    }
    for (const { page, unit } of asks) {
        say(`- ask ${page.path}#${unit.anchor} ("${unit.heading}", ${unit.kind ?? "no diagram"}): which chapter does it open? Candidates: ${unit.candidates.join(", ")}. Answer with --place ${page.path}#${unit.anchor}=<chapter, file, or drop>`);
    }
    if (checkOnly) process.exit(1);

    // Each target's blocks, in reading order; a chapter opening with more than one diagram labels each.
    const into = new Map();
    for (const page of pages) {
        for (const unit of page.units) {
            if (!unit.target || unit.target === "drop") continue;
            const key = address(unit.target);
            if (!into.has(key)) into.set(key, { target: unit.target, units: [] });
            into.get(key).units.push({ page, unit });
        }
    }
    // A page's own summary says something only when it is not the template's; it follows its first unit's body.
    const summaryOf = new Map();
    for (const page of pages) {
        const first = page.units.find((u) => u.target && u.target !== "drop");
        if (first && page.summary && !isBoilerplate(page.summary) && page.units.every((u) => u.target)) summaryOf.set(first, page.summary);
    }
    for (const { target, units } of into.values()) {
        const text = await texts.get(target.file);
        const label = true;
        const blocks = units.map(({ page, unit }) => {
            const body = summaryOf.has(unit) ? { ...unit, body: `${unit.body}\n\n${summaryOf.get(unit)}` } : unit;
            return `${label ? `**${unit.heading}**\n\n` : ""}${carried(body, page.path, target.file)}`;
        });
        const next = insertInto(text, target.anchor, blocks);
        if (next === null) done(`refused — ${address(target)} has no such heading; nothing was written.`, 1);
        texts.set(target.file, next);
    }

    // Every reference to a moved unit, or to a page all of whose units moved.
    const pageByPath = new Map(pages.map((page) => [page.path, page]));
    const fallback = (page) => {
        const first = page.units.find((u) => u.target && u.target !== "drop");
        return first ? first.target : { file: `${page.context}/context.md`, anchor: null };
    };
    const moved = ({ file, anchor }) => {
        const page = pageByPath.get(file);
        if (!page) return null;
        const whole = page.units.every((u) => u.target);
        const unit = anchor ? page.units.find((u) => u.anchor === anchor) : null;
        if (unit) return unit.target ? (unit.target === "drop" ? fallback(page) : unit.target) : null;
        return whole ? fallback(page) : null;
    };
    for (const rel of await referencingFiles(ROOT)) {
        if (pageByPath.has(rel)) continue;
        const text = await texts.get(rel);
        const rewritten = rewriteReferences(rel, text, moved);
        if (rewritten !== text) texts.set(rel, rewritten);
    }

    // A page keeps the units still waiting for an answer; one with none left is removed.
    for (const page of pages) {
        const waiting = page.units.filter((u) => !u.target);
        if (!waiting.length || waiting.length === page.units.length) continue;
        const lead = waiting.find((u) => u.lead);
        const sections = waiting.filter((u) => !u.lead).map((u) => `## ${u.heading}\n\n${u.body}`);
        texts.set(page.path, `${[readFlowPage(await texts.get(page.path)).head, ...(lead ? [lead.body] : []), ...sections].join("\n\n")}\n`);
    }
    await texts.flush();
    let removed = 0;
    for (const page of pages) {
        if (!page.units.every((u) => u.target)) continue;
        await rm(path.join(ROOT, page.path));
        removed++;
    }
    for (const rel of await filesUnder(ROOT, DOMAIN, /^flow(\.[^.]+)*\.demo\.html$/i)) {
        say(`- left ${rel}: it was the demo of a flow page; name it from the chapters it shows with \`demo\`.`);
    }
    if (asks.length) done(`applied in part; moved ${pages.flatMap((p) => p.units).filter((u) => u.target).length} section(s), removed ${removed} page(s); ${asks.length} section(s) wait for an answer.`, 1);
    done(`applied; moved every section, removed ${removed} flow page(s).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
