// render.mjs — draws the views of a C4 workspace as SVG.
//
// The C4 model decision commits one SVG per view beside the `c4:<key>` embed, for
// a reader on GitHub or any viewer that knows no C4. This module takes the
// model devbook's `c4.mjs` reads — never a parser of its own — and draws each
// systemLandscape, systemContext, container, and component view: a layered
// layout along the relationships, the scope as a boundary, groups as labelled
// bands, a shape per element kind and tag, relationship labels, and a legend.
// A dynamic view is laid out the same way along its steps, one arrow per step
// labelled with its number, in step order. A deployment view draws one
// environment: its deployment nodes as nested boxes, each holding the
// infrastructure nodes and instances deployed on it, and the relationships the
// instances inherit from what they instantiate.
//
// Deterministic: the same model gives the same bytes. Every coordinate is a
// whole number, every order comes from the model's own order, and nothing reads
// the clock, the locale, or the environment, so a refresh moves a file only when
// its view changed.
//
// Colours and fonts are SVG presentation attributes, which every viewer honours;
// a `<style>` inside the SVG overrides them under `prefers-color-scheme: dark`.
//
// Zero dependencies beyond Node.
//
// Run: `node render.mjs <workspace.dsl> <out folder>` brings the folder level
// with the workspace — `<view key>.svg` per drawable view, written only when it
// changed, and every other `.svg` deleted — and exits 1 when the workspace has a
// problem. `--check` writes nothing and exits 1 on a render that is missing,
// stale, or names no view. devbook-derived's refresh paths run it as
// `node .devbook/_tools/c4-render/render.mjs .devbook/arc42/workspace.dsl .devbook/arc42/_meta/c4`.

import { access, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STATIC_KINDS = ["systemLandscape", "systemContext", "container", "component"];
export const KINDS = [...STATIC_KINDS, "dynamic", "deployment"];

// ── palette ─────────────────────────────────────────────────────────────────

// Light values are the attributes; dark values are the stylesheet's override.
const STYLES = {
    person: { label: "Person", light: ["#08427b", "#052e56", "#ffffff"], dark: ["#1d5c99", "#6ea2d8", "#ffffff"] },
    softwareSystem: { label: "Software System", light: ["#1168bd", "#0b4884", "#ffffff"], dark: ["#1b6ec2", "#78aee6", "#ffffff"] },
    container: { label: "Container", light: ["#438dd5", "#2e6295", "#ffffff"], dark: ["#2f73b5", "#8dbbea", "#ffffff"] },
    component: { label: "Component", light: ["#85bbf0", "#5d82a8", "#0b2540"], dark: ["#2a5d8f", "#9cc4ee", "#ffffff"] },
    external: { label: "External", light: ["#8c959f", "#6e7781", "#ffffff"], dark: ["#484f58", "#8b949e", "#ffffff"] },
    infrastructureNode: { label: "Infrastructure Node", light: ["#ffffff", "#6e7781", "#1f2328"], dark: ["#161b22", "#8b949e", "#e6edf3"] },
};
const PAGE = {
    light: { bg: "#ffffff", ink: "#1f2328", muted: "#59636e", line: "#57606a" },
    dark: { bg: "#0d1117", ink: "#e6edf3", muted: "#9198a1", line: "#9198a1" },
};
const FONT = "Segoe UI, Helvetica, Arial, sans-serif";

// ── geometry ────────────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 150;
const RANK_SEP = 140;
const NODE_SEP = 60;
const BAND_GAP = 48;
const REGION_GAP = 96;
const BAND_PAD = 16;
const BAND_TOP = 28;
const BOUNDARY_PAD = 20;
const BOUNDARY_TOP = 32;
const MARGIN = 32;
// A deployment node's own room around what it holds: a header strip for its
// name and technology, and padding on every other side.
const NEST_TOP = 48;
const NEST_PAD = 16;

// ── text ────────────────────────────────────────────────────────────────────

// XML 1.0 forbids most control characters even escaped, so they are dropped.
const escape = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const n = (v) => String(Math.round(v));

// Greedy word wrap to `max` characters, at most `lines` lines; the last line
// that does not fit ends in an ellipsis.
export function wrap(text, max, lines) {
    if (!text) return [];
    const words = String(text).replace(/\s+/g, " ").trim().split(" ");
    const out = [];
    let line = "";
    for (const word of words) {
        const piece = word.length > max ? `${word.slice(0, max - 1)}…` : word;
        if (!line) line = piece;
        else if (line.length + 1 + piece.length <= max) line += ` ${piece}`;
        else { out.push(line); line = piece; }
    }
    if (line) out.push(line);
    if (out.length <= lines) return out;
    const kept = out.slice(0, lines);
    const last = kept[lines - 1];
    kept[lines - 1] = last.length >= max ? `${last.slice(0, max - 1)}…` : `${last}…`;
    return kept;
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const textWidth = (text, size) => Math.ceil(text.length * size * 0.56);

// ── selection ───────────────────────────────────────────────────────────────

const KIND_LABEL = { person: "Person", softwareSystem: "Software System", container: "Container", component: "Component" };
const NODE_LABEL = { infrastructureNode: "Infrastructure Node", deploymentNode: "Deployment Node" };
const ALLOWED = {
    systemLandscape: ["person", "softwareSystem"],
    systemContext: ["person", "softwareSystem"],
    container: ["person", "softwareSystem", "container"],
    component: ["person", "softwareSystem", "container", "component"],
};
const DEFAULT_TITLE = { systemLandscape: "System Landscape", systemContext: "System Context", container: "Container", component: "Component", dynamic: "Dynamic", deployment: "Deployment" };

const hasTag = (element, tag) => element.tags.some((t) => t.toLowerCase() === tag);

class Model {
    constructor(model) {
        this.model = model;
        this.elements = model.elements.filter((e) => !e.environment && KIND_LABEL[e.kind]);
        this.byId = new Map(this.elements.map((e) => [e.id, e]));
        this.order = new Map(this.elements.map((e, i) => [e.id, i]));
    }

    // The element and every ancestor, innermost first.
    chain(id) {
        const out = [];
        let e = this.byId.get(id);
        while (e) { out.push(e.id); e = e.parent ? this.byId.get(e.parent) : null; }
        return out;
    }

    within(id, outer) { return this.chain(id).includes(outer); }

    // Whether a relationship joins `a`, or an element inside it, and `b`, or an element inside it, either way.
    connected(a, b) {
        return this.model.relationships.some((r) =>
            (this.within(r.source, a) && this.within(r.destination, b)) || (this.within(r.source, b) && this.within(r.destination, a)));
    }
}

// The elements a view shows, in model order: Structurizr's rules for `include *`,
// then each included identifier, less each excluded one.
export function selectElements(model, view) {
    const m = model instanceof Model ? model : new Model(model);
    const allowed = new Set(ALLOWED[view.kind]);
    const scope = view.scope ? m.byId.get(view.scope) : null;
    const chosen = new Set();
    const add = (e) => { if (e && allowed.has(e.kind)) chosen.add(e.id); };
    const top = m.elements.filter((e) => e.kind === "person" || e.kind === "softwareSystem");

    for (const item of view.include) {
        if (item === "*") {
            if (view.kind === "systemLandscape") top.forEach(add);
            else if (view.kind === "systemContext" && scope) {
                add(scope);
                top.filter((e) => e.id !== scope.id && m.connected(e.id, scope.id)).forEach(add);
            } else if (scope) {
                const inside = m.elements.filter((e) => e.parent === scope.id);
                inside.forEach(add);
                // A component view's neighbours are its own system's other containers
                // and the people and systems outside it; never another system's container.
                const neighbours = view.kind === "component"
                    ? [...top, ...m.elements.filter((e) => e.kind === "container" && e.parent === scope.parent && e.id !== scope.id)]
                    : top;
                for (const e of neighbours) {
                    if (m.within(scope.id, e.id) || m.within(e.id, scope.id)) continue;
                    if (inside.some((i) => m.connected(e.id, i.id))) add(e);
                }
            }
            continue;
        }
        const element = m.byId.get(item);
        if (element) { add(element); continue; }
        const relationship = m.model.relationships.find((r) => r.id === item);
        if (relationship) { add(m.byId.get(relationship.source)); add(m.byId.get(relationship.destination)); }
    }
    for (const item of view.exclude) chosen.delete(item);
    // The scope and what holds it are the boundary, never a box inside it.
    if (scope && view.kind !== "systemContext") for (const id of m.chain(scope.id)) chosen.delete(id);
    return [...chosen].sort((a, b) => m.order.get(a) - m.order.get(b)).map((id) => m.byId.get(id));
}

// Collects relationships into one line per ordered pair of shown elements, in
// the order each pair's first relationship appears in the model: the direct ones
// as written, otherwise the first implied one.
class Pairs {
    constructor() { this.pairs = new Map(); }

    add(source, destination, relationship, index, direct) {
        const key = `${source}\u0000${destination}`;
        if (!this.pairs.has(key)) this.pairs.set(key, { source, destination, index, direct: [], implied: [] });
        (direct ? this.pairs.get(key).direct : this.pairs.get(key).implied).push(relationship);
    }

    lines() {
        return [...this.pairs.values()]
            .sort((x, y) => x.index - y.index)
            .map((p) => ({ source: p.source, destination: p.destination, relationships: p.direct.length ? p.direct : p.implied.slice(0, 1), implied: !p.direct.length }));
    }
}

// One line per pair of shown elements: the relationships drawn between them,
// direct ones as written, otherwise the first implied one.
export function selectRelationships(model, view, shown) {
    const m = model instanceof Model ? model : new Model(model);
    const visible = new Set(shown.map((e) => e.id));
    const excluded = new Set(view.exclude);
    const nearest = (id) => m.chain(id).find((x) => visible.has(x)) ?? null;
    const pairs = new Pairs();
    m.model.relationships.forEach((r, index) => {
        if (r.id && excluded.has(r.id)) return;
        const a = nearest(r.source);
        const b = nearest(r.destination);
        if (!a || !b || a === b || m.within(a, b) || m.within(b, a)) return;
        pairs.add(a, b, r, index, r.source === a && r.destination === b);
    });
    return pairs.lines();
}

// A dynamic view: the elements its steps name, in model order, and one line per
// step in step order, numbered. A step whose end the reader could not resolve,
// or that runs from an element to itself, is not drawn.
export function selectSteps(model, view) {
    const m = model instanceof Model ? model : new Model(model);
    const drawn = view.steps.filter((s) => m.byId.has(s.source) && m.byId.has(s.destination) && s.source !== s.destination);
    const ids = new Set(drawn.flatMap((s) => [s.source, s.destination]));
    const shown = [...ids].sort((a, b) => m.order.get(a) - m.order.get(b)).map((id) => m.byId.get(id));
    const lines = drawn.map((s) => ({ source: s.source, destination: s.destination, relationships: [{ description: s.description, technology: s.technology }], implied: false, step: s.order }));
    return { shown, lines };
}

const LEAF_KINDS = new Set(["infrastructureNode", "softwareSystemInstance", "containerInstance"]);

// A deployment view: the infrastructure nodes and instances of its environment
// that `include *`, `include <id>`, and `exclude` give it, the deployment nodes
// that hold them, and one line per pair of shown leaves. An instance is drawn as
// what it instantiates, with that element's tags; a deployment node shows only
// when it holds a shown leaf. Lines are the relationships declared between the
// leaves themselves and the ones each instance inherits from the element it
// instantiates, in model order — direct as written, otherwise the first implied
// one. A relationship to or from a deployment node is not drawn.
export function selectDeployment(model, view) {
    const m = model instanceof Model ? model : new Model(model);
    const env = m.model.elements.filter((e) => e.environment && e.environment === view.environment);
    const byId = new Map(env.map((e) => [e.id, e]));
    const scope = view.scope && view.scope !== "*" ? m.byId.get(view.scope) ?? null : null;
    const leaves = env.filter((e) => LEAF_KINDS.has(e.kind) && (e.kind === "infrastructureNode" || m.byId.has(e.instanceOf)));
    const below = (id) => leaves.filter((e) => { for (let p = e; p; p = p.parent ? byId.get(p.parent) : null) if (p.id === id) return true; return false; });
    const inScope = (e) => !scope || e.kind === "infrastructureNode" || (e.kind === "containerInstance" && m.byId.get(e.instanceOf).parent === scope.id);
    const chosen = new Set();
    for (const item of view.include) {
        if (item === "*") { leaves.filter(inScope).forEach((e) => chosen.add(e.id)); continue; }
        // A leaf named outright is shown whatever the scope; a node brings what it holds in scope.
        if (leaves.some((e) => e.id === item)) chosen.add(item);
        else below(item).filter(inScope).forEach((e) => chosen.add(e.id));
    }
    for (const item of view.exclude) below(item).forEach((e) => chosen.delete(e.id));
    const shownLeaves = leaves.filter((e) => chosen.has(e.id));

    const shown = shownLeaves.map((e) => {
        if (e.kind === "infrastructureNode") return e;
        const target = m.byId.get(e.instanceOf);
        return { ...e, kind: target.kind, name: e.name ?? target.name, tags: [...target.tags, ...e.tags.filter((t) => !target.tags.includes(t))] };
    });
    const holders = new Set();
    for (const e of shownLeaves) for (let p = e.parent ? byId.get(e.parent) : null; p; p = p.parent ? byId.get(p.parent) : null) holders.add(p.id);
    const nodes = env.filter((e) => e.kind === "deploymentNode" && holders.has(e.id));

    const excluded = new Set(view.exclude);
    const visible = new Set(shownLeaves.map((e) => e.id));
    const instances = shownLeaves.filter((e) => e.kind !== "infrastructureNode");
    const pairs = new Pairs();
    m.model.relationships.forEach((r, index) => {
        if (r.id && excluded.has(r.id)) return;
        if (visible.has(r.source) && visible.has(r.destination)) { if (r.source !== r.destination) pairs.add(r.source, r.destination, r, index, true); return; }
        if (!m.byId.has(r.source) || !m.byId.has(r.destination)) return;
        for (const a of instances) {
            if (!m.within(r.source, a.instanceOf)) continue;
            for (const b of instances) {
                if (a === b || !m.within(r.destination, b.instanceOf)) continue;
                if (m.within(a.instanceOf, b.instanceOf) || m.within(b.instanceOf, a.instanceOf)) continue;
                pairs.add(a.id, b.id, r, index, r.source === a.instanceOf && r.destination === b.instanceOf);
            }
        }
    });
    return { shown, nodes, lines: pairs.lines() };
}

// ── layout ──────────────────────────────────────────────────────────────────

// Ranks by longest path after reversing the back edges a depth-first walk in
// model order finds, so a cycle still lays out and always the same way.
function rank(count, edges) {
    const out = Array.from({ length: count }, () => []);
    edges.forEach(([a, b]) => out[a].push(b));
    const state = new Array(count).fill(0);
    const forward = [];
    const visit = (v) => {
        state[v] = 1;
        for (const w of out[v]) {
            if (state[w] === 1) forward.push([w, v]);
            else { forward.push([v, w]); if (state[w] === 0) visit(w); }
        }
        state[v] = 2;
    };
    for (let v = 0; v < count; v++) if (state[v] === 0) visit(v);
    const ranks = new Array(count).fill(0);
    for (let pass = 0; pass < count; pass++) {
        let moved = false;
        for (const [a, b] of forward) if (ranks[b] < ranks[a] + 1) { ranks[b] = ranks[a] + 1; moved = true; }
        if (!moved) break;
    }
    return ranks;
}

// Barycentre ordering within each rank, four sweeps each way, ties kept in place.
function order(ranks, edges) {
    const depth = Math.max(0, ...ranks) + 1;
    const layers = Array.from({ length: depth }, () => []);
    ranks.forEach((r, v) => layers[r].push(v));
    const neighbours = ranks.map(() => []);
    edges.forEach(([a, b]) => { neighbours[a].push(b); neighbours[b].push(a); });
    const position = new Array(ranks.length).fill(0);
    const place = () => layers.forEach((layer) => layer.forEach((v, i) => { position[v] = (i + 1) / (layer.length + 1); }));
    place();
    for (let sweep = 0; sweep < 8; sweep++) {
        const down = sweep % 2 === 0;
        const sequence = down ? layers.map((_, i) => i) : layers.map((_, i) => depth - 1 - i);
        for (const r of sequence) {
            const layer = layers[r];
            const keyed = layer.map((v, i) => {
                const near = neighbours[v].filter((w) => (down ? ranks[w] < r : ranks[w] > r));
                const bary = near.length ? near.reduce((s, w) => s + position[w], 0) / near.length : position[v];
                return { v, bary, i };
            });
            keyed.sort((x, y) => x.bary - y.bary || x.i - y.i);
            layers[r] = keyed.map((k) => k.v);
            layers[r].forEach((v, i) => { position[v] = (i + 1) / (layers[r].length + 1); });
        }
    }
    return layers;
}

// What every layout starts from: each node's rank and its order within the
// rank, along the view's direction and spacing.
function ranked(view, nodes, lines) {
    const index = new Map(nodes.map((node, i) => [node.element.id, i]));
    const edges = lines.map((l) => [index.get(l.source), index.get(l.destination)]);
    const ranks = rank(nodes.length, edges);
    const direction = view.autolayout?.direction ?? "tb";
    const vertical = direction === "tb" || direction === "bt";
    return {
        index, ranks, layers: order(ranks, edges), direction, vertical,
        slotSize: vertical ? NODE_W : NODE_H,
        rankSize: vertical ? NODE_H : NODE_W,
        nodeSep: view.autolayout?.nodeSeparation ?? NODE_SEP,
    };
}

// Positions every node, band, and the boundary. Regions run along the slot axis
// — people outside the scope, the scope, everything else outside it — and each
// region splits into one band per group, so bands and the boundary never overlap.
// `regions` is false where nothing is a boundary's, and everything is one region.
function layout(view, nodes, lines, regions) {
    const { index, ranks, layers, direction, vertical, slotSize, rankSize, nodeSep } = ranked(view, nodes, lines);
    const rankSep = view.autolayout?.rankSeparation ?? RANK_SEP;

    const regionOf = (node) => (regions && !node.inside ? (node.element.kind === "person" ? 0 : 2) : 1);
    const bandNames = [];
    for (const node of nodes) if (node.element.group && !bandNames.includes(node.element.group)) bandNames.push(node.element.group);
    const bandOf = (node) => (node.element.group ? bandNames.indexOf(node.element.group) + 1 : 0);

    const bands = new Map();
    for (const node of nodes) {
        const key = `${regionOf(node)}:${bandOf(node)}`;
        if (!bands.has(key)) bands.set(key, { region: regionOf(node), band: bandOf(node), group: node.element.group ?? null, inside: node.inside, perRank: new Map() });
        const band = bands.get(key);
        band.perRank.set(ranks[index.get(node.element.id)], (band.perRank.get(ranks[index.get(node.element.id)]) ?? 0) + 1);
    }
    const sortedBands = [...bands.values()].sort((a, b) => a.region - b.region || a.band - b.band);
    let cursor = 0;
    let lastRegion = null;
    for (const band of sortedBands) {
        if (lastRegion !== null) cursor += band.region === lastRegion ? BAND_GAP : REGION_GAP;
        const slots = Math.max(...band.perRank.values());
        band.start = cursor;
        band.span = slots * slotSize + (slots - 1) * nodeSep;
        cursor += band.span + nodeSep;
        lastRegion = band.region;
    }

    const maxRank = Math.max(0, ...ranks);
    for (let r = 0; r < layers.length; r++) {
        const layer = [...layers[r]].sort((a, b) => {
            const na = nodes[a];
            const nb = nodes[b];
            return regionOf(na) - regionOf(nb) || bandOf(na) - bandOf(nb) || layers[r].indexOf(a) - layers[r].indexOf(b);
        });
        for (const band of sortedBands) {
            const members = layer.filter((v) => regionOf(nodes[v]) === band.region && bandOf(nodes[v]) === band.band);
            const used = members.length * slotSize + (members.length - 1) * nodeSep;
            members.forEach((v, i) => {
                const slot = band.start + (band.span - used) / 2 + i * (slotSize + nodeSep);
                const along = (direction === "bt" || direction === "rl" ? maxRank - r : r) * (rankSize + rankSep);
                const node = nodes[v];
                node.rank = r;
                node.x = Math.round(vertical ? slot : along);
                node.y = Math.round(vertical ? along : slot);
                node.w = NODE_W;
                node.h = NODE_H;
            });
        }
    }

    const box = (items) => ({
        x: Math.min(...items.map((b) => b.x)),
        y: Math.min(...items.map((b) => b.y)),
        r: Math.max(...items.map((b) => b.x + b.w)),
        b: Math.max(...items.map((b) => b.y + b.h)),
    });
    const groupRects = [];
    for (const band of sortedBands) {
        if (!band.group) continue;
        const members = nodes.filter((node) => regionOf(node) === band.region && bandOf(node) === band.band);
        const b = box(members);
        groupRects.push({ name: band.group, inside: band.inside, x: b.x - BAND_PAD, y: b.y - BAND_TOP, w: b.r - b.x + 2 * BAND_PAD, h: b.b - b.y + BAND_TOP + BAND_PAD });
    }
    let boundary = null;
    const insiders = nodes.filter((node) => node.inside);
    if (insiders.length) {
        const b = box([...insiders, ...groupRects.filter((g) => g.inside)]);
        boundary = { x: b.x - BOUNDARY_PAD, y: b.y - BOUNDARY_TOP, w: b.r - b.x + 2 * BOUNDARY_PAD, h: b.b - b.y + BOUNDARY_TOP + BOUNDARY_PAD };
    }
    return { groupRects, boundary, vertical, rankSep };
}

// Positions a deployment view: leaves in ranks along their lines, as above, and
// each deployment node as a stretch of the slot axis — its own leaves first, then
// each node it holds, in model order — so sibling nodes never overlap and a node
// always holds its children. Along the rank axis a node spans its leaves' ranks,
// widened by its own room once per level it nests, so it clears every node
// inside it; the gap between ranks grows by that room too.
function layoutDeployment(view, nodes, lines, deploymentNodes) {
    const { index, ranks, layers, direction, vertical, slotSize, rankSize, nodeSep } = ranked(view, nodes, lines);

    const tree = new Map(deploymentNodes.map((e) => [e.id, { element: e, children: [], leaves: [] }]));
    const roots = [];
    for (const t of tree.values()) (t.element.parent && tree.has(t.element.parent) ? tree.get(t.element.parent).children : roots).push(t);
    for (const node of nodes) tree.get(node.element.parent)?.leaves.push(node);
    const height = (t) => (t.height ??= 1 + Math.max(0, ...t.children.map(height)));
    roots.forEach(height);
    const deepest = Math.max(0, ...roots.map((t) => t.height));
    // Rank-axis room per level: the header strip before and the padding after
    // when ranks run down the page, padding on both sides when they run across.
    const [before, after] = vertical ? [NEST_TOP, NEST_PAD] : [NEST_PAD, NEST_PAD];
    const rankSep = (view.autolayout?.rankSeparation ?? RANK_SEP) + deepest * (before + after);
    // Slot-axis room per level: the header strip when ranks run across.
    const [slotBefore, slotAfter] = vertical ? [NEST_PAD, NEST_PAD] : [NEST_TOP, NEST_PAD];

    const perRank = (members) => {
        const counts = new Map();
        for (const node of members) counts.set(ranks[index.get(node.element.id)], (counts.get(ranks[index.get(node.element.id)]) ?? 0) + 1);
        return Math.max(0, ...counts.values());
    };
    const allocate = (t, cursor) => {
        t.start = cursor;
        cursor += slotBefore;
        let first = true;
        if (t.leaves.length) {
            const slots = perRank(t.leaves);
            t.band = { start: cursor, span: slots * slotSize + (slots - 1) * nodeSep };
            cursor += t.band.span;
            first = false;
        }
        for (const child of t.children) {
            if (!first) cursor += nodeSep;
            cursor = allocate(child, cursor);
            first = false;
        }
        t.end = cursor + slotAfter;
        return t.end;
    };
    let cursor = 0;
    roots.forEach((t, i) => { cursor = allocate(t, i ? cursor + nodeSep : cursor); });

    const maxRank = Math.max(0, ...ranks);
    const holder = new Map(nodes.map((node) => [node, tree.get(node.element.parent)]));
    for (let r = 0; r < layers.length; r++) {
        for (const t of tree.values()) {
            if (!t.band) continue;
            const members = layers[r].filter((v) => holder.get(nodes[v]) === t);
            const used = members.length * slotSize + (members.length - 1) * nodeSep;
            members.forEach((v, i) => {
                const slot = t.band.start + (t.band.span - used) / 2 + i * (slotSize + nodeSep);
                const along = (direction === "bt" || direction === "rl" ? maxRank - r : r) * (rankSize + rankSep);
                const node = nodes[v];
                node.rank = r;
                node.x = Math.round(vertical ? slot : along);
                node.y = Math.round(vertical ? along : slot);
                node.w = NODE_W;
                node.h = NODE_H;
            });
        }
    }

    const rankOf = (node) => (vertical ? [node.y, node.y + node.h] : [node.x, node.x + node.w]);
    const held = (t) => [...t.leaves, ...t.children.flatMap(held)];
    const nodeRects = [];
    const place = (t, depth) => {
        const spans = held(t).map(rankOf);
        const lo = Math.min(...spans.map((s) => s[0])) - t.height * before;
        const hi = Math.max(...spans.map((s) => s[1])) + t.height * after;
        const [s0, s1] = [t.start, t.end];
        nodeRects.push({ element: t.element, depth, x: Math.round(vertical ? s0 : lo), y: Math.round(vertical ? lo : s0), w: Math.round(vertical ? s1 - s0 : hi - lo), h: Math.round(vertical ? hi - lo : s1 - s0) });
        t.children.forEach((c) => place(c, depth + 1));
    };
    roots.forEach((t) => place(t, 0));
    return { groupRects: [], boundary: null, nodeRects, vertical, rankSep };
}

// ── routing ─────────────────────────────────────────────────────────────────
//
// Every line is placed so it crosses no box. Between neighbouring ranks it is a
// curve that leaves and enters by the sides facing the gap between them, so it
// stays inside that gap. Within one rank it is a curve between facing sides when
// no box stands between the two, and otherwise runs out into the gap past the
// rank and back. A line that skips a rank runs out into the gap after its
// source, along it to a lane no box in the skipped ranks occupies, through the
// ranks in that lane, and into its destination from the gap before it. All of
// it is worked in rank and slot coordinates, so every autolayout direction
// routes the same way.

const toPoint = (vertical, slot, along) => (vertical ? [slot, along] : [along, slot]);

function route(nodes, lines, geometry) {
    const byId = new Map(nodes.map((node) => [node.element.id, node]));
    const { vertical, rankSep } = geometry;
    const rankOf = (box) => (vertical ? [box.y, box.y + box.h] : [box.x, box.x + box.w]);
    const slotOf = (box) => (vertical ? [box.x, box.x + box.w] : [box.y, box.y + box.h]);
    const centre = (box) => (slotOf(box)[0] + slotOf(box)[1]) / 2;
    for (const line of lines) {
        const a = byId.get(line.source);
        const b = byId.get(line.destination);
        const [a0, a1] = rankOf(a);
        const [b0, b1] = rankOf(b);
        if (a.rank === b.rank) {
            const lo = Math.min(slotOf(a)[1], slotOf(b)[1]);
            const hi = Math.max(slotOf(a)[0], slotOf(b)[0]);
            const between = nodes.some((node) => node.rank === a.rank && node !== a && node !== b && slotOf(node)[0] < hi && slotOf(node)[1] > lo);
            line.route = between
                ? { kind: "around", vertical, gap: Math.round(a1 + rankSep / 2) }
                : { kind: "beside", vertical, onward: centre(b) > centre(a) };
            continue;
        }
        const forward = b0 > a1;
        if (Math.abs(a.rank - b.rank) === 1) { line.route = { kind: "adjacent", vertical, forward }; continue; }
        const leave = forward ? a1 : a0;
        const enter = forward ? b0 : b1;
        const gapOut = forward ? leave + rankSep / 2 : leave - rankSep / 2;
        const gapIn = forward ? enter - rankSep / 2 : enter + rankSep / 2;
        const low = Math.min(leave, enter);
        const high = Math.max(leave, enter);
        const blocked = nodes
            .filter((node) => node !== a && node !== b && rankOf(node)[0] < high && rankOf(node)[1] > low)
            .map((node) => slotOf(node).map((v, i) => v + (i ? 16 : -16)))
            .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        const merged = [];
        for (const span of blocked) {
            const last = merged[merged.length - 1];
            if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
            else merged.push([...span]);
        }
        const want = (centre(a) + centre(b)) / 2;
        const all = nodes.map(slotOf);
        const candidates = [Math.min(...all.map((s) => s[0])) - 32, Math.max(...all.map((s) => s[1])) + 32, want];
        for (let i = 0; i + 1 < merged.length; i++) candidates.push((merged[i][1] + merged[i + 1][0]) / 2);
        if (merged.length) candidates.push(merged[0][0] - 16, merged[merged.length - 1][1] + 16);
        const free = (c) => !merged.some(([lo, hi]) => c > lo && c < hi);
        const lane = Math.round(candidates.filter(free).sort((p, q) => Math.abs(p - want) - Math.abs(q - want) || p - q)[0]);
        line.route = { kind: "lane", vertical, forward, gapOut: Math.round(gapOut), gapIn: Math.round(gapIn), lane };
    }
}

// The sides a line leaves and enters by, from how it is routed.
function sides(r) {
    const [rankNear, rankFar, slotNear, slotFar] = r.vertical ? ["top", "bottom", "left", "right"] : ["left", "right", "top", "bottom"];
    if (r.kind === "beside") return r.onward ? [slotFar, slotNear] : [slotNear, slotFar];
    if (r.kind === "around") return [rankFar, rankFar];
    return r.forward ? [rankFar, rankNear] : [rankNear, rankFar];
}

// Points with no repeat and no straight-through corner.
function simplify(points) {
    const out = [];
    for (const p of points) {
        const last = out[out.length - 1];
        if (last && last[0] === p[0] && last[1] === p[1]) continue;
        out.push(p);
        while (out.length >= 3) {
            const [p0, p1, p2] = out.slice(-3);
            const straight = (p0[0] === p1[0] && p1[0] === p2[0]) || (p0[1] === p1[1] && p1[1] === p2[1]);
            if (!straight) break;
            out.splice(out.length - 2, 1);
        }
    }
    return out;
}

// An orthogonal polyline with its corners rounded.
function polyline(points) {
    const r = 10;
    let d = `M${n(points[0][0])} ${n(points[0][1])}`;
    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i - 1];
        const [cx, cy] = points[i];
        const [nx, ny] = points[i + 1];
        const into = Math.min(r, Math.hypot(cx - px, cy - py) / 2);
        const out = Math.min(r, Math.hypot(nx - cx, ny - cy) / 2);
        const ux = Math.sign(cx - px);
        const uy = Math.sign(cy - py);
        const vx = Math.sign(nx - cx);
        const vy = Math.sign(ny - cy);
        d += `L${n(cx - ux * into)} ${n(cy - uy * into)}Q${n(cx)} ${n(cy)} ${n(cx + vx * out)} ${n(cy + vy * out)}`;
    }
    const [lx, ly] = points[points.length - 1];
    return `${d}L${n(lx)} ${n(ly)}`;
}

// ── drawing ─────────────────────────────────────────────────────────────────

const styleOf = (element) => (hasTag(element, "external") ? "external" : element.kind);
const shapeOf = (element) => (element.kind === "person" ? "person" : hasTag(element, "database") ? "database" : "box");
const fillAttrs = (style) => `class="c4-fill-${style}" fill="${STYLES[style].light[0]}" stroke="${STYLES[style].light[1]}" stroke-width="1.5"`;
const inkAttrs = (style) => `class="c4-ink-${style}" fill="${STYLES[style].light[2]}"`;
const pageInk = (role) => `class="c4-${role}" fill="${PAGE.light[role]}"`;

const headRadius = (w, h) => Math.round(Math.min(w, h) / 7);
const rimDepth = (h) => Math.max(4, Math.round(h / 12));

function shape(kind, style, x, y, w, h) {
    const attrs = fillAttrs(style);
    if (kind === "person") {
        const r = headRadius(w, h);
        return [
            `<circle ${attrs} cx="${n(x + w / 2)}" cy="${n(y + r)}" r="${n(r)}"/>`,
            `<rect ${attrs} x="${n(x)}" y="${n(y + r * 2 - 6)}" width="${n(w)}" height="${n(h - r * 2 + 6)}" rx="${n(r + 6)}"/>`,
        ];
    }
    if (kind === "database") {
        const ry = rimDepth(h);
        const rx = n(w / 2);
        return [
            `<path ${attrs} d="M${n(x)} ${n(y + ry)}L${n(x)} ${n(y + h - ry)}A${rx} ${ry} 0 0 0 ${n(x + w)} ${n(y + h - ry)}L${n(x + w)} ${n(y + ry)}A${rx} ${ry} 0 0 0 ${n(x)} ${n(y + ry)}Z"/>`,
            `<path class="c4-rim-${style}" fill="none" stroke="${STYLES[style].light[1]}" stroke-width="1.5" d="M${n(x)} ${n(y + ry)}A${rx} ${ry} 0 0 0 ${n(x + w)} ${n(y + ry)}"/>`,
        ];
    }
    return [`<rect ${attrs} x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${kind === "box" && style === "component" ? 4 : 8}"/>`];
}

function drawNode(node) {
    const e = node.element;
    const style = styleOf(e);
    const kind = shapeOf(e);
    const out = [`<g data-element="${escape(e.id)}"${e.instanceOf ? ` data-instance-of="${escape(e.instanceOf)}"` : ""}>`, ...shape(kind, style, node.x, node.y, node.w, node.h).map((s) => `  ${s}`)];
    const top = kind === "person" ? node.y + headRadius(node.w, node.h) * 2 - 6 : kind === "database" ? node.y + rimDepth(node.h) * 2 : node.y;
    const height = node.y + node.h - top;
    const name = wrap(e.name, 24, 2);
    const kindLine = clip(`[${KIND_LABEL[e.kind] ?? NODE_LABEL[e.kind]}${e.technology ? `: ${e.technology}` : ""}]`, 36);
    const description = wrap(e.description, 32, kind === "person" ? 2 : 3);
    const block = name.length * 18 + 16 + (description.length ? 6 + description.length * 15 : 0);
    let y = top + Math.round((height - block) / 2) + 14;
    const cx = n(node.x + node.w / 2);
    for (const line of name) { out.push(`  <text ${inkAttrs(style)} x="${cx}" y="${n(y)}" font-size="15" font-weight="600" text-anchor="middle">${escape(line)}</text>`); y += 18; }
    out.push(`  <text ${inkAttrs(style)} x="${cx}" y="${n(y)}" font-size="11" text-anchor="middle" opacity="0.85">${escape(kindLine)}</text>`);
    y += 22;
    for (const line of description) { out.push(`  <text ${inkAttrs(style)} x="${cx}" y="${n(y)}" font-size="12" text-anchor="middle">${escape(line)}</text>`); y += 15; }
    out.push("</g>");
    return out;
}

const NORMAL = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

// Spreads the ends meeting one side of a box across its middle, ordered by
// where the other end lies, so parallel lines never share a point.
function ports(nodes, lines) {
    const byId = new Map(nodes.map((node) => [node.element.id, node]));
    const ends = new Map();
    lines.forEach((line, i) => {
        const a = byId.get(line.source);
        const b = byId.get(line.destination);
        const [sa, sb] = sides(line.route);
        line.ends = [{ node: a, other: b, side: sa }, { node: b, other: a, side: sb }];
        for (const end of line.ends) {
            const key = `${end.node.element.id}\u0000${end.side}`;
            if (!ends.has(key)) ends.set(key, []);
            ends.get(key).push({ end, i });
        }
    });
    for (const list of ends.values()) {
        const horizontal = list[0].end.side === "top" || list[0].end.side === "bottom";
        const centre = (node) => (horizontal ? node.x + node.w / 2 : node.y + node.h / 2);
        list.sort((p, q) => centre(p.end.other) - centre(q.end.other) || p.i - q.i);
        list.forEach(({ end }, k) => {
            const node = end.node;
            const t = (k + 1) / (list.length + 1);
            const along = horizontal ? node.x + node.w * (0.2 + 0.6 * t) : node.y + node.h * (0.2 + 0.6 * t);
            if (end.side === "top") end.point = [along, node.y];
            else if (end.side === "bottom") end.point = [along, node.y + node.h];
            else if (end.side === "left") end.point = [node.x, along];
            else end.point = [node.x + node.w, along];
            end.point = end.point.map(Math.round);
        });
    }
}

function labelLines(line) {
    const out = [];
    for (const r of line.relationships) {
        const said = r.description ?? (line.implied ? "Uses" : "");
        const text = line.step == null ? said : said ? `${line.step}. ${said}` : `${line.step}.`;
        for (const piece of wrap(text, 28, 2)) out.push({ text: piece, role: "ink" });
        if (r.technology) out.push({ text: clip(`[${r.technology}]`, 30), role: "muted" });
    }
    return out;
}

// The line's path and the point its label centres on, as `line.points` for a
// polyline or `line.curve` for a cubic curve, `line.d`, and `line.mid`.
function shapeLine(line) {
    const [a, b] = line.ends;
    const [x0, y0] = a.point;
    const [x3, y3] = b.point;
    const r = line.route;
    const slot = (p) => (r.vertical ? p[0] : p[1]);
    const along = (p) => (r.vertical ? p[1] : p[0]);
    if (r.kind === "lane" || r.kind === "around") {
        const [gapOut, gapIn] = r.kind === "lane" ? [r.gapOut, r.gapIn] : [r.gap, r.gap];
        const [laneFrom, laneTo] = r.kind === "lane" ? [r.lane, r.lane] : [slot(a.point), slot(b.point)];
        line.points = simplify([a.point, toPoint(r.vertical, slot(a.point), gapOut), toPoint(r.vertical, laneFrom, gapOut), toPoint(r.vertical, laneTo, gapIn), toPoint(r.vertical, slot(b.point), gapIn), b.point]);
        line.d = polyline(line.points);
        line.mid = toPoint(r.vertical, Math.round((laneFrom + laneTo) / 2), Math.round((gapOut + gapIn) / 2));
    } else {
        // Control points along each side's normal, half the gap deep, keep the
        // curve inside the gap it crosses.
        const depth = r.kind === "adjacent" ? Math.abs(along(b.point) - along(a.point)) : Math.abs(slot(b.point) - slot(a.point));
        const k = Math.max(8, Math.round(depth / 2));
        const [ax, ay] = NORMAL[a.side];
        const [bx, by] = NORMAL[b.side];
        const x1 = x0 + ax * k;
        const y1 = y0 + ay * k;
        const x2 = x3 + bx * k;
        const y2 = y3 + by * k;
        line.curve = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
        line.d = `M${n(x0)} ${n(y0)}C${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(x3)} ${n(y3)}`;
        line.mid = [Math.round((x0 + 3 * x1 + 3 * x2 + x3) / 8), Math.round((y0 + 3 * y1 + 3 * y2 + y3) / 8)];
    }
}

const overlaps = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;

// A point on a cubic curve at `t`, rounded.
const bezier = ([p0, p1, p2, p3], t) => [0, 1].map((k) => Math.round((1 - t) ** 3 * p0[k] + 3 * (1 - t) ** 2 * t * p1[k] + 3 * (1 - t) * t * t * p2[k] + t ** 3 * p3[k]));

// Where a line's label centres: its middle, unless a label already placed lies
// there — two steps between the same pair, say — and then the first point
// further along the curve that is clear of every placed label and every box.
function labelAt(line, size, placed, boxes) {
    const at = ([x, y]) => ({ x: x - size.w / 2, y: y - Math.round(size.h / 2), w: size.w, h: size.h });
    if (!placed.some((p) => overlaps(p, at(line.mid))) || !line.curve) return line.mid;
    for (const t of [0.35, 0.65, 0.25, 0.75, 0.2, 0.8]) {
        const point = bezier(line.curve, t);
        const box = at(point);
        if (!placed.some((p) => overlaps(p, box)) && !boxes.some((b) => overlaps(b, box))) return point;
    }
    return line.mid;
}

const lineAttrs = (line) => `data-relationship="${escape(line.source)} -> ${escape(line.destination)}"${line.step == null ? "" : ` data-step="${line.step}"`}`;

function drawLine(line, marker) {
    return [
        `<g ${lineAttrs(line)}>`,
        `  <path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5"${line.implied ? ' stroke-dasharray="6 4"' : ""} marker-end="url(#${marker})" d="${line.d}"/>`,
        "</g>",
    ];
}

// Labels are drawn after every line, so no line runs across a label's text.
function drawLabel(line, placed, boxes) {
    const text = labelLines(line);
    if (!text.length) return [];
    const width = Math.max(...text.map((t) => textWidth(t.text, 11))) + 12;
    const height = text.length * 14 + 6;
    const [mx, my] = labelAt(line, { w: width, h: height }, placed, boxes);
    const top = my - Math.round(height / 2);
    line.label = { x: mx - width / 2, y: top, w: width, h: height };
    placed.push(line.label);
    return [
        `<g class="c4-label" ${lineAttrs(line)}>`,
        `  <rect class="c4-bg" fill="${PAGE.light.bg}" fill-opacity="0.9" x="${n(mx - width / 2)}" y="${n(top)}" width="${n(width)}" height="${n(height)}" rx="3"/>`,
        ...text.map((t, i) => `  <text ${pageInk(t.role)} x="${n(mx)}" y="${n(top + 15 + i * 14)}" font-size="11" text-anchor="middle">${escape(t.text)}</text>`),
        "</g>",
    ];
}

function legend(nodes, layoutResult, lines, kind) {
    const styles = new Set(nodes.map((node) => styleOf(node.element)));
    const items = [];
    if (layoutResult.nodeRects?.length) items.push({ label: "Deployment Node", draw: (ix, iy) => [`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    for (const style of ["infrastructureNode", "person", "softwareSystem", "container", "component", "external"]) {
        if (styles.has(style)) items.push({ label: STYLES[style].label, draw: (ix, iy) => [`<rect ${fillAttrs(style)} x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    }
    if (nodes.some((node) => shapeOf(node.element) === "database")) {
        items.push({ label: "Database", draw: (ix, iy) => shape("database", "container", ix, iy - 2, 24, 20) });
    }
    if (layoutResult.boundary) items.push({ label: "Boundary", draw: (ix, iy) => [`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" stroke-dasharray="8 4" x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    if (layoutResult.groupRects.length) items.push({ label: "Group", draw: (ix, iy) => [`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1" stroke-dasharray="2 3" x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    if (lines.length) items.push({ label: kind === "dynamic" ? "Numbered step" : "Relationship", draw: (ix, iy, marker) => [`<path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" marker-end="url(#${marker})" d="M${ix} ${iy + 8}L${ix + 22} ${iy + 8}"/>`] });
    if (lines.some((l) => l.implied)) items.push({ label: "Implied relationship", draw: (ix, iy, marker) => [`<path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#${marker})" d="M${ix} ${iy + 8}L${ix + 22} ${iy + 8}"/>`] });
    return items;
}

const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "view";

/**
 * Places one view without drawing it: `{ m, nodes, lines, groupRects,
 * boundary, nodeRects, scope, boundaryOwner }`, every node with its element,
 * rank, and box, every line with its route and end points, and in a deployment
 * view every deployment node's box with its nesting depth.
 */
export function arrange(model, view) {
    if (!KINDS.includes(view.kind)) throw new Error(`c4-render draws ${KINDS.join(", ")} views; \`${view.key}\` is a ${view.kind} view.`);
    const m = new Model(model);
    const scope = view.scope ? m.byId.get(view.scope) ?? null : null;
    let shown;
    let lines;
    let deploymentNodes = [];
    if (view.kind === "dynamic") ({ shown, lines } = selectSteps(m, view));
    else if (view.kind === "deployment") ({ shown, lines, nodes: deploymentNodes } = selectDeployment(m, view));
    else { shown = selectElements(m, view); lines = selectRelationships(m, view, shown); }
    // A dynamic view scoped to a system or container draws that scope as a
    // boundary, the way the matching static view does.
    const boundaryOwner = view.kind === "container" || view.kind === "component" || view.kind === "dynamic" ? scope : null;
    const nodes = shown.map((element) => ({ element, inside: !!boundaryOwner && element.parent === boundaryOwner.id }));
    const regions = view.kind === "container" || view.kind === "component" || (view.kind === "dynamic" && !!scope);
    const result = !nodes.length
        ? { groupRects: [], boundary: null, nodeRects: [] }
        : view.kind === "deployment" ? layoutDeployment(view, nodes, lines, deploymentNodes) : layout(view, nodes, lines, regions);
    if (nodes.length) {
        route(nodes, lines, result);
        ports(nodes, lines);
        lines.forEach(shapeLine);
    }
    return { m, nodes, lines, groupRects: result.groupRects, boundary: result.boundary, nodeRects: result.nodeRects ?? [], scope, boundaryOwner };
}

// Structurizr's titles: the kind in brackets, then what the view is of — a
// component or dynamic container scope after its system, an environment after
// a deployment view's scope.
function defaultTitle(m, view, scope) {
    const kind = `[${DEFAULT_TITLE[view.kind]}]`;
    const owner = scope && (view.kind === "component" || view.kind === "dynamic") && scope.parent ? `${m.byId.get(scope.parent)?.name ?? ""} - ` : "";
    const of = scope ? `${owner}${scope.name}` : null;
    if (view.kind === "deployment") return `${kind} ${of ? `${of} - ` : ""}${view.environment ?? ""}`.trim();
    return of ? `${kind} ${of}` : DEFAULT_TITLE[view.kind];
}

// A deployment node is drawn in two parts: its frame under everything, and its
// label over the lines, on a backing that keeps it legible where a line into a
// leaf it holds crosses its header strip. The label ends above the strip's
// last few pixels, so an arrowhead entering a leaf below it stays in view.
function drawDeploymentFrame(d) {
    return [
        `<g data-deployment-node="${escape(d.element.id)}">`,
        `  <rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" x="${n(d.x)}" y="${n(d.y)}" width="${n(d.w)}" height="${n(d.h)}" rx="6"/>`,
        "</g>",
    ];
}

function drawDeploymentLabel(d) {
    const e = d.element;
    const room = Math.max(8, Math.floor((d.w - 24) / 6.5));
    const count = e.instances ? `x${e.instances}` : "";
    const name = clip(e.name, count ? room - count.length - 2 : room);
    const kind = clip(`[${NODE_LABEL.deploymentNode}${e.technology ? `: ${e.technology}` : ""}]`, room);
    const width = Math.max(textWidth(name, 13), textWidth(kind, 11)) + 8;
    const out = [`<g data-deployment-label="${escape(e.id)}">`];
    out.push(`  <rect class="c4-bg" fill="${PAGE.light.bg}" fill-opacity="0.9" x="${n(d.x + 8)}" y="${n(d.y + 5)}" width="${n(width)}" height="31" rx="3"/>`);
    out.push(`  <text ${pageInk("ink")} x="${n(d.x + 12)}" y="${n(d.y + 19)}" font-size="13" font-weight="600">${escape(name)}</text>`);
    out.push(`  <text ${pageInk("muted")} x="${n(d.x + 12)}" y="${n(d.y + 32)}" font-size="11">${escape(kind)}</text>`);
    if (count) out.push(`  <text ${pageInk("ink")} x="${n(d.x + d.w - 12)}" y="${n(d.y + 19)}" font-size="13" font-weight="600" text-anchor="end">${escape(count)}</text>`);
    out.push("</g>");
    return out;
}

/** Draws one view of a model `c4.mjs` read; returns the SVG text. */
export function renderView(model, view) {
    const { m, nodes, lines, scope, boundaryOwner, ...result } = arrange(model, view);
    const marker = `c4-${slug(view.key ?? view.kind)}-arrow`;

    const body = [];
    for (const d of result.nodeRects) body.push(...drawDeploymentFrame(d));
    for (const g of result.groupRects) {
        body.push(`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1" stroke-dasharray="2 3" x="${n(g.x)}" y="${n(g.y)}" width="${n(g.w)}" height="${n(g.h)}" rx="6"/>`);
        body.push(`<text ${pageInk("muted")} x="${n(g.x + 10)}" y="${n(g.y + 18)}" font-size="12" font-weight="600">${escape(clip(g.name, Math.max(8, Math.floor(g.w / 7))))}</text>`);
    }
    if (result.boundary && boundaryOwner) {
        const b = result.boundary;
        body.push(`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" stroke-dasharray="8 4" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="8"/>`);
        const label = `${boundaryOwner.name} [${KIND_LABEL[boundaryOwner.kind]}]`;
        body.push(`<text ${pageInk("ink")} x="${n(b.x + 12)}" y="${n(b.y + 21)}" font-size="13" font-weight="600">${escape(clip(label, Math.max(12, Math.floor(b.w / 7.5))))}</text>`);
    }
    for (const node of nodes) body.push(...drawNode(node));
    for (const line of lines) body.push(...drawLine(line, marker));
    const placed = [];
    for (const line of lines) body.push(...drawLabel(line, placed, nodes));
    for (const d of result.nodeRects) body.push(...drawDeploymentLabel(d));

    // Bounds of everything drawn, so the picture is shifted to sit inside its margin.
    const boxes = [...nodes, ...result.nodeRects, ...result.groupRects, ...(result.boundary ? [result.boundary] : []), ...lines.filter((l) => l.label).map((l) => l.label)];
    for (const line of lines) for (const p of line.points ?? line.curve) boxes.push({ x: p[0], y: p[1], w: 0, h: 0 });
    const minX = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0;
    const minY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
    const maxX = boxes.length ? Math.max(...boxes.map((b) => b.x + b.w)) : 0;
    const maxY = boxes.length ? Math.max(...boxes.map((b) => b.y + b.h)) : 0;

    const title = view.title ?? defaultTitle(m, view, scope);
    const header = [title, ...(view.description ? [view.description] : [])];
    const headerHeight = view.description ? 64 : 44;
    const offsetX = MARGIN - minX;
    const offsetY = MARGIN + headerHeight - minY;
    const contentHeight = nodes.length ? maxY - minY : 24;

    const legendY = MARGIN + headerHeight + contentHeight + 32;
    const items = legend(nodes, result, lines, view.kind);
    let lx = MARGIN;
    const legendParts = [];
    for (const item of items) {
        legendParts.push(...item.draw(lx, legendY, marker));
        legendParts.push(`<text ${pageInk("ink")} x="${lx + 32}" y="${legendY + 13}" font-size="12">${escape(item.label)}</text>`);
        lx += 32 + textWidth(item.label, 12) + 24;
    }

    const width = Math.max(MARGIN * 2 + (nodes.length ? maxX - minX : 0), lx + MARGIN - 24, MARGIN * 2 + Math.max(...header.map((h, i) => textWidth(h, i ? 13 : 20))));
    const height = legendY + (items.length ? 16 : 0) + MARGIN;

    const dark = [
        `.c4-bg{fill:${PAGE.dark.bg}}`,
        `.c4-ink{fill:${PAGE.dark.ink}}`,
        `.c4-muted{fill:${PAGE.dark.muted}}`,
        `.c4-line{stroke:${PAGE.dark.line}}`,
        `.c4-head{fill:${PAGE.dark.line}}`,
        `.c4-edge{stroke:${PAGE.dark.line}}`,
        // Only a deployment view can hold an infrastructure node, so only a view
        // that draws one carries its rules; every other view's bytes stay as they were.
        ...Object.entries(STYLES).filter(([name]) => name !== "infrastructureNode" || nodes.some((node) => styleOf(node.element) === name)).flatMap(([name, s]) => [
            `.c4-fill-${name}{fill:${s.dark[0]};stroke:${s.dark[1]}}`,
            `.c4-rim-${name}{stroke:${s.dark[1]}}`,
            `.c4-ink-${name}{fill:${s.dark[2]}}`,
        ]),
    ];

    const out = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}" font-family="${FONT}" role="img" aria-label="${escape(title)}">`,
        `<title>${escape(title)}</title>`,
        ...(view.description ? [`<desc>${escape(view.description)}</desc>`] : []),
        "<style>",
        "@media (prefers-color-scheme: dark) {",
        ...dark.map((rule) => `  ${rule}`),
        "}",
        "</style>",
        "<defs>",
        `  <marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">`,
        `    <path class="c4-head" fill="${PAGE.light.line}" d="M0 0L10 5L0 10Z"/>`,
        "  </marker>",
        "</defs>",
        `<rect class="c4-bg" fill="${PAGE.light.bg}" x="0" y="0" width="${n(width)}" height="${n(height)}"/>`,
        `<text ${pageInk("ink")} x="${MARGIN}" y="${MARGIN + 18}" font-size="20" font-weight="600">${escape(title)}</text>`,
        ...(view.description ? [`<text ${pageInk("muted")} x="${MARGIN}" y="${MARGIN + 40}" font-size="13">${escape(view.description)}</text>`] : []),
        ...(nodes.length
            ? [`<g transform="translate(${n(offsetX)} ${n(offsetY)})">`, ...body.map((line) => `  ${line}`), "</g>"]
            : [`<text ${pageInk("muted")} x="${MARGIN}" y="${MARGIN + headerHeight + 16}" font-size="13">This view shows no elements.</text>`]),
        ...(items.length ? ['<g class="c4-legend">', ...legendParts.map((line) => `  ${line}`), "</g>"] : []),
        "</svg>",
        "",
    ];
    return out.join("\n");
}

/**
 * Draws every view with a key. Returns `{ rendered: [{ key, kind, svg }],
 * skipped: [{ key, kind, reason }] }`, both in the workspace's view order.
 */
export function renderViews(model) {
    const rendered = [];
    const skipped = [];
    for (const view of model.views) {
        if (!view.key) { skipped.push({ key: null, kind: view.kind, reason: "the view has no key, so it has no file name" }); continue; }
        if (!KINDS.includes(view.kind)) { skipped.push({ key: view.key, kind: view.kind, reason: `${view.kind} views are not drawn` }); continue; }
        rendered.push({ key: view.key, kind: view.kind, svg: renderView(model, view) });
    }
    return { rendered, skipped };
}

// ── refresh ─────────────────────────────────────────────────────────────────

/**
 * Compares the SVGs in `folder` with what `rendered` holds, file by file:
 * `current` matches, `missing` has no file, `stale` has one with other bytes, and
 * `orphan` is an `.svg` no rendered view names. Every list is sorted by file name.
 * Only `.svg` files count: the folder holds one per view key and nothing else.
 */
export async function compareRenders(rendered, folder) {
    let present = [];
    try { present = (await readdir(folder, { withFileTypes: true })).filter((e) => e.isFile() && e.name.endsWith(".svg")).map((e) => e.name); } catch { /* no folder yet */ }
    const byName = new Map(rendered.map((r) => [`${r.key}.svg`, r.svg]));
    const result = { current: [], missing: [], stale: [], orphan: [] };
    for (const [name, svg] of byName) {
        if (!present.includes(name)) { result.missing.push(name); continue; }
        const onDisk = (await readFile(path.join(folder, name), "utf8")).replace(/\r\n/g, "\n");
        (onDisk === svg ? result.current : result.stale).push(name);
    }
    for (const name of present) if (!byName.has(name)) result.orphan.push(name);
    for (const list of Object.values(result)) list.sort();
    return result;
}

/**
 * Brings `folder` level with `model`: deletes each `.svg` no view names, writes
 * each missing or stale view, and leaves a current file untouched, so a refresh
 * moves a file only when its view changed. Deleting first keeps a key renamed
 * only in case on a case-insensitive disk. A model with problems deletes nothing,
 * because a view the problem hid would lose its render: `kept` lists those
 * orphans. `check: true` writes and deletes nothing and only reports. Returns the
 * comparison taken before any write.
 */
export async function refreshRenders(model, folder, { check = false } = {}) {
    const { rendered, skipped } = renderViews(model);
    const before = await compareRenders(rendered, folder);
    const prune = !model.problems?.length;
    if (!check) {
        if (prune) for (const name of before.orphan) await unlink(path.join(folder, name));
        const write = new Set([...before.missing, ...before.stale]);
        if (write.size) await mkdir(folder, { recursive: true });
        for (const { key, svg } of rendered) if (write.has(`${key}.svg`)) await writeFile(path.join(folder, `${key}.svg`), svg);
    }
    return { ...before, kept: check || prune ? [] : before.orphan, skipped };
}

// ── command line ────────────────────────────────────────────────────────────

// devbook's reader, never a copy: where devbook's init materializes it, or where
// this marketplace authors it, looked for from the working folder and from each
// folder above the workspace; beside this file where devbook-derived's init
// materializes it, in `.devbook/_tools/c4-render/`; and beside this plugin in
// the marketplace checkout.
const READER = [[".devbook", "_tools", "devbook-meta", "c4.mjs"], ["plugins", "devbook", "tools", "devbook-meta", "c4.mjs"]];

export async function loadReader(workspace = null, root = process.cwd()) {
    const folders = [root];
    for (let dir = workspace ? path.dirname(path.resolve(root, workspace)) : null; dir && !folders.includes(dir); dir = path.dirname(dir)) folders.push(dir);
    const candidates = folders.flatMap((dir) => READER.map((parts) => path.join(dir, ...parts)));
    candidates.push(fileURLToPath(new URL("../devbook-meta/c4.mjs", import.meta.url)));
    candidates.push(fileURLToPath(new URL("../../../devbook/tools/devbook-meta/c4.mjs", import.meta.url)));
    for (const file of candidates) {
        try { await access(file); } catch { continue; }
        return import(pathToFileURL(file).href);
    }
    throw new Error("devbook's C4 reader, c4.mjs, is not installed in .devbook/_tools/devbook-meta/ here or above the workspace. Run devbook:update.");
}

const USAGE = "usage: node render.mjs [--check] <workspace.dsl> <out folder>";

// Exit codes: 0 the folder is current (or now is), 1 a workspace problem, or under
// --check a render that is missing, stale, or orphaned; 2 a usage or install error.
// A workspace that does not exist has no views, so its renders are orphans.
export async function main(argv, { root = process.cwd(), log = console.log, warn = console.error } = {}) {
    const check = argv.includes("--check");
    const unknown = argv.filter((a) => a.startsWith("--") && a !== "--check");
    const positional = argv.filter((a) => !a.startsWith("--"));
    const [workspace, folder] = positional;
    if (unknown.length || positional.length !== 2) { warn(USAGE); return 2; }
    let model = { views: [], problems: [] };
    try {
        await access(path.resolve(root, workspace));
        const { readWorkspace } = await loadReader(workspace, root);
        model = readWorkspace(workspace, { root });
    } catch (error) {
        if (error.code !== "ENOENT") { warn(error.message); return 2; }
    }
    for (const p of model.problems) warn(`${p.file}:${p.line}: ${p.message}`);
    const out = path.resolve(root, folder);
    const label = (name) => path.join(folder, name).split(path.sep).join("/");
    const result = await refreshRenders(model, out, { check });
    for (const s of result.skipped) log(`skipped ${s.key ?? `(${s.kind})`}: ${s.reason}`);
    if (check) {
        for (const name of result.missing) log(`missing  ${label(name)}`);
        for (const name of result.stale) log(`stale    ${label(name)}`);
        for (const name of result.orphan) log(`orphan   ${label(name)}`);
        const drifted = result.missing.length + result.stale.length + result.orphan.length;
        if (!drifted) log(`checked ${folder}: ${result.current.length} renders current`);
        return model.problems.length || drifted ? 1 : 0;
    }
    for (const name of result.missing) log(`added    ${label(name)}`);
    for (const name of result.stale) log(`updated  ${label(name)}`);
    for (const name of result.kept) log(`kept     ${label(name)}: names no view, but the workspace has a problem`);
    for (const name of result.orphan) if (!result.kept.includes(name)) log(`removed  ${label(name)}`);
    if (!result.missing.length && !result.stale.length && !result.orphan.length) log(`${folder}: ${result.current.length} renders already current`);
    return model.problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exit(await main(process.argv.slice(2)));
}
