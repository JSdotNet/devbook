// render.mjs — draws the static views of a C4 workspace as SVG.
//
// The C4 model decision commits one SVG per view beside the `c4:<key>` embed, for
// a reader on GitHub or any viewer that knows no C4. This module takes the
// model devbook's `c4.mjs` reads — never a parser of its own — and draws each
// systemLandscape, systemContext, container, and component view: a layered
// layout along the relationships, the scope as a boundary, groups as labelled
// bands, a shape per element kind and tag, relationship labels, and a legend.
// Dynamic and deployment views are not drawn here yet; `renderViews` lists them
// as skipped.
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
// Run: `node render.mjs <workspace.dsl> <out folder>` writes `<view key>.svg`
// per drawable view and exits 1 when the workspace has a problem.

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STATIC_KINDS = ["systemLandscape", "systemContext", "container", "component"];

// ── palette ─────────────────────────────────────────────────────────────────

// Light values are the attributes; dark values are the stylesheet's override.
const STYLES = {
    person: { label: "Person", light: ["#08427b", "#052e56", "#ffffff"], dark: ["#1d5c99", "#6ea2d8", "#ffffff"] },
    softwareSystem: { label: "Software System", light: ["#1168bd", "#0b4884", "#ffffff"], dark: ["#1b6ec2", "#78aee6", "#ffffff"] },
    container: { label: "Container", light: ["#438dd5", "#2e6295", "#ffffff"], dark: ["#2f73b5", "#8dbbea", "#ffffff"] },
    component: { label: "Component", light: ["#85bbf0", "#5d82a8", "#0b2540"], dark: ["#2a5d8f", "#9cc4ee", "#ffffff"] },
    external: { label: "External", light: ["#8c959f", "#6e7781", "#ffffff"], dark: ["#484f58", "#8b949e", "#ffffff"] },
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

// ── text ────────────────────────────────────────────────────────────────────

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
const ALLOWED = {
    systemLandscape: ["person", "softwareSystem"],
    systemContext: ["person", "softwareSystem"],
    container: ["person", "softwareSystem", "container"],
    component: ["person", "softwareSystem", "container", "component"],
};
const DEFAULT_TITLE = { systemLandscape: "System Landscape", systemContext: "System Context", container: "Container", component: "Component" };

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

// The elements a view shows, in model order, by Structurizr's rules for `include *`.
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
                const neighbours = view.kind === "component"
                    ? m.elements.filter((e) => e.kind !== "component" && e.id !== scope.id)
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

// One line per pair of shown elements: the relationships drawn between them,
// direct ones as written, otherwise the first implied one.
export function selectRelationships(model, view, shown) {
    const m = model instanceof Model ? model : new Model(model);
    const visible = new Set(shown.map((e) => e.id));
    const excluded = new Set(view.exclude);
    const nearest = (id) => m.chain(id).find((x) => visible.has(x)) ?? null;
    const pairs = new Map();
    m.model.relationships.forEach((r, index) => {
        if (r.id && excluded.has(r.id)) return;
        const a = nearest(r.source);
        const b = nearest(r.destination);
        if (!a || !b || a === b || m.within(a, b) || m.within(b, a)) return;
        const key = `${a}\u0000${b}`;
        if (!pairs.has(key)) pairs.set(key, { source: a, destination: b, index, direct: [], implied: [] });
        const pair = pairs.get(key);
        (r.source === a && r.destination === b ? pair.direct : pair.implied).push(r);
    });
    return [...pairs.values()]
        .sort((x, y) => x.index - y.index)
        .map((p) => ({ source: p.source, destination: p.destination, relationships: p.direct.length ? p.direct : p.implied.slice(0, 1), implied: !p.direct.length }));
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

// Positions every node, band, and the boundary. Regions run along the slot axis
// — people outside the scope, the scope, everything else outside it — and each
// region splits into one band per group, so bands and the boundary never overlap.
function layout(view, nodes, lines) {
    const index = new Map(nodes.map((node, i) => [node.element.id, i]));
    const edges = lines.map((l) => [index.get(l.source), index.get(l.destination)]);
    const ranks = rank(nodes.length, edges);
    const layers = order(ranks, edges);

    const direction = view.autolayout?.direction ?? "tb";
    const vertical = direction === "tb" || direction === "bt";
    const slotSize = vertical ? NODE_W : NODE_H;
    const rankSize = vertical ? NODE_H : NODE_W;
    const rankSep = view.autolayout?.rankSeparation ?? RANK_SEP;
    const nodeSep = view.autolayout?.nodeSeparation ?? NODE_SEP;

    const regionOf = (node) => (!node.inside && view.kind !== "systemLandscape" && view.kind !== "systemContext" ? (node.element.kind === "person" ? 0 : 2) : 1);
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

// ── routing ─────────────────────────────────────────────────────────────────
//
// A line between neighbouring ranks, or within one, is a curve. A line that
// skips a rank would cross the boxes between, so it runs in a channel instead:
// out into the gap after its source, along the gap to a lane no box in the
// skipped ranks occupies, through the ranks in that lane, and into its
// destination from the gap before it. All of it is worked in rank and slot
// coordinates, so every autolayout direction routes the same way.

function route(nodes, lines, geometry) {
    const byId = new Map(nodes.map((node) => [node.element.id, node]));
    const { vertical, rankSep } = geometry;
    const rankOf = (box) => (vertical ? [box.y, box.y + box.h] : [box.x, box.x + box.w]);
    const slotOf = (box) => (vertical ? [box.x, box.x + box.w] : [box.y, box.y + box.h]);
    const point = (slot, along) => (vertical ? [slot, along] : [along, slot]);
    for (const line of lines) {
        const a = byId.get(line.source);
        const b = byId.get(line.destination);
        if (Math.abs(a.rank - b.rank) < 2) continue;
        const [a0, a1] = rankOf(a);
        const [b0, b1] = rankOf(b);
        const forward = b0 > a1;
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
        const all = nodes.map(slotOf);
        const candidates = [Math.min(...all.map((s) => s[0])) - 32, Math.max(...all.map((s) => s[1])) + 32];
        if (!merged.length) candidates.push((slotOf(a)[0] + slotOf(a)[1] + slotOf(b)[0] + slotOf(b)[1]) / 4);
        for (let i = 0; i + 1 < merged.length; i++) candidates.push((merged[i][1] + merged[i + 1][0]) / 2);
        if (merged.length) candidates.push(merged[0][0] - 16, merged[merged.length - 1][1] + 16);
        const free = (c) => !merged.some(([lo, hi]) => c > lo && c < hi);
        const want = (slotOf(a)[0] + slotOf(a)[1] + slotOf(b)[0] + slotOf(b)[1]) / 4;
        const lane = Math.round(candidates.filter(free).sort((p, q) => Math.abs(p - want) - Math.abs(q - want) || p - q)[0]);
        line.route = { forward, gapOut: Math.round(gapOut), gapIn: Math.round(gapIn), lane, point, vertical };
    }
    return byId;
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

function shape(kind, style, x, y, w, h) {
    const attrs = fillAttrs(style);
    if (kind === "person") {
        const r = Math.round(Math.min(w, h) / 7);
        return [
            `<circle ${attrs} cx="${n(x + w / 2)}" cy="${n(y + r)}" r="${n(r)}"/>`,
            `<rect ${attrs} x="${n(x)}" y="${n(y + r * 2 - 6)}" width="${n(w)}" height="${n(h - r * 2 + 6)}" rx="${n(r + 6)}"/>`,
        ];
    }
    if (kind === "database") {
        const ry = Math.max(4, Math.round(h / 12));
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
    const out = [`<g data-element="${escape(e.id)}">`, ...shape(kind, style, node.x, node.y, node.w, node.h).map((s) => `  ${s}`)];
    const top = kind === "person" ? node.y + Math.round(Math.min(node.w, node.h) / 7) * 2 - 6 : kind === "database" ? node.y + Math.round(node.h / 12) * 2 : node.y;
    const height = node.y + node.h - top;
    const name = wrap(e.name, 24, 2);
    const kindLine = clip(`[${KIND_LABEL[e.kind]}${e.technology ? `: ${e.technology}` : ""}]`, 36);
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

// The side of a box a line leaves or enters by, from where the other box lies.
function side(from, to) {
    const dx = to.x + to.w / 2 - (from.x + from.w / 2);
    const dy = to.y + to.h / 2 - (from.y + from.h / 2);
    if (Math.abs(dy) / (from.h + RANK_SEP) >= Math.abs(dx) / (from.w + NODE_SEP)) return dy >= 0 ? "bottom" : "top";
    return dx >= 0 ? "right" : "left";
}

const NORMAL = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

// Spreads the ends meeting one side of a box across its middle, ordered by
// where the other end lies, so parallel lines never share a point.
function ports(nodes, lines, geometry) {
    const byId = new Map(nodes.map((node) => [node.element.id, node]));
    const ends = new Map();
    lines.forEach((line, i) => {
        const a = byId.get(line.source);
        const b = byId.get(line.destination);
        const [sa, sb] = line.route
            ? (geometry.vertical ? ["bottom", "top"] : ["right", "left"]).map((s, i, pair) => (line.route.forward ? s : pair[1 - i]))
            : [side(a, b), side(b, a)];
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
        for (const text of wrap(r.description ?? (line.implied ? "Uses" : ""), 28, 2)) out.push({ text, role: "ink" });
        if (r.technology) out.push({ text: clip(`[${r.technology}]`, 30), role: "muted" });
    }
    return out;
}

function drawLine(line, marker) {
    const [a, b] = line.ends;
    const [x0, y0] = a.point;
    const [x3, y3] = b.point;
    let d;
    let mx;
    let my;
    if (line.route) {
        const { gapOut, gapIn, lane, point, vertical } = line.route;
        const slot = (p) => (vertical ? p[0] : p[1]);
        line.points = simplify([a.point, point(slot(a.point), gapOut), point(lane, gapOut), point(lane, gapIn), point(slot(b.point), gapIn), b.point]);
        d = polyline(line.points);
        [mx, my] = point(lane, Math.round((gapOut + gapIn) / 2));
    } else {
        const k = Math.max(40, Math.round(Math.hypot(x3 - x0, y3 - y0) / 3));
        const [ax, ay] = NORMAL[a.side];
        const [bx, by] = NORMAL[b.side];
        const x1 = x0 + ax * k;
        const y1 = y0 + ay * k;
        const x2 = x3 + bx * k;
        const y2 = y3 + by * k;
        d = `M${n(x0)} ${n(y0)}C${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(x3)} ${n(y3)}`;
        mx = Math.round((x0 + 3 * x1 + 3 * x2 + x3) / 8);
        my = Math.round((y0 + 3 * y1 + 3 * y2 + y3) / 8);
    }
    const out = [`<g data-relationship="${escape(line.source)} -> ${escape(line.destination)}">`];
    out.push(`  <path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5"${line.implied ? ' stroke-dasharray="6 4"' : ""} marker-end="url(#${marker})" d="${d}"/>`);
    const text = labelLines(line);
    if (text.length) {
        const width = Math.max(...text.map((t) => textWidth(t.text, 11))) + 12;
        const height = text.length * 14 + 6;
        const top = my - Math.round(height / 2);
        out.push(`  <rect class="c4-bg" fill="${PAGE.light.bg}" fill-opacity="0.9" x="${n(mx - width / 2)}" y="${n(top)}" width="${n(width)}" height="${n(height)}" rx="3"/>`);
        text.forEach((t, i) => out.push(`  <text ${pageInk(t.role)} x="${n(mx)}" y="${n(top + 15 + i * 14)}" font-size="11" text-anchor="middle">${escape(t.text)}</text>`));
        line.label = { x: mx - width / 2, y: top, w: width, h: height };
    }
    out.push("</g>");
    return out;
}

function legend(nodes, layoutResult, lines, x, y) {
    const styles = new Set(nodes.map((node) => styleOf(node.element)));
    const items = [];
    for (const style of ["person", "softwareSystem", "container", "component", "external"]) {
        if (styles.has(style)) items.push({ label: STYLES[style].label, draw: (ix, iy) => [`<rect ${fillAttrs(style)} x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    }
    if (nodes.some((node) => shapeOf(node.element) === "database")) {
        items.push({ label: "Database", draw: (ix, iy) => shape("database", "container", ix, iy - 2, 24, 20) });
    }
    if (layoutResult.boundary) items.push({ label: "Boundary", draw: (ix, iy) => [`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" stroke-dasharray="8 4" x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    if (layoutResult.groupRects.length) items.push({ label: "Group", draw: (ix, iy) => [`<rect class="c4-edge" fill="none" stroke="${PAGE.light.line}" stroke-width="1" stroke-dasharray="2 3" x="${ix}" y="${iy}" width="24" height="16" rx="3"/>`] });
    if (lines.length) items.push({ label: "Relationship", draw: (ix, iy, marker) => [`<path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" marker-end="url(#${marker})" d="M${ix} ${iy + 8}L${ix + 22} ${iy + 8}"/>`] });
    if (lines.some((l) => l.implied)) items.push({ label: "Implied relationship", draw: (ix, iy, marker) => [`<path class="c4-line" fill="none" stroke="${PAGE.light.line}" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#${marker})" d="M${ix} ${iy + 8}L${ix + 22} ${iy + 8}"/>`] });
    return { items, x, y };
}

const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "view";

/**
 * Places one static view without drawing it: `{ nodes, lines, groupRects,
 * boundary, scope, boundaryOwner }`, every node with its element, rank, and box.
 */
export function arrange(model, view) {
    if (!STATIC_KINDS.includes(view.kind)) throw new Error(`c4-render draws ${STATIC_KINDS.join(", ")} views; \`${view.key}\` is a ${view.kind} view.`);
    const m = new Model(model);
    const scope = view.scope ? m.byId.get(view.scope) ?? null : null;
    const shown = selectElements(m, view);
    const boundaryOwner = view.kind === "container" || view.kind === "component" ? scope : null;
    const nodes = shown.map((element) => ({ element, inside: !!boundaryOwner && element.parent === boundaryOwner.id }));
    const lines = selectRelationships(m, view, shown);
    const result = nodes.length ? layout(view, nodes, lines) : { groupRects: [], boundary: null };
    if (nodes.length) {
        route(nodes, lines, result);
        ports(nodes, lines, result);
    }
    return { m, nodes, lines, groupRects: result.groupRects, boundary: result.boundary, scope, boundaryOwner };
}

/** Draws one static view of a model `c4.mjs` read; returns the SVG text. */
export function renderView(model, view) {
    const { m, nodes, lines, scope, boundaryOwner, ...result } = arrange(model, view);
    const marker = `c4-${slug(view.key ?? view.kind)}-arrow`;

    const body = [];
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

    // Bounds of everything drawn, so the picture is shifted to sit inside its margin.
    const boxes = [...nodes, ...result.groupRects, ...(result.boundary ? [result.boundary] : []), ...lines.filter((l) => l.label).map((l) => l.label)];
    for (const line of lines) for (const p of line.points ?? line.ends.map((end) => end.point)) boxes.push({ x: p[0], y: p[1], w: 0, h: 0 });
    const minX = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0;
    const minY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
    const maxX = boxes.length ? Math.max(...boxes.map((b) => b.x + b.w)) : 0;
    const maxY = boxes.length ? Math.max(...boxes.map((b) => b.y + b.h)) : 0;

    const title = view.title ?? (scope ? `[${DEFAULT_TITLE[view.kind]}] ${view.kind === "component" && scope.parent ? `${m.byId.get(scope.parent)?.name ?? ""} - ` : ""}${scope.name}` : DEFAULT_TITLE[view.kind]);
    const header = [title, ...(view.description ? [view.description] : [])];
    const headerHeight = view.description ? 64 : 44;
    const offsetX = MARGIN - minX;
    const offsetY = MARGIN + headerHeight - minY;
    const contentHeight = nodes.length ? maxY - minY : 24;

    const legendY = MARGIN + headerHeight + contentHeight + 32;
    const key = legend(nodes, result, lines, MARGIN, legendY);
    let lx = MARGIN;
    const legendParts = [];
    for (const item of key.items) {
        legendParts.push(...item.draw(lx, legendY, marker));
        legendParts.push(`<text ${pageInk("ink")} x="${lx + 32}" y="${legendY + 13}" font-size="12">${escape(item.label)}</text>`);
        lx += 32 + textWidth(item.label, 12) + 24;
    }

    const width = Math.max(MARGIN * 2 + (nodes.length ? maxX - minX : 0), lx + MARGIN - 24, MARGIN * 2 + Math.max(...header.map((h, i) => textWidth(h, i ? 13 : 20))));
    const height = legendY + (key.items.length ? 16 : 0) + MARGIN;

    const dark = [
        `.c4-bg{fill:${PAGE.dark.bg}}`,
        `.c4-ink{fill:${PAGE.dark.ink}}`,
        `.c4-muted{fill:${PAGE.dark.muted}}`,
        `.c4-line{stroke:${PAGE.dark.line}}`,
        `.c4-head{fill:${PAGE.dark.line}}`,
        `.c4-edge{stroke:${PAGE.dark.line}}`,
        ...Object.entries(STYLES).flatMap(([name, s]) => [
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
        ...(key.items.length ? ['<g class="c4-legend">', ...legendParts.map((line) => `  ${line}`), "</g>"] : []),
        "</svg>",
        "",
    ];
    return out.join("\n");
}

/**
 * Draws every static view with a key. Returns `{ rendered: [{ key, kind, svg }],
 * skipped: [{ key, kind, reason }] }`, both in the workspace's view order.
 */
export function renderViews(model) {
    const rendered = [];
    const skipped = [];
    for (const view of model.views) {
        if (!view.key) { skipped.push({ key: null, kind: view.kind, reason: "the view has no key, so it has no file name" }); continue; }
        if (!STATIC_KINDS.includes(view.kind)) { skipped.push({ key: view.key, kind: view.kind, reason: `${view.kind} views are not drawn yet` }); continue; }
        rendered.push({ key: view.key, kind: view.kind, svg: renderView(model, view) });
    }
    return { rendered, skipped };
}

// ── command line ────────────────────────────────────────────────────────────

// devbook's reader, never a copy: where devbook's init materializes it, or where
// this marketplace authors it.
const READER_CANDIDATES = (root) => [
    path.join(root, ".devbook", "_tools", "devbook-meta", "c4.mjs"),
    path.join(root, "plugins", "devbook", "tools", "devbook-meta", "c4.mjs"),
];

export async function loadReader(root = process.cwd()) {
    for (const file of READER_CANDIDATES(root)) {
        try { await access(file); } catch { continue; }
        return import(pathToFileURL(file).href);
    }
    throw new Error(`devbook's C4 reader is not installed — none of ${READER_CANDIDATES(root).map((f) => path.relative(root, f)).join(", ")} exists. Run devbook:update.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [workspace, folder] = process.argv.slice(2);
    if (!workspace || !folder) {
        console.error("usage: node render.mjs <workspace.dsl> <out folder>");
        process.exit(2);
    }
    const { readWorkspace } = await loadReader();
    const model = readWorkspace(workspace);
    for (const p of model.problems) console.error(`${p.file}:${p.line}: ${p.message}`);
    const { rendered, skipped } = renderViews(model);
    await mkdir(folder, { recursive: true });
    for (const { key, svg } of rendered) {
        await writeFile(path.join(folder, `${key}.svg`), svg);
        console.log(`wrote ${path.join(folder, `${key}.svg`)}`);
    }
    for (const s of skipped) console.log(`skipped ${s.key ?? `(${s.kind})`}: ${s.reason}`);
    process.exit(model.problems.length ? 1 : 0);
}
