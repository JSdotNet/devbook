#!/usr/bin/env node
// 039-context-map-joins-c4 — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are
// `.devbook/domain/context-map.md`, a `deployment` field in a `domain/` block,
// and a reference that names the map. Once the map is deleted, every
// `deployment` is gone, and every reference is rewritten, nothing is left to
// see, which is what makes re-running it safe.
//
// All or nothing: every write is planned first, and a run that meets something
// it cannot place — a relationship naming a context no element stands for, a
// deployment with no element to host it, a workspace it cannot write into —
// writes nothing, says what to settle by hand, and fails so the ledger does not
// record it. Text it drops on purpose, such as a context section's prose, is
// printed so the person running it can carry it on; git history keeps it too.
//
// Dependency-free ESM against node built-ins, the plugin's workspace reader,
// and 033's workspace writer.

import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tokenize } from "../../tools/devbook-meta/c4.mjs";
import { slugify } from "../../tools/devbook-meta/metadata.mjs";
import { Model, WORKSPACE, INCLUDE_FOLDER, readFromFiles, skeleton, q } from "../033-c4-workspace/workspace.mjs";

const ID = "039-context-map-joins-c4";
const STAMP = ".devbook/config.json";
export const MAP = ".devbook/domain/context-map.md";
const DOMAIN = ".devbook/domain/";
const ARC42 = ".devbook/arc42/";
export const CROSSCUTTING = ".devbook/arc42/08-crosscutting-concepts.md";
const BLOCKS = ".devbook/arc42/building-blocks/";
// Where a reference to the map as a whole lands: the chapter that embeds the
// container view, else the system context, else chapter 8.
const OVERVIEWS = [".devbook/arc42/05-building-block-view.md", ".devbook/arc42/03-context-and-scope.md"];
// The map's sections that move into chapter 8 whole.
export const MOVED_SECTIONS = ["published-languages", "strategic-rules"];
export const CLASSES = ["Core", "Supporting", "Generic"];
const F = "```";
const lower = (v) => String(v ?? "").toLowerCase();
const posix = path.posix;

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

async function walk(root, rel) {
    const out = [];
    let entries;
    try { entries = await readdir(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
        const child = `${rel}/${e.name}`;
        if (e.isDirectory()) {
            if (e.name === "_meta" || e.name === "_tools" || e.name === "node_modules" || e.name === ".git") continue;
            out.push(...(await walk(root, child)));
        } else out.push(child);
    }
    return out;
}

// ── Markdown ────────────────────────────────────────────────────────────────

/** The `meta` fences of a document, outside any other fence: `{ open, close }` line indexes. */
export function metaFences(lines) {
    const out = [];
    let inFence = null;
    for (let i = 0; i < lines.length; i++) {
        const m = /^(\s*)(`{3,}|~{3,})\s*([\w-]*)/.exec(lines[i]);
        if (!m) continue;
        if (inFence) {
            if (m[2][0] === inFence.mark[0] && m[2].length >= inFence.mark.length && !m[3]) {
                if (inFence.meta) out.push({ open: inFence.at, close: i });
                inFence = null;
            }
        } else inFence = { mark: m[2], at: i, meta: m[3] === "meta" };
    }
    return out;
}

/** A field's value in a block's lines: a list for `[a, b]`, else the scalar, else null. */
export function fieldOf(lines, key) {
    const line = lines.find((l) => new RegExp(`^${key}\\s*:`).test(l));
    if (!line) return null;
    const raw = line.slice(line.indexOf(":") + 1).trim();
    if (raw.startsWith("[")) return listEntries(raw);
    return raw.replace(/^["']|["']$/g, "") || null;
}

function listEntries(raw) {
    return raw.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

/** The `##` sections of a document, outside fences: `{ heading, slug, start, end }`, `end` exclusive. */
export function sections(lines) {
    const out = [];
    let fence = null;
    for (let i = 0; i < lines.length; i++) {
        const m = /^(\s*)(`{3,}|~{3,})/.exec(lines[i]);
        if (m) { if (!fence) fence = m[2]; else if (m[2][0] === fence[0] && m[2].length >= fence.length) fence = null; continue; }
        if (fence) continue;
        const h = /^##\s+(.+?)\s*#*\s*$/.exec(lines[i]);
        if (h && !lines[i].startsWith("###")) {
            if (out.length) out.at(-1).end = i;
            out.push({ heading: h[1], slug: slugify(h[1]), start: i, end: lines.length });
        }
    }
    return out;
}

/** A section's body: its lines after the heading, its own `meta` fence left out. */
function bodyOf(lines, section) {
    const body = lines.slice(section.start + 1, section.end);
    const fence = metaFences(body)[0];
    const lead = body.slice(0, fence?.open ?? 0).every((l) => !l.trim());
    const kept = fence && lead ? body.slice(fence.close + 1) : body;
    const meta = fence && lead ? body.slice(fence.open + 1, fence.close) : [];
    while (kept.length && !kept[0].trim()) kept.shift();
    while (kept.length && !kept.at(-1).trim()) kept.pop();
    return { text: kept, meta };
}

const plain = (cell) => String(cell ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").trim();

/** The pipe tables in some lines: `{ header: [...], rows: [[...]], at: [first, last] }`. */
export function tables(lines) {
    const out = [];
    const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    for (let i = 0; i + 1 < lines.length; i++) {
        if (!/^\s*\|/.test(lines[i]) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
        const header = cells(lines[i]).map(plain);
        const rows = [];
        let j = i + 2;
        for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(cells(lines[j]));
        out.push({ header, rows, at: [i, j - 1] });
        i = j - 1;
    }
    return out;
}

const column = (header, pattern) => header.findIndex((h) => pattern.test(h));

/** A relationship table's rows as `{ from, to, pattern, description }`, or null when it is no such table. */
export function relationshipRows(table) {
    const from = column(table.header, /^(downstream|consumer|customer|from|source|client|user|uses)/i);
    const to = column(table.header, /^(upstream|supplier|provider|to|target|server|depends on|dependency|used)/i);
    if (from < 0 || to < 0) return null;
    const pattern = column(table.header, /(pattern|relationship|kind|type|integration)/i);
    const description = column(table.header, /(description|what|why|notes?|purpose|via|contract|reason)/i);
    return table.rows.map((r) => ({
        from: plain(r[from]),
        to: plain(r[to]),
        pattern: pattern >= 0 ? plain(r[pattern]) : "",
        description: description >= 0 ? plain(r[description]) : "",
    })).filter((r) => r.from && r.to);
}

/** The edges of a Mermaid flowchart: `A -->|label| B`, `A -- label --> B`, `A --> B`, nodes `A[Label]`. */
export function mermaidRows(body) {
    const labels = new Map();
    const node = (token) => {
        const m = /^([A-Za-z0-9_-]+)\s*(?:\[\(?"?([^\]"]*)"?\)?\]|\("?([^)"]*)"?\)|\{"?([^}"]*)"?\})?$/.exec(token.trim());
        if (!m) return null;
        const label = m[2] ?? m[3] ?? m[4];
        if (label) labels.set(m[1], label.trim());
        return m[1];
    };
    const edges = [];
    for (const line of body) {
        const e = /^\s*(.+?)\s*(?:--\s*"?([^">|-][^">|]*?)"?\s*-->|-\.->|==>|-->)\s*(?:\|"?([^|"]*)"?\|)?\s*(.+?)\s*;?\s*$/.exec(line);
        if (!e || /^(flowchart|graph|subgraph|end|classDef|class|style|linkStyle)\b/.test(e[1])) continue;
        const a = node(e[1]), b = node(e[4]);
        if (!a || !b) continue;
        edges.push({ a, b, label: (e[2] ?? e[3] ?? "").trim() });
    }
    return edges.map(({ a, b, label }) => {
        const [pattern, ...rest] = label.split(/:\s*/);
        return { from: labels.get(a) ?? a, to: labels.get(b) ?? b, pattern: rest.length ? pattern : label, description: rest.join(": ") };
    });
}

/** A relationship's description: the DDD pattern first, then what it does. */
export function describe({ pattern, description }) {
    const p = pattern.trim(), d = description.trim();
    if (p && d) return `${p}: ${d}`;
    return p || d || null;
}

/** The first sentence of some prose lines, or null. */
function firstSentence(lines) {
    const text = lines.filter((l) => l.trim() && !/^\s*([>|#-]|`{3})/.test(l)).join(" ").replace(/\s+/g, " ").trim();
    if (!text) return null;
    return plain((/^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text));
}

// ── references ──────────────────────────────────────────────────────────────

/** A relative Markdown link from `file` to the repository path `to`. */
function linkFrom(file, to, anchor) {
    const rel = posix.relative(posix.dirname(file), to) || posix.basename(to);
    return `${rel}${anchor ? `#${anchor}` : ""}`;
}

/**
 * Rewrites every `meta` list entry and Markdown link that names the map, in one
 * document. `target(anchor)` answers `{ path, anchor }` or null. Returns the new
 * lines and what it changed.
 */
export function rewriteReferences(file, lines, target) {
    const changed = [];
    const out = [...lines];
    const resolveLink = (href) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) return null;
        const [p, anchor = null] = href.split("#");
        const resolved = p.startsWith(".devbook/") ? posix.normalize(p) : posix.normalize(posix.join(posix.dirname(file), p));
        return resolved === MAP ? { anchor, rooted: p.startsWith(".devbook/") } : null;
    };
    for (const fence of metaFences(out)) {
        for (let i = fence.open + 1; i < fence.close; i++) {
            const m = /^([\w-]+)\s*:\s*(.*)$/.exec(out[i]);
            if (!m || !m[2].includes("context-map.md")) continue;
            const quoted = /"/.test(m[2]);
            const entries = m[2].trim().startsWith("[") ? listEntries(m[2].trim()) : [m[2].trim().replace(/^["']|["']$/g, "")];
            const next = [];
            for (const entry of entries) {
                const [p, anchor = null] = entry.split("#");
                if (posix.normalize(p) !== MAP) { next.push(entry); continue; }
                const t = target(anchor);
                if (t) next.push(`${t.path}${t.anchor ? `#${t.anchor}` : ""}`);
                changed.push(`${m[1]} ${entry} → ${t ? `${t.path}${t.anchor ? `#${t.anchor}` : ""}` : "dropped"}`);
            }
            const unique = [...new Set(next)];
            if (!unique.length) { out[i] = null; continue; }
            const shown = unique.map((e) => (quoted ? `"${e}"` : e));
            out[i] = `${m[1]}: ${m[2].trim().startsWith("[") ? `[${shown.join(", ")}]` : shown[0]}`;
        }
    }
    const fenced = new Set(metaFences(out).flatMap((f) => Array.from({ length: f.close - f.open + 1 }, (_, k) => f.open + k)));
    for (let i = 0; i < out.length; i++) {
        if (out[i] === null || fenced.has(i) || !out[i].includes("context-map.md")) continue;
        out[i] = out[i].replace(/\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (all, text, href, title) => {
            const hit = resolveLink(href);
            if (!hit) return all;
            const t = target(hit.anchor);
            if (!t) { changed.push(`link ${href} → its text`); return text; }
            const to = hit.rooted ? `${t.path}${t.anchor ? `#${t.anchor}` : ""}` : linkFrom(file, t.path, t.anchor);
            changed.push(`link ${href} → ${to}`);
            return `[${text}](${to}${title})`;
        });
    }
    return { lines: out.filter((l) => l !== null), changed };
}

// ── the workspace's tags ───────────────────────────────────────────────────

function closeOf(tokens, start) {
    let i = start;
    while (i < tokens.length && tokens[i].kind !== "open" && tokens[i].kind !== "end") i++;
    if (i >= tokens.length) return null;
    if (tokens[i].kind === "end") return { block: false, lastLine: tokens[i - 1].line };
    let depth = 0;
    for (let k = i; k < tokens.length; k++) {
        if (tokens[k].kind === "open") depth++;
        else if (tokens[k].kind === "close" && --depth === 0) {
            let p = k - 1;
            while (p > i && tokens[p].kind === "end") p--;
            return { block: true, closeLine: tokens[k].line, shared: (p > i && tokens[p].line === tokens[k].line) || tokens[i].line === tokens[k].line };
        }
    }
    return null;
}

/** Adds a `tags` statement to each existing element in `tags` (id → tag). Returns `{ files, problems }`. */
export function addTags(files, tags) {
    const out = new Map(files);
    const problems = [];
    const reading = readFromFiles(out);
    const byFile = new Map();
    for (const [id, tag] of tags) {
        const e = reading.elements.find((x) => lower(x.id) === lower(id));
        if (!e) { problems.push(`\`${id}\` is not in the workspace, so it was not tagged \`${tag}\`.`); continue; }
        if (e.tags.some((t) => lower(t) === lower(tag))) continue;
        if (!byFile.has(e.file)) byFile.set(e.file, []);
        byFile.get(e.file).push({ e, tag });
    }
    for (const [file, list] of byFile) {
        const text = out.get(file);
        const eol = text.includes("\r\n") ? "\r\n" : "\n";
        const lines = text.split(/\r?\n/);
        const tokens = tokenize(text, file);
        const edits = [];
        for (const { e, tag } of list) {
            const start = tokens.findIndex((t) => t.line === e.line && t.kind !== "end");
            const s = start < 0 ? null : closeOf(tokens, start);
            if (!s || (s.block && s.shared)) { problems.push(`${file}:${e.line} — \`${e.id}\` cannot be written into to tag it \`${tag}\`.`); continue; }
            if (!s.block && /\/\/|\/\*|\s#/.test(lines[s.lastLine - 1].replace(/"(?:[^"\\]|\\.)*"/g, '""'))) { problems.push(`${file}:${s.lastLine} — \`${e.id}\`'s line ends in a comment, so it was not tagged \`${tag}\`.`); continue; }
            edits.push(s.block ? { line: s.closeLine, mode: "before", tag } : { line: s.lastLine, mode: "open", tag });
        }
        for (const edit of edits.sort((a, b) => b.line - a.line)) {
            const at = edit.line - 1;
            if (edit.mode === "before") {
                const indent = `${/^\s*/.exec(lines[at])[0]}    `;
                lines.splice(at, 0, `${indent}tags ${q(edit.tag)}`);
            } else {
                const indent = /^\s*/.exec(lines[at])[0];
                lines[at] = `${lines[at].replace(/\s+$/, "")} {`;
                lines.splice(at + 1, 0, `${indent}    tags ${q(edit.tag)}`, `${indent}}`);
            }
        }
        out.set(file, lines.join(eol));
    }
    return { files: out, problems };
}

// ── the run ─────────────────────────────────────────────────────────────────

const classOf = (value) => CLASSES.find((c) => lower(plain(value)).startsWith(lower(c))) ?? null;

export async function run(root, { check = false, log = console.log } = {}) {
    const out = { work: 0, failed: false, lines: [] };
    const say = (line) => { out.lines.push(line); log(line); };
    const done = (line) => { say(`${ID}: ${line}`); return out; };

    if (!(await exists(path.join(root, STAMP)))) return done("nothing to do — no stamp.");
    const config = JSON.parse((await readFile(path.join(root, STAMP), "utf8")).replace(/^﻿/, ""));
    const devbook = config?.components?.devbook;
    if (!devbook) return done("nothing to do — no components.devbook stamp.");
    const adopted = devbook.adopted ?? [];
    if (!adopted.includes("domain")) return done("not-applicable — `domain` is not adopted.");

    const writes = new Map(); // repo path → LF text
    const eols = new Map();
    const deletes = new Set();
    const blocking = [];
    const work = (line) => { out.work++; say(`- ${line}`); };
    const report = (line) => say(`- report ${line}`);
    const verb = (now, then) => (check ? now : then);
    const texts = new Map();
    const load = async (rel) => {
        if (writes.has(rel)) return writes.get(rel);
        if (texts.has(rel)) return texts.get(rel);
        if (!(await exists(path.join(root, rel)))) return null;
        const raw = await readFile(path.join(root, rel), "utf8");
        eols.set(rel, raw.includes("\r\n") ? "\r\n" : "\n");
        const text = raw.replace(/\r\n/g, "\n");
        texts.set(rel, text);
        return text;
    };
    const put = (rel, text) => writes.set(rel, text);

    // 1. the contexts, and what the map says of each
    const domainFiles = (await walk(root, DOMAIN.slice(0, -1))).filter((f) => f.endsWith(".md"));
    const contexts = [];
    for (const file of domainFiles.filter((f) => /^\.devbook\/domain\/[^/]+\/context\.md$/.test(f))) {
        const lines = (await load(file)).split("\n");
        const block = metaFences(lines)[0];
        const meta = block ? lines.slice(block.open + 1, block.close) : [];
        const title = /^#\s+(.+?)\s*$/m.exec(lines.join("\n"))?.[1] ?? null;
        const folder = file.split("/")[2];
        contexts.push({
            file, folder, title, names: new Set([slugify(folder), title && slugify(title)].filter(Boolean)),
            c4: fieldOf(meta, "c4"), deployment: fieldOf(meta, "deployment"), related: [].concat(fieldOf(meta, "related") ?? []),
            prose: firstSentence(lines.slice((block?.close ?? 0) + 1, sections(lines)[0]?.start ?? lines.length)),
            section: null, tag: null,
        });
    }
    const contextNamed = (name) => contexts.find((c) => c.names.has(slugify(plain(name)))) ?? null;

    const mapText = await load(MAP);
    const map = mapText === null ? null : mapText.split("\n");
    const mapSections = map ? sections(map) : [];
    const relationships = [];
    const moved = [];
    if (map) {
        if (!adopted.includes("arc42")) {
            blocking.push(`${MAP} moves into the C4 workspace, but \`arc42\` is not adopted. Adopt it through \`devbook:update\`, then run this again.`);
        }
        for (const s of mapSections) {
            const { text, meta } = bodyOf(map, s);
            if (lower(fieldOf(meta, "type")) === "bounded-context") {
                const related = [].concat(fieldOf(meta, "related") ?? []);
                const ctx = contexts.find((c) => related.includes(c.file)) ?? contextNamed(s.heading);
                if (!ctx) { blocking.push(`${MAP}#${s.slug} names no bounded context folder under ${DOMAIN}; create its \`context.md\` or delete the section, then run this again.`); continue; }
                ctx.section = s.slug;
                ctx.names.add(s.slug);
                ctx.related.push(...related.filter((r) => r !== ctx.file));
                const deployment = fieldOf(meta, "deployment");
                if (deployment && ctx.deployment && deployment !== ctx.deployment) report(`${MAP}#${s.slug} states \`deployment: ${deployment}\` but ${ctx.file} states \`${ctx.deployment}\`; ${ctx.file}'s value was used.`);
                ctx.deployment ??= deployment;
                ctx.mapProse = firstSentence(text);
                if (text.length) report(`${MAP}#${s.slug}: its first sentence describes the element when one is added, and the rest is not carried — ${ctx.file} states the boundary. It read: "${text.join(" ").replace(/\s+/g, " ").slice(0, 160)}"`);
                continue;
            }
            if (MOVED_SECTIONS.includes(s.slug)) { if (text.length) moved.push({ heading: s.heading, slug: s.slug, text }); continue; }
            if (s.slug === "subdomain-landscape") {
                for (const t of tables(text)) {
                    const cls = column(t.header, /class/i), ctxCol = column(t.header, /context/i), sub = column(t.header, /subdomain/i);
                    if (cls < 0 || ctxCol < 0) continue;
                    for (const row of t.rows) {
                        const ctx = contextNamed(row[ctxCol]);
                        const tag = classOf(row[cls]);
                        if (!ctx || !tag) { report(`${MAP}#subdomain-landscape row "${row.map(plain).join(" | ")}" names no context or no class of ${CLASSES.join(", ")}; tag its element by hand.`); continue; }
                        ctx.tag = tag;
                        if (sub >= 0 && slugify(plain(row[sub])) !== slugify(ctx.title ?? ctx.folder)) report(`${MAP}#subdomain-landscape: the subdomain name "${plain(row[sub])}" is not carried; the tag \`${tag}\` on ${ctx.title ?? ctx.folder}'s element keeps its class.`);
                    }
                }
                continue;
            }
            if (s.slug === "context-map") {
                const found = [];
                for (const t of tables(text)) { const rows = relationshipRows(t); if (rows) found.push(...rows); }
                const fences = [];
                for (let i = 0, open = -1; i < text.length; i++) {
                    if (/^\s*`{3}mermaid/.test(text[i])) open = i;
                    else if (open >= 0 && /^\s*`{3}\s*$/.test(text[i])) { fences.push(text.slice(open + 1, i)); open = -1; }
                }
                for (const body of fences) {
                    const rows = mermaidRows(body);
                    if (rows.length) report(`${MAP}#context-map: ${rows.length} relationship(s) read from a Mermaid diagram as "the arrow's source uses its target"; check each direction in the workspace.`);
                    found.push(...rows);
                }
                if (!found.length && text.some((l) => l.trim())) blocking.push(`${MAP}#context-map holds no table with an upstream and a downstream column and no Mermaid flowchart edges; write its relationships into ${WORKSPACE} by hand, delete the section, and run this again.`);
                relationships.push(...found);
                continue;
            }
            if (text.length) report(`${MAP}#${s.slug} ("${s.heading}") is not a section this moves, so it is not carried. It read: "${text.join(" ").replace(/\s+/g, " ").slice(0, 160)}"`);
        }
    }

    const anything = map || contexts.some((c) => c.deployment) || domainFiles.length;
    if (!anything) return done("nothing to do — no context map, no `deployment`.");

    // 2. the workspace: each context's element, its tag, and the relationships
    const needsWorkspace = Boolean(map) || contexts.some((c) => c.deployment && !c.c4);
    let model = null;
    const files = new Map();
    if (needsWorkspace && adopted.includes("arc42")) {
        if ((await load(WORKSPACE)) === null) {
            const text = skeleton(config.id ?? path.basename(root));
            texts.set(WORKSPACE, text);
            put(WORKSPACE, text);
            eols.set(WORKSPACE, "\n");
            work(`${verb("create", "created")} ${WORKSPACE}`);
        }
        files.set(WORKSPACE, await load(WORKSPACE));
        for (const f of await walk(root, INCLUDE_FOLDER.slice(0, -1))) if (f.endsWith(".dsl")) files.set(f, await load(f));
        model = new Model(files);
        for (const p of model.reading.problems) report(`${p.file ?? WORKSPACE}:${p.line} — ${p.message} (already there; left alone)`);
    } else if (needsWorkspace) {
        blocking.push(`a \`deployment\` moves into the C4 workspace, but \`arc42\` is not adopted. Adopt it through \`devbook:update\`, then run this again.`);
    }

    const blockElement = async (ref) => {
        const [p] = String(ref).split("#");
        if (!p.startsWith(BLOCKS) && !p.startsWith(ARC42)) return null;
        const text = await load(p);
        if (text === null) return null;
        const lines = text.split("\n");
        const block = metaFences(lines)[0];
        const c4 = block ? fieldOf(lines.slice(block.open + 1, block.close), "c4") : null;
        const id = Array.isArray(c4) ? c4[0] : c4;
        return id ? model?.element(id) ?? null : null;
    };
    const systemOf = (e) => {
        let x = e;
        while (x && x.kind !== "softwareSystem") x = x.parent ? model.element(x.parent) : null;
        return x;
    };

    if (model) {
        for (const ctx of contexts) {
            const name = ctx.title ?? ctx.folder;
            if (ctx.c4) {
                const id = [].concat(ctx.c4)[0];
                ctx.element = model.element(id);
                if (!ctx.element) report(`${ctx.file} names \`${id}\` in \`c4\`, which the workspace does not define; fix the field.`);
                continue;
            }
            let host = null;
            for (const ref of ctx.related) { host = await blockElement(ref); if (host) break; }
            const named = model.find(name, ["container", "component"]) ?? (ctx.section ? model.find(ctx.section, ["container", "component"]) : null);
            const description = ctx.mapProse ?? ctx.prose ?? `The ${name} bounded context.`;
            const tags = ctx.tag ? [ctx.tag] : [];
            if (named) {
                ctx.element = named;
                if (ctx.deployment === "service" && named.kind !== "container") report(`${ctx.file} stated \`deployment: service\`, but its element \`${named.id}\` is a ${named.kind}; make it a container if the context ships on its own.`);
                if (ctx.deployment === "module" && named.kind !== "component") report(`${ctx.file} stated \`deployment: module\`, but its element \`${named.id}\` is a ${named.kind}; make it a component of its host if it runs as a module.`);
            } else if (ctx.deployment === "service") {
                const system = host?.kind === "softwareSystem" ? host : host ? systemOf(host) : null;
                const systems = model.elements.filter((e) => e.kind === "softwareSystem" && !e.tags.some((t) => lower(t) === "external"));
                const into = system ?? (systems.length === 1 ? systems[0] : null);
                if (!into) { blocking.push(`${ctx.file} ships as a service, and no single software system can hold its container; add the container to ${WORKSPACE}, set \`c4\` on ${ctx.file}, and run this again.`); continue; }
                ctx.element = model.addElement({ kind: "container", local: ctx.folder, name, description, tags, parent: into.id });
                ctx.tagged = true;
            } else if (ctx.deployment === "module") {
                const container = host?.kind === "container" ? host : host?.kind === "component" ? model.element(host.parent) : null;
                if (!container) { blocking.push(`${ctx.file} runs as a module, and no building block it names through \`related\` is a container with \`c4\` to host it; add its component to ${WORKSPACE}, set \`c4\` on ${ctx.file}, and run this again.`); continue; }
                ctx.element = model.addElement({ kind: "component", local: ctx.folder, name, description, tags, parent: container.id });
                ctx.tagged = true;
            } else if (host) {
                ctx.element = host;
                report(`${ctx.file} names its host \`${host.id}\` in \`c4\`; narrow it to the context's own component if it runs as a module beside others.`);
            } else {
                report(`${ctx.file} has no element to name in \`c4\`: no building block it names carries \`c4\`, and no container or component is called ${name}. Set \`c4\` by hand.`);
            }
            if (ctx.element?.isNew) work(`${verb("add", "added")} ${ctx.element.kind} \`${ctx.element.id}\` for ${ctx.file} to ${WORKSPACE}`);
        }

        for (const r of relationships) {
            const a = contextNamed(r.from), b = contextNamed(r.to);
            const label = `${r.from} → ${r.to}`;
            if (!a?.element || !b?.element) { blocking.push(`${MAP}#context-map: the relationship ${label} names ${!a ? `"${r.from}"` : !b ? `"${r.to}"` : "a context"} no element stands for; add it to ${WORKSPACE} by hand, delete the row, and run this again.`); continue; }
            const description = describe(r);
            // Two contexts in one element, or one inside the other's: the
            // workspace cannot draw a relationship between them.
            if (model.isUnder(a.element.id, b.element.id) || model.isUnder(b.element.id, a.element.id)) {
                report(`${MAP}#context-map: ${label}${description ? ` (${description})` : ""} is not carried — ${a.element.id === b.element.id ? `both contexts name \`${a.element.id}\`` : `\`${a.element.id}\` and \`${b.element.id}\` sit one inside the other`}; give each context its own component and add the relationship by hand.`);
                continue;
            }
            if (model.related(a.element.id, b.element.id)) {
                const existing = model.rels.find((x) => model.isUnder(x.source, a.element.id) && model.isUnder(x.destination, b.element.id));
                if (!existing.isNew && r.pattern && !lower(existing.description).startsWith(lower(r.pattern))) report(`${WORKSPACE}: \`${a.element.id} -> ${b.element.id}\` already exists; open its description with "${r.pattern}:" by hand.`);
                continue;
            }
            model.addRelationship(a.element.id, b.element.id, description, null);
            work(`${verb("add", "added")} \`${a.element.id} -> ${b.element.id}\`${description ? ` ${q(description)}` : ""} to ${WORKSPACE}`);
        }

        if (model.changed) {
            const rendered = model.render();
            for (const p of rendered.problems) blocking.push(p);
            if (!rendered.problems.length) for (const [f, t] of rendered.files) if (t !== files.get(f)) { put(f, t); files.set(f, t); }
        }
        const tags = new Map();
        for (const c of contexts.filter((x) => x.tag && x.element && !x.tagged)) {
            const other = tags.get(c.element.id);
            if (other && other !== c.tag) { report(`${c.file}'s class \`${c.tag}\` is not carried: its element \`${c.element.id}\` is already tagged \`${other}\` for another context. Give each context its own component and tag it by hand.`); continue; }
            tags.set(c.element.id, c.tag);
        }
        if (tags.size && !blocking.length) {
            const before = new Map(files);
            const tagged = addTags(files, tags);
            for (const p of tagged.problems) report(p);
            for (const [f, t] of tagged.files) if (t !== before.get(f)) { put(f, t); files.set(f, t); }
            for (const [id, tag] of tags) if (!readFromFiles(before).elements.find((e) => lower(e.id) === lower(id))?.tags.some((t) => lower(t) === lower(tag))) work(`${verb("tag", "tagged")} \`${id}\` \`${tag}\` in ${WORKSPACE}`);
        }
        if (!blocking.length && model.changed) {
            const after = readFromFiles(files);
            const was = new Set(model.reading.problems.map((p) => p.message));
            for (const p of after.problems.filter((x) => !was.has(x.message))) blocking.push(`${p.file}:${p.line} — the workspace would not read after the change: ${p.message}`);
        }
    }

    // 3. published languages and strategic rules into chapter 8
    const crosscutting = { heading: new Map() };
    if (moved.length && adopted.includes("arc42")) {
        let text = await load(CROSSCUTTING);
        if (text === null) {
            text = `# 08. Crosscutting Concepts\n\n${F}meta\nnumber: 8\n${F}\n`;
            work(`${verb("create", "created")} ${CROSSCUTTING}`);
        }
        const lines = text.replace(/\n+$/, "").split("\n");
        const related = (await exists(path.join(root, OVERVIEWS[0]))) ? [`related: [${OVERVIEWS[0]}]`] : [];
        for (const m of moved) {
            // An in-page anchor named the map: it becomes a link to the map,
            // which step 5 rewrites to where that section went.
            const body = m.text.map((l) => l.replace(/\]\(([^)\s]+)/g, (all, href) => {
                if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith(".devbook/")) return all;
                const [p, anchor] = href.startsWith("#") ? [posix.basename(MAP), href.slice(1)] : href.split("#");
                const resolved = posix.normalize(posix.join(posix.dirname(MAP), p));
                return `](${linkFrom(CROSSCUTTING, resolved, anchor)}`;
            }));
            const existing = sections(lines).find((s) => s.slug === m.slug);
            if (existing) {
                lines.splice(existing.end, 0, ...(lines[existing.end - 1]?.trim() ? [""] : []), ...body, ...(existing.end < lines.length ? [""] : []));
            } else {
                lines.push("", `## ${m.heading}`, "", `${F}meta`, ...related, F, "", ...body);
            }
            crosscutting.heading.set(m.slug, m.slug);
            work(`${verb("move", "moved")} ${MAP}#${m.slug} → ${CROSSCUTTING}#${m.slug}`);
        }
        put(CROSSCUTTING, `${lines.join("\n")}\n`);
    }

    // 4. every `domain/` block: `deployment` off, `c4` on each context.md
    for (const file of domainFiles.filter((f) => f !== MAP)) {
        let lines = (await load(file)).split("\n");
        const before = lines.join("\n");
        const ctx = contexts.find((c) => c.file === file);
        let tookOff = false;
        for (const fence of metaFences(lines)) {
            for (let i = fence.open + 1; i < fence.close; i++) {
                if (!/^deployment\s*:/.test(lines[i])) continue;
                report(`took off ${file}:${i + 1}: ${lines[i].trim()}`);
                lines[i] = null;
                tookOff = true;
            }
        }
        lines = lines.filter((l) => l !== null);
        if (ctx?.element && !ctx.c4) {
            const block = metaFences(lines)[0];
            if (block) {
                const typeAt = lines.slice(block.open + 1, block.close).findIndex((l) => /^type\s*:/.test(l));
                lines.splice(typeAt >= 0 ? block.open + 2 + typeAt : block.close, 0, `c4: [${ctx.element.id}]`);
                work(`${verb("set", "set")} \`c4: [${ctx.element.id}]\` on ${file}`);
            }
        }
        if (lines.join("\n") !== before) {
            if (tookOff) work(`${verb("take", "took")} \`deployment\` off ${file}`);
            put(file, lines.join("\n"));
        }
    }

    // 5. every reference to the map, then the map itself. A map deleted by
    // hand can still leave references behind, so they are looked for anyway.
    {
        let fallback = null;
        for (const o of [...OVERVIEWS, CROSSCUTTING]) if (await exists(path.join(root, o))) { fallback = o; break; }
        if (!fallback && writes.has(CROSSCUTTING)) fallback = CROSSCUTTING;
        const target = (anchor) => {
            const ctx = anchor ? contexts.find((c) => c.section === anchor || c.names.has(anchor)) : null;
            if (ctx) return { path: ctx.file, anchor: null };
            if (anchor && crosscutting.heading.has(anchor)) return { path: CROSSCUTTING, anchor };
            return fallback ? { path: fallback, anchor: null } : null;
        };
        const scan = [
            ...(await walk(root, ".devbook")).filter((f) => f.endsWith(".md") && f !== MAP),
            ...(await walk(root, "openspec/changes")).filter((f) => f.endsWith(".md") && !f.startsWith("openspec/changes/archive/")),
            // A file this run creates, such as a new chapter 8, is not on disk yet.
            ...[...writes.keys()].filter((f) => f.endsWith(".md")),
        ];
        for (const file of [...new Set(scan)]) {
            const text = await load(file);
            if (!text.includes("context-map.md")) continue;
            const { lines, changed } = rewriteReferences(file, text.split("\n"), target);
            for (const c of changed) work(`${verb("rewrite", "rewrote")} ${file}: ${c}`);
            const next = lines.join("\n");
            if (next !== text) put(file, next);
            if (/context-map\.md/.test(next)) report(`${file} still names \`context-map.md\` in its prose; reword it by hand.`);
        }
        if (map) {
            deletes.add(MAP);
            work(`${verb("delete", "deleted")} ${MAP}`);
        }
    }

    if (blocking.length) {
        for (const b of blocking) say(`- blocked ${b}`);
        out.failed = true;
        return done(`${blocking.length} thing(s) to settle by hand first; nothing was written.`);
    }
    if (check) {
        if (!out.work) return done("no work left — no context map, no `deployment`, no reference to the map.");
        return out;
    }
    for (const [file, text] of writes) {
        const eol = eols.get(file) ?? "\n";
        await mkdir(path.dirname(path.join(root, file)), { recursive: true });
        await writeFile(path.join(root, file), eol === "\r\n" ? text.replace(/\r?\n/g, "\r\n") : text, "utf8");
    }
    for (const file of deletes) await rm(path.join(root, file), { force: true });
    return done(out.work ? `applied; ${out.work} change(s).` : "nothing to do — no context map, no `deployment`, no reference to the map.");
}

async function main(argv) {
    const at = argv.indexOf("--root");
    const root = path.resolve(at >= 0 ? argv[at + 1] : process.cwd());
    const result = await run(root, { check: argv.includes("--check") });
    process.exit(result.failed || (argv.includes("--check") && result.work) ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
