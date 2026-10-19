#!/usr/bin/env node
// 032-c4-workspace — see MIGRATION.md.
//
//   node migrate.mjs --check   list what would change; write nothing; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: each thing it moves leaves no source behind — the `_c4/`
// workspace is moved, a converted fence becomes a `c4:` embed, a converted Archify spec is
// deleted with its index entry, and a debt record that carries `severity` is not touched
// again. What it cannot move — a fence whose view belongs in another chapter, a sequence
// with a participant no element matches, a lifecycle or workflow spec — is reported on
// every run and never counts as work.
//
// The result is read back with the plugin's own reader before anything is written: a
// conversion that would add a problem to the workspace writes nothing and exits 1.

import { createHash } from "node:crypto";
import { readdir, readFile, rm, rmdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEBT_SEVERITIES, blockLadder, builtInStatuses } from "../../tools/devbook-meta/metadata.mjs";
import { C4_KEYWORDS, mermaidKeyword, parseArchifyArchitecture, parseArchifySequence, parseMermaidC4, parseSequence } from "./diagrams.mjs";
import { INCLUDE_FOLDER, Model, WORKSPACE, readFromFiles, skeleton } from "./workspace.mjs";

const ID = "032-c4-workspace";
const STAMP = ".devbook/config.json";
const ARC42 = ".devbook/arc42/";
const OLD_FOLDER = ".devbook/arc42/_c4/";
const DEBT_FOLDER = ".devbook/arc42/tdr/";
// The checker's own ladders: the debt ladder on a record's top-level block, the folder's elsewhere.
const DEBT_STATUSES = blockLadder("arc42", `${DEBT_FOLDER}x.md`, "file", {}).statuses;
const ARC42_RUNGS = builtInStatuses("arc42");
const SPEC_FILE = /^(.+)\.(\d+)\.([a-z]+)(\.standard)?\.json$/;
const lower = (v) => String(v ?? "").toLowerCase();
const clauses = (list) => list.map((p) => String(p).replace(/\.$/, "")).join("; ");

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

/** Every file under `rel` (POSIX, sorted), skipping `_meta/`. */
async function walk(root, rel) {
    const out = [];
    let entries;
    try { entries = await readdir(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
    for (const entry of entries) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) { if (entry.name !== "_meta") out.push(...(await walk(root, child))); }
        else if (entry.isFile()) out.push(child);
    }
    return out.sort();
}

// ── chapters ────────────────────────────────────────────────────────────────

function slug(text) {
    return lower(text).trim().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s/g, "-");
}

/** The fenced blocks of a chapter, with the headings each sits under; Mermaid ones numbered from 1. */
export function scanFences(markdown) {
    const lines = markdown.split(/\r?\n/);
    const fences = [];
    const trail = [];
    let open = null;
    let ordinal = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const marker = /^(\s*)(`{3,}|~{3,})\s*([^\s`~]*)/.exec(line);
        if (open) {
            if (marker && marker[2][0] === open.marker && marker[2].length >= open.length && !marker[3]) {
                if (open.mermaid) {
                    const body = open.body.map((l) => l.slice(Math.min(open.indent, l.length - l.trimStart().length))).join("\n");
                    fences.push({ start: open.start, end: i, indent: open.indentText, body, ordinal: ++ordinal, trail: [...trail] });
                }
                open = null;
            } else open.body.push(line);
            continue;
        }
        if (marker) {
            const info = lower(marker[3]);
            open = { marker: marker[2][0], length: marker[2].length, indent: marker[1].length, indentText: marker[1], start: i, body: [], mermaid: info === "mermaid" || info === "mmd" };
            continue;
        }
        const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (heading) {
            const level = heading[1].length;
            while (trail.length && trail.at(-1).level >= level) trail.pop();
            trail.push({ level, text: heading[2], slug: slug(heading[2]) });
        }
    }
    return fences;
}

/** The fence body as Archify hashes it: LF, no trailing whitespace, no blank lines at either end. */
export function fenceHash(body) {
    const lines = String(body).replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+$/, ""));
    while (lines.length && lines[0] === "") lines.shift();
    while (lines.length && lines.at(-1) === "") lines.pop();
    return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

// Where each family of view is embedded, per devbook-arc42.md's table.
const HOMES = {
    context: { chapters: ["03-context-and-scope.md"], says: "`03-context-and-scope.md`" },
    container: { chapters: ["05-building-block-view.md"], block: true, says: "`05-building-block-view.md` or a `building-blocks/<slug>.md`" },
    dynamic: { chapters: ["06-runtime-view.md"], runtime: true, says: "`06-runtime-view.md` or a building block's `## Runtime`" },
    deployment: { chapters: ["07-deployment-view.md"], says: "`07-deployment-view.md`" },
};
const FAMILY = { C4Context: "context", C4Container: "container", C4Component: "container", C4Dynamic: "dynamic", sequenceDiagram: "dynamic", C4Deployment: "deployment" };

/** Whether a view of `keyword`'s family may be embedded at this place. */
export function homeFits(keyword, chapter, trail, isIndex) {
    const home = HOMES[FAMILY[keyword]];
    const sub = chapter.slice(ARC42.length);
    const inBlock = /^building-blocks\/[^/]+\.md$/.test(sub) && !isIndex;
    const underRuntime = trail.some((h) => h.level === 2 && h.slug === "runtime");
    return { fits: home.chapters.includes(sub) || (home.block && inBlock) || (home.runtime && inBlock && underRuntime), says: home.says };
}

// ── resolving a diagram against the workspace ───────────────────────────────

const TOP = new Set(["person", "softwareSystem"]);

/**
 * Puts what a static C4 diagram draws into the model: each node matched to an element by
 * name (then identifier) or created, each relationship added unless one already joins the
 * two. Returns `{ ids, problems }`; the caller rolls the model back on a problem.
 */
export function resolveStatic(diagram, model, { loose = false } = {}) {
    const ids = new Map();
    const targets = new Map(); // alias → element a relationship to it means (an instance's target)
    const problems = [];
    const unplaced = [];
    const nodes = [...diagram.nodes.values()];
    const depth = (n) => { let d = 0; for (let p = n.parent; p; p = diagram.nodes.get(p)?.parent) d++; return d; };
    nodes.sort((a, b) => depth(a) - depth(b));
    const kids = (alias) => nodes.filter((n) => n.parent === alias);
    for (const n of nodes) {
        if (n.kind !== "boundary") { n.role = n.kind; continue; }
        if (n.boundary === "system" && kids(n.alias).some((k) => k.kind === "container")) n.role = "softwareSystem";
        else if (n.boundary === "container" && kids(n.alias).some((k) => k.kind === "component")) n.role = "container";
        else n.role = "group";
    }
    const host = (n) => { for (let p = n.parent; p; p = diagram.nodes.get(p).parent) { const pn = diagram.nodes.get(p); if (pn.role !== "group") return { node: pn, id: ids.get(p) ?? null }; } return null; };
    const groupOf = (n) => { for (let p = n.parent; p; p = diagram.nodes.get(p).parent) { const pn = diagram.nodes.get(p); if (pn.role === "group") return pn.name; return null; } return null; };
    const describe = (n) => {
        if (n.description) return n.description;
        model.notes.push(`"${n.name}" has no description in its diagram; it is described by its name — write its one line`);
        return n.name;
    };
    // A boundary with no match of its own is the system or container its matched children share.
    const inferred = (n, childKind) => {
        const parents = new Set();
        let matched = 0;
        for (const k of kids(n.alias).filter((c) => c.kind === childKind)) {
            const hit = model.find(k.name, [childKind]);
            if (hit) { matched++; parents.add(hit.parent); }
        }
        return matched && parents.size === 1 ? model.element([...parents][0]) : null;
    };
    const deployment = diagram.keyword === "C4Deployment";
    let environment = null;
    if (deployment) {
        environment = model.envs.length === 1 ? model.envs[0] : model.envs.find((e) => lower(e.name) === "default") ?? (model.envs.length ? null : model.addEnvironment("Default"));
        if (!environment) return { ids, problems: [`the workspace has ${model.envs.length} deployment environments and none is "Default", so which one this diagram deploys to is unknown`] };
    }

    for (const n of nodes) {
        if (n.role === "group") continue;
        const where = host(n);
        if (where && !where.id) { problems.push(`\`${n.alias}\` sits in \`${where.node.alias}\`, which did not resolve.`); continue; }
        const parentId = where?.id ?? null;
        const parentKind = where ? model.element(parentId)?.kind : null;

        if (deployment && n.kind !== "deploymentNode") {
            if (parentKind !== "deploymentNode") { model.notes.push(`\`${n.alias}\` stands outside every deployment node in a deployment diagram; the view leaves it out`); continue; }
            const target = model.find(n.name, [n.kind === "softwareSystem" ? "softwareSystem" : "container"]) ?? model.find(n.alias, [n.kind === "softwareSystem" ? "softwareSystem" : "container"]);
            if (!target) { problems.push(`\`${n.alias}\` ("${n.name}") is deployed but matches no ${n.kind} in the workspace.`); continue; }
            const kind = target.kind === "softwareSystem" ? "softwareSystemInstance" : "containerInstance";
            const existing = model.elements.find((e) => e.kind === kind && e.parent === parentId && lower(e.instanceOf) === lower(target.id));
            const instance = existing ?? model.addElement({ kind, local: `${target.id.split(".").at(-1)}Instance`, parent: parentId, instanceOf: target.id, environment: environment.name });
            ids.set(n.alias, instance.id);
            targets.set(n.alias, target.id);
            continue;
        }
        if (n.kind === "deploymentNode") {
            const match = model.elements.find((e) => e.kind === "deploymentNode" && (e.parent ?? null) === parentId && lower(e.environment) === lower(environment?.name) && lower(e.name) === lower(n.name));
            const node = match ?? model.addElement({ kind: "deploymentNode", local: n.alias, name: n.name, description: describe(n), technology: n.technology, parent: parentId, environment: environment?.name ?? null });
            ids.set(n.alias, node.id);
            continue;
        }

        let match = null;
        if (n.kind === "reference") {
            match = model.find(n.alias, ["person", "softwareSystem", "container", "component"]);
            if (match) ids.set(n.alias, match.id);
            else problems.push(`\`${n.alias}\` is named but never declared, and matches no workspace element.`);
            continue;
        }
        if (loose && !parentId) match = model.find(n.name, ["person", "softwareSystem", "container", "component"]) ?? model.find(n.alias, ["person", "softwareSystem", "container", "component"]);
        else if (TOP.has(n.role)) match = model.find(n.name, [n.role]) ?? model.find(n.alias, [n.role]);
        else match = model.find(n.name, [n.role], parentId ?? undefined) ?? model.find(n.alias, [n.role], parentId ?? undefined);
        if (!match && n.kind === "boundary") {
            match = inferred(n, n.role === "softwareSystem" ? "container" : "component");
            // A later diagram that names the boundary the same way means the same element.
            if (match) model.aliases.set(lower(n.name).trim(), match.id);
        }
        if (match) { ids.set(n.alias, match.id); continue; }
        if (n.fromArchify && diagram.keyword !== "C4Context") { unplaced.push(n.name); continue; }

        const tags = n.tags ?? [];
        // A name `find` could not pick — two elements, or one with no identifier — is never added a third time.
        const nested = parentId && parentKind === (n.role === "container" ? "softwareSystem" : "container");
        const made = TOP.has(n.role) ? n.role : nested ? n.role : n.external ? "softwareSystem" : null;
        if (made && model.named(n.name, made, nested ? parentId : null)) {
            problems.push(`"${n.name}" names more than one ${made} in the workspace, or one with no identifier, so it matches none; give it an identifier or a distinct name.`);
            continue;
        }
        if (TOP.has(n.role)) {
            ids.set(n.alias, model.addElement({ kind: n.role, local: n.alias.startsWith("~") ? n.name : n.alias, name: n.name, description: describe(n), tags, group: groupOf(n) }).id);
        } else if (nested) {
            ids.set(n.alias, model.addElement({ kind: n.role, local: n.alias.startsWith("~") ? n.name : n.alias, name: n.name, description: describe(n), technology: n.technology, tags, parent: parentId, group: groupOf(n) }).id);
        } else if (n.external) {
            ids.set(n.alias, model.addElement({ kind: "softwareSystem", local: n.alias, name: n.name, description: describe(n), tags: tags.includes("External") ? tags : [...tags, "External"], group: groupOf(n) }).id);
        } else {
            problems.push(`${n.role} \`${n.alias}\` ("${n.name}") sits in no ${n.role === "container" ? "system" : "container"} boundary and matches no ${n.role} in the workspace.`);
        }
    }
    if (unplaced.length) problems.push(`${unplaced.length} component(s) sit in no boundary and match no workspace element, so their level is unknown: ${unplaced.join(", ")}`);
    if (problems.length) return { ids, problems };

    for (const rel of diagram.rels) {
        const source = targets.get(rel.from) ?? ids.get(rel.from);
        const destination = targets.get(rel.to) ?? ids.get(rel.to);
        if (!source || !destination) {
            const end = !source ? rel.from : rel.to;
            if (diagram.nodes.get(end)?.role === "group") problems.push(`a relationship ends at \`${end}\`, a boundary that is no element.`);
            continue;
        }
        if (source === destination) continue;
        if (!model.rels.some((r) => lower(r.source) === lower(source) && lower(r.destination) === lower(destination))) model.addRelationship(source, destination, rel.description, rel.technology);
    }
    return { ids, problems, environment: environment?.name ?? null };
}

/** The element a view of `kind` scoped to `scope` shows for `id`, or null when it shows none. */
function visible(model, id, kind, scope) {
    const chain = [id, ...model.ancestors(id)];
    const at = (k) => chain.map((c) => model.element(c)).find((e) => e?.kind === k) ?? null;
    const top = model.element(chain.at(-1));
    if (lower(id) === lower(scope)) return null;
    if (kind === "container") {
        const container = at("container");
        if (container && lower(container.parent) === lower(scope)) return container.id;
        return top?.id ?? null;
    }
    if (kind === "component") {
        const component = at("component");
        if (component && lower(component.parent) === lower(scope)) return component.id;
        const container = at("container");
        return container?.id ?? top?.id ?? null;
    }
    return top?.id ?? null;
}

/** The scope a dynamic view of these elements takes: their one container, their one system, or `*`. */
function dynamicScope(model, elementIds) {
    const elements = elementIds.map((id) => model.element(id));
    const components = elements.filter((e) => e.kind === "component");
    if (components.length) {
        const parents = new Set(components.map((e) => e.parent));
        if (parents.size !== 1) return { problem: "its components sit in more than one container, so no dynamic view scope holds them all" };
        const scope = [...parents][0];
        if (elementIds.some((id) => lower(id) === lower(scope))) return { problem: `\`${scope}\` is both the view's scope and a participant` };
        return { scope };
    }
    const containers = elements.filter((e) => e.kind === "container");
    if (containers.length) {
        const parents = new Set(containers.map((e) => e.parent));
        if (parents.size !== 1) return { problem: "its containers sit in more than one system, so no dynamic view scope holds them all" };
        const scope = [...parents][0];
        if (elementIds.some((id) => lower(id) === lower(scope))) return { problem: `\`${scope}\` is both the view's scope and a participant` };
        return { scope };
    }
    return { scope: "*" };
}

/** Steps into the model: each backed by a relationship, one added where none joins the two. */
function addSteps(model, steps) {
    for (const s of steps) {
        if (!model.related(s.source, s.destination) && !model.related(s.destination, s.source)) model.addRelationship(s.source, s.destination, s.description, s.technology);
    }
}

/** A static C4 or Archify architecture diagram into elements and one view. Returns `{ view }` or `{ problems }`. */
export function convertStatic(diagram, model, key, options = {}) {
    const { ids, problems, environment } = resolveStatic(diagram, model, options);
    if (problems.length) return { problems };
    const title = diagram.title ?? null;
    const resolved = [...diagram.nodes.values()].filter((n) => ids.has(n.alias));
    const pick = (role) => {
        const candidates = resolved.filter((n) => n.role === role && n.kind === "boundary");
        candidates.sort((a, b) => [...diagram.nodes.values()].filter((k) => k.parent === b.alias).length - [...diagram.nodes.values()].filter((k) => k.parent === a.alias).length);
        return candidates[0] ? ids.get(candidates[0].alias) : null;
    };
    const elementIds = [...new Set(resolved.map((n) => ids.get(n.alias)))];
    const includesFor = (kind, scope) => [...new Set(elementIds.map((id) => visible(model, id, kind, scope)).filter(Boolean))];

    switch (diagram.keyword) {
        case "C4Context": {
            const own = [...new Set(resolved.filter((n) => n.role === "softwareSystem" && !n.external).map((n) => ids.get(n.alias)).filter((id) => model.element(id).kind === "softwareSystem"))];
            if (own.length === 1) return { view: { kind: "systemContext", scope: own[0], key, title, includes: includesFor("systemContext", own[0]) } };
            return { view: { kind: "systemLandscape", key, title, includes: includesFor("systemLandscape", null) } };
        }
        case "C4Container": {
            let scope = pick("softwareSystem");
            if (!scope) {
                const parents = new Set(elementIds.map((id) => model.element(id)).filter((e) => e.kind === "container").map((e) => e.parent));
                if (parents.size === 1) scope = [...parents][0];
                // What matched are components of one container: the picture is that container's.
                const components = new Set(elementIds.map((id) => model.element(id)).filter((e) => e.kind === "component").map((e) => e.parent));
                if (!parents.size && components.size === 1) {
                    const inside = [...components][0];
                    return { view: { kind: "component", scope: inside, key, title, includes: includesFor("component", inside) } };
                }
            }
            if (!scope) return { problems: ["no one system holds its containers, so the container view has no scope."] };
            return { view: { kind: "container", scope, key, title, includes: includesFor("container", scope) } };
        }
        case "C4Component": {
            let scope = pick("container");
            if (!scope) {
                const parents = new Set(elementIds.map((id) => model.element(id)).filter((e) => e.kind === "component").map((e) => e.parent));
                if (parents.size === 1) scope = [...parents][0];
            }
            if (!scope) return { problems: ["no one container holds its components, so the component view has no scope."] };
            return { view: { kind: "component", scope, key, title, includes: includesFor("component", scope) } };
        }
        case "C4Dynamic": {
            const steps = diagram.steps.map((s) => ({ source: ids.get(s.from), destination: ids.get(s.to), description: s.description, technology: s.technology })).filter((s) => s.source && s.destination && s.source !== s.destination);
            const { scope, problem } = dynamicScope(model, [...new Set(steps.flatMap((s) => [s.source, s.destination]))]);
            if (problem) return { problems: [problem] };
            addSteps(model, steps);
            return { view: { kind: "dynamic", scope, key, title, steps } };
        }
        case "C4Deployment": {
            return { view: { kind: "deployment", scope: "*", environment, key, title, includes: "*" } };
        }
        default:
            return { problems: [`\`${diagram.keyword}\` is not a C4 diagram.`] };
    }
}

/** Each sequence participant matched to an element by label, then alias: `{ ids, unmatched }`. */
export function matchParticipants(diagram, model) {
    const kinds = ["person", "softwareSystem", "container", "component"];
    const ids = new Map();
    const unmatched = [];
    for (const p of diagram.participants) {
        const hit = model.find(p.label, kinds) ?? model.find(p.alias, kinds);
        if (hit) ids.set(p.alias, hit.id);
        else unmatched.push(p.label === p.alias ? p.alias : `${p.alias} ("${p.label}")`);
    }
    return { ids, unmatched };
}

/** A sequence whose every participant matches an element into a dynamic view. Returns `{ view }`, `{ unmatched }`, or `{ problems }`. */
export function convertSequence(diagram, model, key) {
    if (diagram.problems.length) return { problems: diagram.problems };
    const { ids, unmatched } = matchParticipants(diagram, model);
    if (unmatched.length) return { unmatched };
    const steps = diagram.steps.map((s) => ({ source: ids.get(s.from), destination: ids.get(s.to), description: s.description, technology: s.technology })).filter((s) => s.source !== s.destination);
    if (!steps.length) return { problems: ["it has no message between two participants."] };
    const { scope, problem } = dynamicScope(model, [...new Set(steps.flatMap((s) => [s.source, s.destination]))]);
    if (problem) return { problems: [problem] };
    addSteps(model, steps);
    if (diagram.selfMessages) model.notes.push(`${diagram.selfMessages} self-message(s) in "${diagram.title ?? key}" have no dynamic step and were left out`);
    return { view: { kind: "dynamic", scope, key, title: diagram.title ?? null, steps } };
}

// ── debt records ────────────────────────────────────────────────────────────

/** The first bold run under a `## <title>` section, or null. */
function boldUnder(lines, title) {
    const at = lines.findIndex((l) => new RegExp(`^##\\s+${title}\\s*#*\\s*$`, "i").test(l));
    if (at < 0) return null;
    for (let i = at + 1; i < lines.length && !/^#{1,2}\s/.test(lines[i]); i++) {
        const m = /\*\*([^*]+?)\*\*/.exec(lines[i]);
        if (m) return m[1].trim();
    }
    return null;
}

/**
 * One debt record's `severity` and `status` filled from its `## Severity` and `## Status`
 * sections. Returns `{ markdown, set, reports }`; `set` lists the fields written.
 */
export function migrateDebtRecord(markdown, { status: fillStatus = true } = {}) {
    const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
    const lines = markdown.split(/\r?\n/);
    const reports = [];
    const set = [];
    const open = lines.findIndex((l) => /^```meta\s*$/.test(l));
    if (open < 0) return { markdown, set, reports: ["it has no meta block"] };
    const close = lines.findIndex((l, i) => i > open && /^```\s*$/.test(l));
    if (close < 0) return { markdown, set, reports: ["its meta block never closes"] };
    const meta = lines.slice(open + 1, close);
    if (meta.some((l) => /^index:\s*root\s*$/.test(l))) return { markdown, set, reports, index: true };
    const field = (name) => meta.findIndex((l) => new RegExp(`^${name}:`).test(l));
    const word = (text) => lower(text).replace(/[.,:;!?—–-]+$/, "").trim();
    const writes = [];

    if (field("severity") < 0) {
        const bold = boldUnder(lines, "Severity");
        if (bold === null) reports.push("no `## Severity` section with a bold word to read `severity` from");
        else {
            const value = word(bold.split(/\s+/)[0]);
            if (DEBT_SEVERITIES.includes(value)) { writes.push({ add: `severity: ${value}` }); set.push(`severity: ${value}`); }
            else reports.push(`\`## Severity\` opens with **${bold}**, which is not one of ${DEBT_SEVERITIES.join(", ")}`);
        }
    }

    const statusAt = field("status");
    const current = statusAt >= 0 ? lower(meta[statusAt].slice("status:".length)).trim() : null;
    if (fillStatus && (current === null || ARC42_RUNGS.includes(current))) {
        const bold = boldUnder(lines, "Status");
        const whole = word(bold ?? "").replace(/\s+/g, "-");
        const value = DEBT_STATUSES.includes(whole) ? whole : DEBT_STATUSES.find((s) => s === word((bold ?? "").split(/\s+/)[0])) ?? null;
        if (bold === null) { if (current !== null) reports.push(`\`status: ${current}\` is an arc42 rung and there is no \`## Status\` section to read the debt's from`); }
        else if (!value) reports.push(`\`## Status\` opens with **${bold}**, which is not one of ${DEBT_STATUSES.join(", ")}`);
        else if (value === "identified") {
            if (statusAt >= 0) { writes.push({ remove: statusAt }); set.push("status: identified (the resting value, written by omitting it)"); }
        } else if (statusAt >= 0) { writes.push({ replace: statusAt, line: `status: ${value}` }); set.push(`status: ${value}`); }
        else { writes.push({ add: `status: ${value}` }); set.push(`status: ${value}`); }
    }

    if (!writes.length) return { markdown, set, reports };
    const next = [...meta];
    for (const w of writes) if (w.replace !== undefined) next[w.replace] = w.line;
    for (const w of writes) if (w.remove !== undefined) next[w.remove] = null;
    for (const w of writes) if (w.add) next.push(w.add);
    const out = [...lines.slice(0, open + 1), ...next.filter((l) => l !== null), ...lines.slice(close)];
    return { markdown: out.join(eol), set, reports };
}

// ── the run ─────────────────────────────────────────────────────────────────

/** Where an Archify spec sits: its chapter, ordinal, type, and the fence hash its index files it under. */
async function archifySpecs(root) {
    const specs = [];
    const indexes = new Map();
    for (const file of await walk(root, ARC42.slice(0, -1))) {
        const dir = path.posix.dirname(file);
        if (path.posix.basename(dir) !== "_archify") continue;
        const name = path.posix.basename(file);
        if (name === "index.json") {
            try { indexes.set(dir, JSON.parse((await readFile(path.join(root, file), "utf8")).replace(/^﻿/, ""))); } catch { indexes.set(dir, null); }
            continue;
        }
        const m = SPEC_FILE.exec(name);
        if (!m) continue;
        specs.push({ file, dir, name, chapter: `${path.posix.dirname(dir)}/${m[1]}.md`, ordinal: Number(m[2]), type: m[3] });
    }
    for (const spec of specs) {
        const index = indexes.get(spec.dir);
        const hit = Object.entries(index?.entries ?? {}).find(([, e]) => e?.spec === spec.name);
        spec.hash = hit?.[0] ?? null;
        spec.artifact = hit?.[1]?.artifact ?? null;
        spec.indexUnread = indexes.has(spec.dir) && indexes.get(spec.dir) === null;
    }
    return { specs, indexes };
}

export async function run(root, { check = false, log = console.log } = {}) {
    const out = { work: 0, failed: false, lines: [] };
    const say = (line) => { out.lines.push(line); log(line); };
    const done = (line) => { say(`${ID}: ${line}`); return out; };

    if (!(await exists(path.join(root, STAMP)))) return done("nothing to do — no stamp.");
    const config = JSON.parse((await readFile(path.join(root, STAMP), "utf8")).replace(/^﻿/, ""));
    const devbook = config?.components?.devbook;
    if (!devbook) return done("nothing to do — no components.devbook stamp.");
    if (!(devbook.adopted ?? []).includes("arc42")) return done("not-applicable — `arc42` is not adopted.");

    const writes = new Map(); // repo path → text
    const deletes = new Set();
    const work = (line) => { out.work++; say(`- ${line}`); };
    const report = (line) => say(`- report ${line}`);
    const verb = (now, then) => (check ? now : then);

    // 1. the workspace: moved from `_c4/`, else created
    const files = new Map();
    const hasWorkspace = await exists(path.join(root, WORKSPACE));
    const oldFiles = (await walk(root, OLD_FOLDER.slice(0, -1))).filter((f) => f.startsWith(OLD_FOLDER));
    const oldDsl = oldFiles.filter((f) => /\.dsl$/i.test(f));
    // A model left behind in `_c4/` is the person's: no diagram converts into a skeleton beside it.
    let stranded = false;
    if (hasWorkspace) {
        files.set(WORKSPACE, await readFile(path.join(root, WORKSPACE), "utf8"));
        if (oldDsl.length) report(`${oldDsl.join(", ")} beside ${WORKSPACE}: the workspace is already there, so nothing was moved; fold what these add into it by hand and delete them.`);
    } else if (oldDsl.length) {
        const texts = new Map();
        for (const f of oldDsl) texts.set(f, await readFile(path.join(root, f), "utf8"));
        const mains = oldDsl.filter((f) => /^\s*workspace\b/m.test(texts.get(f).replace(/\/\*[\s\S]*?\*\//g, "")));
        const moves = oldDsl.map((f) => [f, f === mains[0] ? WORKSPACE : `${INCLUDE_FOLDER}${f.slice(OLD_FOLDER.length)}`]);
        const taken = [];
        for (const [, to] of moves) if (to !== WORKSPACE && (await exists(path.join(root, to)))) taken.push(to);
        if (mains.length !== 1) {
            report(`${oldDsl.join(", ")}: ${mains.length ? "more than one" : "none"} of them opens a \`workspace\`, so nothing was moved and no diagram converted; move the workspace to ${WORKSPACE} by hand and run this again.`);
            stranded = true;
            out.failed = true; // the ledger must not record a run that moved nothing it was owed
        } else if (taken.length) {
            report(`${taken.join(", ")} already exist, so ${oldDsl.join(", ")} were not moved over them and no diagram converted; merge the two by hand and run this again.`);
            stranded = true;
            out.failed = true; // the ledger must not record a run that moved nothing it was owed
        } else {
            // Every `!include` that pointed into `_c4/` follows its file into `c4/`.
            const follow = (from, text) => text.replace(/^(\s*!include\s+)(?:"([^"]+)"|(\S+))/gim, (all, head, quoted, bare) => {
                const target = quoted ?? bare;
                if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) return all;
                const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from), target.replace(/\\/g, "/")));
                if (!resolved.startsWith(OLD_FOLDER)) return all;
                const to = moves.find(([f]) => f === resolved)?.[1] ?? `${INCLUDE_FOLDER}${resolved.slice(OLD_FOLDER.length)}`;
                const relative = path.posix.relative(path.posix.dirname(moves.find(([f]) => f === from)[1]), to);
                return `${head}${quoted !== undefined ? `"${relative}"` : relative}`;
            });
            for (const [from, to] of moves) {
                const text = follow(from, texts.get(from));
                files.set(to, text);
                writes.set(to, text);
                deletes.add(from);
                work(`${verb("move", "moved")} ${from} → ${to}`);
            }
            if (!/^\s*!identifiers\s+hierarchical\b/m.test(files.get(WORKSPACE))) report(`${WORKSPACE} does not declare \`!identifiers hierarchical\`; add it as the workspace's first statement and qualify the identifiers it changes — no script can tell which a relationship meant.`);
        }
    }
    if (!stranded) for (const f of oldFiles.filter((x) => !/\.dsl$/i.test(x))) report(`${f} stays: it is no workspace file. A chapter now embeds a view as \`![…](c4:<key>)\`; carry what it records into the chapters and delete it.`);
    if (!files.has(WORKSPACE) && !stranded) {
        const text = skeleton(config.id ?? path.basename(root));
        files.set(WORKSPACE, text);
        writes.set(WORKSPACE, text);
        work(`${verb("create", "created")} ${WORKSPACE}`);
    }
    if (!stranded) {
        for (const f of await walk(root, INCLUDE_FOLDER.slice(0, -1))) if (!files.has(f)) files.set(f, await readFile(path.join(root, f), "utf8"));

        const model = new Model(files);
        // Problems compared as a multiset by file and message: lines move when text is added.
        const tally = (problems) => problems.reduce((m, p) => m.set(`${p.file}|${p.message}`, (m.get(`${p.file}|${p.message}`) ?? 0) + 1), new Map());
        const baseline = tally(model.reading.problems);

        // 2. chapters and Archify specs
        const chapterPaths = (await walk(root, ARC42.slice(0, -1))).filter((f) => f.endsWith(".md") && !/\/_(archify|c4)\//.test(f));
        const chapters = new Map();
        for (const p of chapterPaths) {
            const text = await readFile(path.join(root, p), "utf8");
            const firstMeta = /^```meta\s*$([\s\S]*?)^```\s*$/m.exec(text);
            const isIndex = !!firstMeta && /^index:\s*root\s*$/m.test(firstMeta[1]);
            chapters.set(p, { text, isIndex, fences: scanFences(text), replace: new Map() });
        }
        const { specs, indexes } = await archifySpecs(root);
        const specFor = new Map(); // `${chapter}#${fence.start}` → spec
        for (const spec of specs) {
            if (!["architecture", "sequence"].includes(spec.type)) {
                report(`${spec.file}: a \`${spec.type}\` spec draws state or flow inside one element, which has no C4 view; keep it as a Mermaid fence in its chapter, or draw it as a view if it crosses elements, then delete the spec.`);
                continue;
            }
            const chapter = chapters.get(spec.chapter);
            // The hash the index files it under decides; the ordinal only where there is none to read.
            // A hash that matches no fence means the fence moved on since the spec was drawn.
            const fence = chapter && (spec.hash ? chapter.fences.find((f) => fenceHash(f.body) === spec.hash) : chapter.fences.find((f) => f.ordinal === spec.ordinal));
            if (!fence) { report(`${spec.file}: ${spec.hash ? "its fence in " + spec.chapter + " changed since it was drawn, or is gone" : "no Mermaid fence in " + spec.chapter + " matches it"}, so there is no place to embed its view; draw it in the workspace by hand and delete the spec.`); continue; }
            spec.fence = fence;
            const twin = specFor.get(`${spec.chapter}#${fence.start}`);
            if (twin) { report(`${spec.file} and ${twin.file} both re-draw ${spec.chapter}:${fence.start + 1}; neither was read — delete the one that is stale and run this again.`); twin.fence = null; spec.fence = null; specFor.set(`${spec.chapter}#${fence.start}`, null); continue; }
            if (specFor.has(`${spec.chapter}#${fence.start}`)) { report(`${spec.file} also re-draws ${spec.chapter}:${fence.start + 1}, which more than one spec claims; it was not read.`); continue; }
            if (spec.indexUnread) report(`${spec.dir}/index.json could not be read, so ${spec.file} was tied to its fence by its ordinal alone and its index entry stays.`);
            specFor.set(`${spec.chapter}#${fence.start}`, spec);
        }
        const retire = (spec, why) => {
            deletes.add(spec.file);
            // The artifact is named by the index; only a bare file name beside the spec is deleted.
            if (spec.artifact && /^[^/\\]+$/.test(spec.artifact) && spec.artifact !== "." && spec.artifact !== "..") deletes.add(`${spec.dir}/${spec.artifact}`);
            spec.retired = true;
            work(`${verb("delete", "deleted")} ${spec.file} — ${why}`);
        };

        const keyFor = (chapter, fence) => model.uniqueKey(fence.trail.at(-1)?.slug || path.posix.basename(chapter, ".md"));
        const embed = (chapter, fence, view, source) => {
            const alt = String(view.title ?? fence.trail.at(-1)?.text ?? view.key).replace(/[[\]]/g, "");
            chapters.get(chapter).replace.set(fence.start, { end: fence.end, line: `${fence.indent}![${alt}](c4:${view.key})` });
            model.addView(view);
            work(`${verb("convert", "converted")} ${chapter}:${fence.start + 1} ${source} → \`${view.kind}\` view \`${view.key}\``);
            // A workspace moved from `_c4/` often already draws the same picture.
            const twin = model.reading.views.find((v) => v.kind === view.kind && lower(v.scope ?? "") === lower(view.scope ?? "") && (view.kind !== "deployment" || lower(v.environment) === lower(view.environment)));
            if (twin) report(`${WORKSPACE} already held \`${twin.kind}\` view \`${twin.key}\` of the same scope as \`${view.key}\`; keep the one that says what the chapter means, point the embed at it, and delete the other.`);
        };

        // One fence: its Mermaid first, else the Archify spec that re-draws it.
        const attempt = (chapter, fence, pass) => {
            const c = chapters.get(chapter);
            const at = `${chapter}:${fence.start + 1}`;
            const spec = specFor.get(`${chapter}#${fence.start}`);
            const keyword = mermaidKeyword(fence.body);
            const isC4 = C4_KEYWORDS.includes(keyword);
            const isSequence = keyword === "sequenceDiagram";
            // Pass 1 converts C4 fences and architecture specs; pass 2, once the model holds
            // them, sequences — whose participants must match what pass 1 added.
            const sources = [];
            if (pass === 1 ? isC4 : isSequence) sources.push({ name: `Mermaid \`${keyword}\``, read: () => (isC4 ? parseMermaidC4(fence.body) : parseSequence(fence.body)) });
            const specPass = spec?.type === "architecture" ? 1 : 2;
            if (spec?.json && specPass === pass && !(isC4 && pass === 2) && !(isSequence && pass === 1)) {
                sources.push({ name: `Archify ${spec.type} spec ${spec.name}`, spec: true, read: () => (spec.type === "sequence" ? parseArchifySequence(spec.json) : parseArchifyArchitecture(spec.json)) });
            }
            if (!sources.length) return;

            for (const source of sources) {
                let diagram;
                try { diagram = source.read(); } catch (error) { report(`${at}: ${source.name} could not be read — ${error.message}`); continue; }
                // An architecture spec draws whatever level its chapter documents: context in
                // 03, containers or components in 05 and a building block. It never draws
                // deployment, so one anywhere else is a person's to place.
                if (source.spec && spec.type === "architecture") {
                    if (homeFits("C4Context", chapter, fence.trail, c.isIndex).fits) diagram.keyword = "C4Context";
                    else if (homeFits("C4Container", chapter, fence.trail, c.isIndex).fits) diagram.keyword = "C4Container";
                    else { report(`${at}: ${source.name} draws architecture in a chapter that holds no context, container, or component view; draw it in the workspace by hand and delete the spec.`); continue; }
                }
                const kw = diagram.keyword;
                if (!FAMILY[kw]) { report(`${at}: ${source.name} is no diagram this migration converts.`); continue; }
                const place = homeFits(kw, chapter, fence.trail, c.isIndex);
                // A sequence between things that are no elements draws inside one: it stays where it is.
                const strangers = kw === "sequenceDiagram" && !place.fits && !diagram.problems.length ? matchParticipants(diagram, model).unmatched : [];
                if (strangers.length) { report(`${at}: ${source.name} is left as it is — ${strangers.join(", ")} match no workspace element, so it draws inside one element and may stay.`); continue; }
                if (!place.fits) { report(`${at}: ${source.name} would be a view that belongs in ${place.says}; move the diagram there and run this again.`); return; }
                if (diagram.problems.length) { report(`${at}: ${source.name} is left as it is — ${clauses(diagram.problems)}`); continue; }
                const m = model.mark();
                const key = keyFor(chapter, fence);
                const result = kw === "sequenceDiagram" ? convertSequence(diagram, model, key) : convertStatic(diagram, model, key, { loose: !!source.spec });
                if (!result.view) {
                    model.rollback(m);
                    if (result.unmatched) report(`${at}: ${source.name} is left as it is — ${result.unmatched.join(", ")} match no workspace element; add them to the workspace, or keep the sequence if it draws inside one element.`);
                    else report(`${at}: ${source.name} is left as it is — ${clauses(result.problems)}`);
                    continue;
                }
                embed(chapter, fence, result.view, source.name);
                if (spec) retire(spec, source.spec ? "converted into the workspace" : `it re-drew the fence at ${at}, now converted`);
                return;
            }
        };

        for (const spec of specs.filter((s) => s.fence)) {
            try { spec.json = JSON.parse((await readFile(path.join(root, spec.file), "utf8")).replace(/^﻿/, "")); }
            catch (error) { report(`${spec.file} is not valid JSON, so it was not read — ${error.message}`); }
        }
        for (const pass of [1, 2]) for (const [chapter, c] of chapters) for (const fence of c.fences) if (!c.replace.has(fence.start)) attempt(chapter, fence, pass);
        // Every element a conversion created, for a person to check the match it did not make.
        for (const e of model.elements.filter((x) => x.isNew)) say(`- ${verb("add", "added")} ${e.kind} \`${e.id}\`${e.name ? ` "${e.name}"` : ""}`);
        for (const note of model.notes) report(note);

        // 3. the workspace, read back before anything is written
        if (model.changed) {
            const { files: rendered, problems } = model.render();
            const after = rendered.has(WORKSPACE) ? readFromFiles(rendered) : null;
            const seen = new Map();
            const added = (after?.problems ?? []).filter((p) => { const k = `${p.file}|${p.message}`; seen.set(k, (seen.get(k) ?? 0) + 1); return seen.get(k) > (baseline.get(k) ?? 0); });
            if (problems.length || added.length) {
                for (const p of problems) say(`- error ${p}`);
                for (const p of added) say(`- error ${p.file}:${p.line} ${p.message}`);
                out.failed = true;
                return done("stopped — the converted workspace would not read clean; nothing was written.");
            }
            for (const [file, text] of rendered) if (text !== files.get(file) || writes.has(file)) writes.set(file, text);
        }
        for (const [chapter, c] of chapters) {
            if (!c.replace.size) continue;
            const eol = c.text.includes("\r\n") ? "\r\n" : "\n";
            const lines = c.text.split(/\r?\n/);
            for (const [start, { end, line }] of [...c.replace].sort((a, b) => b[0] - a[0])) lines.splice(start, end - start + 1, line);
            writes.set(chapter, lines.join(eol));
        }
        for (const [dir, index] of indexes) {
            const retired = specs.filter((s) => s.dir === dir && s.retired).map((s) => s.name);
            if (!retired.length || !index?.entries) continue;
            for (const [hash, entry] of Object.entries(index.entries)) if (retired.includes(entry?.spec)) delete index.entries[hash];
            if (Object.keys(index.entries).length) writes.set(`${dir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
            else deletes.add(`${dir}/index.json`);
        }
    }

    // 4. debt records — `status` only on the built-in ladder: a repository's own is its to apply
    let ownLadder = false;
    try {
        const statuses = JSON.parse((await readFile(path.join(root, ".devbook/statuses.json"), "utf8")).replace(/^﻿/, ""));
        ownLadder = (statuses?.folders?.arc42?.rules ?? []).some((rule) => (rule?.files ?? []).length > 0 && rule.files.every((glob) => /^(?:\.\/)?tdr\//.test(String(glob).replace(/\\/g, "/"))));
    } catch { /* no file, or one the checker reports */ }
    if (ownLadder) report("`.devbook/statuses.json` gives `tdr/` a ladder of its own, so no debt record's `status` was set; set each by hand.");
    for (const file of (await walk(root, DEBT_FOLDER.slice(0, -1))).filter((f) => f.endsWith(".md"))) {
        const text = await readFile(path.join(root, file), "utf8");
        const result = migrateDebtRecord(text, { status: !ownLadder });
        if (result.index) continue;
        for (const r of result.reports) report(`${file}: ${r}; set it by hand.`);
        if (result.markdown !== text) { writes.set(file, result.markdown); work(`set ${result.set.join(", ")} on ${file}`); }
    }

    if (check) {
        if (!out.work) return done("no work left — every diagram it can move is in the workspace.");
        return out;
    }
    for (const [file, text] of writes) {
        await mkdir(path.dirname(path.join(root, file)), { recursive: true });
        await writeFile(path.join(root, file), text, "utf8");
    }
    for (const file of deletes) if (!writes.has(file)) await rm(path.join(root, file), { force: true });
    for (const dir of new Set([...deletes].map((f) => path.posix.dirname(f)))) {
        try { await rmdir(path.join(root, dir)); } catch { /* not empty: something is left for a person */ }
    }
    return done(out.work ? `applied; ${out.work} change(s).` : "nothing to do — every diagram it can move is in the workspace.");
}

async function main(argv) {
    const at = argv.indexOf("--root");
    const root = path.resolve(at >= 0 ? argv[at + 1] : process.cwd());
    const result = await run(root, { check: argv.includes("--check") });
    process.exit(result.failed || (argv.includes("--check") && result.work) ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
