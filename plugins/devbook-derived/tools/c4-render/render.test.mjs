// The C4 view renderer, `render.mjs`, draws the static views of the model
// devbook's `c4.mjs` reads. One golden SVG per view kind pins the bytes; the
// rest pins what the goldens cannot say on their own: the same model gives the
// same bytes, a change outside a view leaves its file alone, the dark variant
// sits inside the SVG, and the view selects the elements and relationships
// Structurizr's rules give it.
//
// Run: `node --test render.test.mjs`. `UPDATE_GOLDEN=1` rewrites the goldens
// from the fixture; review the diff before committing it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseWorkspace } from "../../../devbook/tools/devbook-meta/c4.mjs";
import { arrange, renderView, renderViews, selectElements, selectRelationships, wrap } from "./render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(path.join(here, "fixtures", "workspace.dsl"), "utf8").replace(/\r\n/g, "\n");
const read = (source = fixture) => {
    const model = parseWorkspace(source);
    assert.deepEqual(model.problems, [], "the fixture reads clean");
    return model;
};
const model = read();
const view = (key, m = model) => m.views.find((v) => v.key === key);
const ids = (elements) => elements.map((e) => e.id);
const wrapModel = (body, views) => `workspace "W" {\n!identifiers hierarchical\nmodel {\n${body}\n}\nviews {\n${views}\n}\n}\n`;

// ── golden files, one per view kind ─────────────────────────────────────────

for (const [key, kind] of [["landscape", "systemLandscape"], ["context", "systemContext"], ["containers", "container"], ["components", "component"]]) {
    test(`golden: the ${kind} view draws byte for byte as ${key}.svg`, () => {
        assert.equal(view(key).kind, kind);
        const svg = renderView(model, view(key));
        const file = path.join(here, "fixtures", "golden", `${key}.svg`);
        if (process.env.UPDATE_GOLDEN) writeFileSync(file, svg);
        assert.equal(svg, readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    });
}

// ── determinism ─────────────────────────────────────────────────────────────

test("the same model gives the same bytes, read twice and rendered twice", () => {
    const first = renderViews(read());
    const second = renderViews(read());
    assert.deepEqual(first, second);
    assert.deepEqual(renderViews(model), renderViews(structuredClone(model)));
});

test("a change outside a view leaves its bytes alone", () => {
    const added = fixture.replace('payments = softwareSystem', 'ledger = softwareSystem "Ledger" "Books money" "External"\n        payments = softwareSystem');
    const changed = read(added);
    for (const key of ["context", "containers", "components"]) {
        assert.equal(renderView(changed, view(key, changed)), renderView(model, view(key)), key);
    }
    assert.notEqual(renderView(changed, view("landscape", changed)), renderView(model, view("landscape")), "the landscape shows the new system");
});

test("every coordinate is a whole number", () => {
    for (const { svg } of renderViews(model).rendered) {
        const numbers = [...svg.matchAll(/\s(?:x|y|width|height|cx|cy|r|d)="([^"]*)"/g)].map((m) => m[1]);
        for (const value of numbers) assert.doesNotMatch(value, /\d\.\d/, value);
    }
});

// ── colours, fonts, and the dark variant ────────────────────────────────────

test("colours and fonts are attributes, and the dark variant is a media query inside the SVG", () => {
    const svg = renderView(model, view("containers"));
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]* font-family="[^"]+"/);
    assert.match(svg, /<style>\n@media \(prefers-color-scheme: dark\) \{\n/);
    assert.match(svg, /class="c4-bg" fill="#ffffff"/);
    assert.match(svg, /\.c4-bg\{fill:#0d1117\}/);
    for (const [, cls] of svg.matchAll(/class="(c4-(?:fill|ink)-[a-zA-Z]+)"/g)) assert.match(svg, new RegExp(`\\.${cls}\\{`), cls);
    assert.doesNotMatch(svg, /<script|href="http/);
});

// ── shapes from kinds and tags ──────────────────────────────────────────────

test("person, system, container, component, database, and external shapes", () => {
    const containers = renderView(model, view("containers"));
    const block = (svg, id) => svg.slice(svg.indexOf(`data-element="${id}"`), svg.indexOf("</g>", svg.indexOf(`data-element="${id}"`)));
    assert.match(block(containers, "customer"), /<circle class="c4-fill-person"/);
    assert.match(block(containers, "shop.db"), /<path class="c4-fill-container"[^>]* d="M[^"]*A/);
    assert.match(block(containers, "shop.web"), /<rect class="c4-fill-container"/);
    assert.match(block(containers, "mail"), /class="c4-fill-external"/);
    assert.match(block(containers, "warehouse"), /class="c4-fill-softwareSystem"/);
    assert.match(block(renderView(model, view("components")), "shop.api.orders"), /<rect class="c4-fill-component"/);
});

test("the legend names each style, shape, and line the view uses, and nothing else", () => {
    const legend = (svg) => [...svg.slice(svg.indexOf('<g class="c4-legend">')).matchAll(/font-size="12">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(legend(renderView(model, view("containers"))), ["Person", "Software System", "Container", "External", "Database", "Boundary", "Group", "Relationship", "Implied relationship"]);
    assert.deepEqual(legend(renderView(model, view("context"))), ["Person", "Software System", "External", "Group", "Relationship", "Implied relationship"]);
});

// ── boundaries, groups, and layout ──────────────────────────────────────────

test("the scope is a labelled boundary around its own elements and nothing else", () => {
    const { nodes, boundary } = arrange(model, view("containers"));
    const inside = (n) => n.x >= boundary.x && n.y >= boundary.y && n.x + n.w <= boundary.x + boundary.w && n.y + n.h <= boundary.y + boundary.h;
    const overlaps = (n) => n.x < boundary.x + boundary.w && n.x + n.w > boundary.x && n.y < boundary.y + boundary.h && n.y + n.h > boundary.y;
    for (const node of nodes) {
        if (node.element.parent === "shop") assert.ok(inside(node), node.element.id);
        else assert.ok(!overlaps(node), node.element.id);
    }
    assert.match(renderView(model, view("containers")), />Shop \[Software System\]</);
    assert.match(renderView(model, view("components")), />API \[Container\]</);
});

test("groups are labelled bands that hold their members and no other element", () => {
    const { nodes, groupRects } = arrange(model, view("landscape"));
    assert.deepEqual(groupRects.map((g) => g.name), ["Shop company"]);
    const [band] = groupRects;
    for (const node of nodes) {
        const within = node.x >= band.x && node.x + node.w <= band.x + band.w && node.y >= band.y && node.y + node.h <= band.y + band.h;
        assert.equal(within, node.element.group === "Shop company", node.element.id);
    }
    assert.match(renderView(model, view("landscape")), />Shop company</);
});

test("ranks follow relationships, and no two boxes overlap in any direction", () => {
    for (const direction of ["tb", "bt", "lr", "rl"]) {
        const source = fixture.replace(/autolayout lr/, `autolayout ${direction}`).replace("systemLandscape landscape \"Everything the shop company runs and uses\" {", `systemLandscape landscape {\n            autolayout ${direction}`);
        const m = read(source);
        for (const key of ["landscape", "context", "containers", "components"]) {
            const { nodes } = arrange(m, view(key, m));
            for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
                const [a, b] = [nodes[i], nodes[j]];
                assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${direction} ${key}: ${a.element.id} and ${b.element.id} overlap`);
            }
        }
    }
    const { nodes } = arrange(model, view("components"));
    const rank = (id) => nodes.find((n) => n.element.id === id).rank;
    assert.ok(rank("shop.api.orders") < rank("shop.api.stock") && rank("shop.api.stock") < rank("shop.db"), "a relationship's destination ranks below its source");
});

test("a line that skips a rank runs in a lane no box occupies", () => {
    const { nodes, lines } = arrange(model, view("landscape"));
    const routed = lines.filter((l) => l.route);
    assert.ok(routed.length > 0, "the fixture has a line that skips a rank");
    for (const line of routed) {
        const low = Math.min(line.route.gapOut, line.route.gapIn);
        const high = Math.max(line.route.gapOut, line.route.gapIn);
        for (const node of nodes) {
            const crosses = node.x < line.route.lane && node.x + node.w > line.route.lane && node.y < high && node.y + node.h > low;
            assert.ok(!crosses, `${line.source} -> ${line.destination} crosses ${node.element.id}`);
        }
    }
});

// ── what a view selects ─────────────────────────────────────────────────────

test("landscape: every person and software system", () => {
    assert.deepEqual(ids(selectElements(model, view("landscape"))), ["customer", "clerk", "shop", "warehouse", "mail", "payments"]);
});

test("context: the scope and what is related to it, implied relationships included", () => {
    assert.deepEqual(ids(selectElements(model, view("context"))), ["customer", "shop", "warehouse", "mail", "payments"]);
});

test("container: the scope's containers and what is related to them, never the scope itself", () => {
    assert.deepEqual(ids(selectElements(model, view("containers"))), ["customer", "shop.web", "shop.api", "shop.db", "warehouse", "mail", "payments"]);
});

test("component: the scope's components and the containers, systems, and people related to them", () => {
    assert.deepEqual(ids(selectElements(model, view("components"))), ["shop.api.orders", "shop.api.stock", "shop.api.notify", "shop.db", "mail", "payments"]);
});

test("include by identifier, exclude, and an excluded relationship", () => {
    const m = read(wrapModel(
        'a = softwareSystem "A"\nb = softwareSystem "B"\nc = softwareSystem "C"\nab = a -> b "Calls"\na -> c "Reads"',
        'systemLandscape some {\ninclude a b c\nexclude c ab\n}',
    ));
    const shown = selectElements(m, view("some", m));
    assert.deepEqual(ids(shown), ["a", "b"]);
    assert.deepEqual(selectRelationships(m, view("some", m), shown), []);
});

test("a direct relationship is drawn as written; implied ones collapse to the first", () => {
    const lines = selectRelationships(model, view("containers"), selectElements(model, view("containers")));
    const between = (s, d) => lines.find((l) => l.source === s && l.destination === d);
    assert.equal(between("shop.web", "shop.api").implied, false);
    assert.deepEqual(between("shop.api", "shop.db").relationships.map((r) => r.source), ["shop.api.orders"]);
    assert.equal(between("shop.api", "shop.db").implied, true);
    assert.equal(between("mail", "customer").relationships[0].description, "Delivers mail to");
});

// ── edges of the input ──────────────────────────────────────────────────────

test("an empty view draws a titled picture that says so", () => {
    const m = read(wrapModel('a = softwareSystem "A"', "systemLandscape none {\n}"));
    assert.match(renderView(m, view("none", m)), /This view shows no elements\./);
});

test("names are escaped and long text wraps with an ellipsis", () => {
    const m = read(wrapModel('a = softwareSystem "R&D <lab>" "A description long enough that it cannot possibly fit on the three lines a box gives its description text"', "systemLandscape all {\ninclude *\n}"));
    const svg = renderView(m, view("all", m));
    assert.match(svg, />R&amp;D &lt;lab&gt;</);
    assert.ok(wrap("one two three four five six seven", 9, 2).at(-1).endsWith("…"));
    assert.deepEqual(wrap("short", 10, 2), ["short"]);
});

test("dynamic and deployment views are skipped by name, never drawn", () => {
    const { rendered, skipped } = renderViews(model);
    assert.deepEqual(rendered.map((r) => r.key), ["landscape", "context", "containers", "components"]);
    assert.deepEqual(skipped.map((s) => [s.key, s.kind]), [["checkout", "dynamic"]]);
    assert.throws(() => renderView(model, view("checkout")), /dynamic view/);
});
