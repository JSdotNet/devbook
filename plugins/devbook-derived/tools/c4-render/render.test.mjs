// The C4 view renderer, `render.mjs`, draws every view of the model devbook's
// `c4.mjs` reads. One golden SVG per view kind, and one for a deployment view
// with relationships to its nodes, pins the bytes; the rest pins
// what the goldens cannot say on their own: the same model gives the same bytes,
// a change outside a view leaves its file alone, the dark variant sits inside
// the SVG, the view selects the elements and relationships Structurizr's rules
// give it, a dynamic view numbers its steps in order, and a deployment view
// nests its nodes around what they hold and draws a relationship to or from a
// node to the node's box. Against a fixture repository: a
// refresh writes one SVG per view key, moves only what changed, deletes the
// render of a view that is gone, and `--check` reports drift and writes nothing.
//
// Run: `node --test render.test.mjs`. `UPDATE_GOLDEN=1` rewrites the goldens
// from the fixture; review the diff before committing it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseWorkspace } from "../../../devbook/tools/devbook-meta/c4.mjs";
import { arrange, main, renderView, renderViews, selectDeployment, selectElements, selectRelationships, selectSteps, wrap } from "./render.mjs";

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

for (const [key, kind] of [["landscape", "systemLandscape"], ["context", "systemContext"], ["containers", "container"], ["components", "component"], ["checkout", "dynamic"], ["live", "deployment"]]) {
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
    for (const key of ["context", "containers", "components", "checkout", "live"]) {
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
    assert.deepEqual(legend(renderView(model, view("checkout"))), ["Person", "Container", "External", "Database", "Boundary", "Group", "Numbered step"]);
    assert.deepEqual(legend(renderView(model, view("live"))), ["Deployment Node", "Infrastructure Node", "Software System", "Container", "Database", "Relationship", "Implied relationship"]);
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

// Every view of the fixture, laid out in each autolayout direction.
const DIRECTIONS = ["tb", "bt", "lr", "rl"].map((direction) => {
    const source = fixture
        .replace(/\n\s*autolayout \w+/g, "")
        .replace(/(\n\s*)include \*/g, `$1include *$1autolayout ${direction}`)
        .replace(/(\n\s*)(dynamic shop checkout [^{]*\{)/, `$1$2$1    autolayout ${direction}`);
    return [direction, read(source)];
});
const STATIC = ["landscape", "context", "containers", "components"];
const ALL = [...STATIC, "checkout", "live"];

test("ranks follow relationships, and no two boxes overlap in any direction", () => {
    for (const [direction, m] of DIRECTIONS) {
        for (const key of ALL) {
            assert.equal(view(key, m).autolayout.direction, direction);
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

// Points along a line: each polyline segment, or the cubic curve, sampled.
function sample(line) {
    const out = [];
    if (line.points) {
        for (let i = 0; i + 1 < line.points.length; i++) {
            const [[x0, y0], [x1, y1]] = [line.points[i], line.points[i + 1]];
            for (let t = 0; t <= 1; t += 0.05) out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
        }
        return out;
    }
    const [p0, p1, p2, p3] = line.curve;
    for (let t = 0; t <= 1; t += 0.02) {
        const u = 1 - t;
        out.push([0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }
    return out;
}

test("no line crosses a box, in any direction", () => {
    let routed = 0;
    for (const [direction, m] of DIRECTIONS) {
        for (const key of ALL) {
            const { nodes, lines } = arrange(m, view(key, m));
            for (const line of lines) {
                if (line.route.kind === "lane") routed++;
                for (const node of nodes) {
                    const hit = sample(line).some(([x, y]) => x > node.x + 1 && x < node.x + node.w - 1 && y > node.y + 1 && y < node.y + node.h - 1);
                    assert.ok(!hit, `${direction} ${key}: ${line.source} -> ${line.destination} crosses ${node.element.id}`);
                }
            }
        }
    }
    assert.ok(routed > 0, "the fixture has a line that skips a rank");
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

test("component: another system's container is shown as its system, never beside it", () => {
    const m = read(wrapModel(
        's = softwareSystem "S" {\nc = container "C" {\nx = component "X"\n}\nd = container "D"\n}\no = softwareSystem "O" {\ne = container "E"\n}\ns.c.x -> o.e "Calls"\ns.c.x -> s.d "Reads"',
        "component s.c parts {\ninclude *\n}",
    ));
    const shown = selectElements(m, view("parts", m));
    assert.deepEqual(ids(shown), ["s.c.x", "s.d", "o"]);
    assert.deepEqual(selectRelationships(m, view("parts", m), shown).map((l) => [l.source, l.destination, l.implied]), [["s.c.x", "o", true], ["s.c.x", "s.d", false]]);
});

test("control characters never reach the SVG", () => {
    const m = read(wrapModel('a = softwareSystem "A\\u0001"', "systemLandscape all {\ninclude *\n}"));
    m.elements[0].name = "A\u0001B";
    assert.doesNotMatch(renderView(m, view("all", m)), /\u0001/);
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

test("every keyed view is drawn, and a view with no key is skipped, having no file name", () => {
    const { rendered, skipped } = renderViews(model);
    assert.deepEqual(rendered.map((r) => r.key), ["landscape", "context", "containers", "components", "checkout", "live"]);
    assert.deepEqual(skipped, []);
    const m = read(wrapModel('a = softwareSystem "A"', "systemLandscape all {\ninclude *\n}"));
    m.views.push({ ...m.views[0], key: null });
    assert.deepEqual(renderViews(m).skipped.map((s) => [s.key, s.kind]), [[null, "systemLandscape"]]);
});

test("a view kind outside the six is refused by name", () => {
    const m = read(wrapModel('a = softwareSystem "A"', "systemLandscape all {\ninclude *\n}"));
    assert.throws(() => renderView(m, { ...m.views[0], kind: "filtered" }), /filtered view/);
});

// ── dynamic views ───────────────────────────────────────────────────────────

test("dynamic: one arrow per step, numbered, in step order, a response its own arrow", () => {
    const { shown, lines } = selectSteps(model, view("checkout"));
    assert.deepEqual(ids(shown), ["customer", "shop.web", "shop.api", "shop.db", "payments"]);
    assert.deepEqual(lines.map((l) => [l.step, l.source, l.destination]), [
        [1, "customer", "shop.web"], [2, "shop.web", "shop.api"], [3, "shop.api", "payments"],
        [4, "shop.api", "shop.db"], [5, "shop.api", "shop.web"], [6, "shop.web", "customer"],
    ]);
    const svg = renderView(model, view("checkout"));
    const arrows = [...svg.matchAll(/<g data-relationship="[^"]+" data-step="(\d+)">/g)].map((m) => Number(m[1]));
    assert.deepEqual(arrows, [1, 2, 3, 4, 5, 6], "every step is an arrow, drawn in step order");
    const labels = [...svg.matchAll(/text-anchor="middle">(\d+\. [^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(labels, ["1. Places an order", "2. Submits the order", "3. Charges the card", "4. Saves the order", "5. Confirms the order", "6. Shows the confirmation"]);
    assert.match(svg, /<title>\[Dynamic\] Shop<\/title>/);
});

test("dynamic: two steps between one pair never share a label's place", () => {
    const { lines } = arrange(model, view("checkout"));
    const svg = renderView(model, view("checkout"));
    const boxes = [...svg.matchAll(/<g class="c4-label"[^\n]*\n\s*<rect[^>]* x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/g)].map((m) => m.slice(1).map(Number));
    assert.equal(boxes.length, lines.length);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const [[ax, ay, aw, ah], [bx, by, bw, bh]] = [boxes[i], boxes[j]];
        assert.ok(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay, `labels of steps ${i + 1} and ${j + 1} overlap`);
    }
});

test("dynamic: scoped to a system, the scope is the boundary; unscoped, there is none", () => {
    assert.ok(arrange(model, view("checkout")).boundary, "scoped to shop");
    const m = read(wrapModel('a = softwareSystem "A"\nb = softwareSystem "B"\na -> b "Calls"', 'dynamic * flow {\na -> b "Asks"\nb -> a "Answers"\n}'));
    const { boundary, lines } = arrange(m, view("flow", m));
    assert.equal(boundary, null);
    assert.deepEqual(lines.map((l) => l.step), [1, 2]);
    assert.match(renderView(m, view("flow", m)), /<title>Dynamic<\/title>/);
});

// ── deployment views ────────────────────────────────────────────────────────

const holds = (outer, inner) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
const apart = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const LIVE = 'deployment * live live "The shop as it runs in production" {';

test("deployment: every instance and infrastructure node of the environment, drawn as what it is", () => {
    const { shown, nodes, lines } = selectDeployment(model, view("live"));
    assert.deepEqual(ids(shown), ["live.cloud.gateway", "live.cloud.app.web", "live.cloud.app.api", "live.cloud.data.db", "live.site.planner"]);
    assert.deepEqual(shown.map((e) => e.kind), ["infrastructureNode", "container", "container", "container", "softwareSystem"]);
    assert.ok(shown.find((e) => e.id === "live.cloud.data.db").tags.includes("Database"), "an instance takes its container's tags");
    assert.deepEqual(ids(nodes), ["live.cloud", "live.cloud.app", "live.cloud.data", "live.site"]);
    assert.deepEqual(lines.map((l) => [l.source, l.destination, l.implied]), [
        ["live.cloud.app.web", "live.cloud.app.api", false],
        ["live.cloud.app.api", "live.cloud.data.db", true],
        ["live.cloud.app.api", "live.site.planner", false],
        ["live.cloud.gateway", "live.cloud.app.web", false],
    ]);
    const svg = renderView(model, view("live"));
    assert.match(svg, /<title>\[Deployment\] Live<\/title>/);
    assert.match(svg, />App Service</);
    assert.match(svg, />x2</);
    assert.match(svg, /\[Deployment Node: Linux\]/);
    assert.match(svg, /data-element="live.cloud.gateway">\n\s*<rect class="c4-fill-infrastructureNode"/);
    assert.match(svg, /data-element="live.cloud.data.db" data-instance-of="shop.db">\n\s*<path class="c4-fill-container"/);
    assert.doesNotMatch(renderView(model, view("containers")), /infrastructureNode/, "a view with no infrastructure node carries none of its rules");
});

test("deployment: nodes nest around what they hold, siblings apart, in every direction", () => {
    for (const [direction, m] of DIRECTIONS) {
        const { nodes, nodeRects } = arrange(m, view("live", m));
        assert.equal(nodeRects.length, 4);
        const rect = (id) => nodeRects.find((d) => d.element.id === id);
        for (const node of nodes) assert.ok(holds(rect(node.element.parent), node), `${direction}: ${node.element.id} sits in its node`);
        for (const d of nodeRects) {
            if (d.element.parent) assert.ok(holds(rect(d.element.parent), d), `${direction}: ${d.element.id} sits in its parent`);
            for (const other of nodeRects) {
                if (other !== d && other.element.parent === d.element.parent) assert.ok(apart(d, other), `${direction}: ${d.element.id} and ${other.element.id} overlap`);
            }
            for (const node of nodes) {
                const inside = node.element.parent === d.element.id || node.element.parent.startsWith(`${d.element.id}.`);
                if (!inside) assert.ok(apart(d, node), `${direction}: ${node.element.id} is drawn inside ${d.element.id}`);
            }
        }
    }
});

test("deployment: a system scope keeps its own containers' instances and the infrastructure", () => {
    const m = read(fixture.replace(LIVE, LIVE.replace("deployment *", "deployment shop")));
    const { shown, nodes } = selectDeployment(m, view("live", m));
    assert.deepEqual(ids(shown), ["live.cloud.gateway", "live.cloud.app.web", "live.cloud.app.api", "live.cloud.data.db"]);
    assert.deepEqual(ids(nodes), ["live.cloud", "live.cloud.app", "live.cloud.data"], "a node holding nothing shown is not drawn");
    assert.match(renderView(m, view("live", m)), /<title>\[Deployment\] Shop - Live<\/title>/);
    const byNode = read(fixture.replace(`${LIVE}\n            include *`, `${LIVE.replace("deployment *", "deployment shop")}\n            include live.site live.cloud.data`));
    assert.deepEqual(ids(selectDeployment(byNode, view("live", byNode)).shown), ["live.cloud.data.db"], "a node brings in only what is in scope");
    const byLeaf = read(fixture.replace(`${LIVE}\n            include *`, `${LIVE.replace("deployment *", "deployment shop")}\n            include live.site.planner`));
    assert.deepEqual(ids(selectDeployment(byLeaf, view("live", byLeaf)).shown), ["live.site.planner"], "a leaf named outright is shown");
});

// The fixture with a relationship from a leaf to a deployment node and one back,
// one between two deployment nodes, and one from a node to a leaf it holds,
// which is not drawn.
const NODE_LINES = fixture
    .replace('gateway -> app.web "Forwards requests to" "HTTPS"', 'gateway -> app.web "Forwards requests to" "HTTPS"\n                gateway -> data "Watches" "TCP"\n                data -> gateway "Reports to"\n                app -> app.web "Hosts"')
    .replace(/(\n {12}site = deploymentNode[^\n]*\n[^\n]*\n {12}\})/, '$1\n            site -> cloud "Replicates to" "VPN"');

test("golden: relationships to and from a deployment node draw byte for byte as live-nodes.svg", () => {
    const m = read(NODE_LINES);
    const svg = renderView(m, view("live", m));
    const file = path.join(here, "fixtures", "golden", "live-nodes.svg");
    if (process.env.UPDATE_GOLDEN) writeFileSync(file, svg);
    assert.equal(svg, readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
});

test("deployment: a relationship to or from a deployment node runs between its box and the other end", () => {
    const direct = read(NODE_LINES);
    assert.deepEqual(selectDeployment(direct, view("live", direct)).lines.filter((l) => l.toNode).map((l) => [l.source, l.destination, l.relationships[0].description]), [
        ["live.cloud.gateway", "live.cloud.data", "Watches"],
        ["live.cloud.data", "live.cloud.gateway", "Reports to"],
        ["live.site", "live.cloud", "Replicates to"],
    ], "a node's relationship with what it holds is not drawn");
    const overlap = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
    const onBorder = ([x, y], d) => ((x === d.x || x === d.x + d.w) && y >= d.y && y <= d.y + d.h) || ((y === d.y || y === d.y + d.h) && x >= d.x && x <= d.x + d.w);
    for (const direction of ["tb", "bt", "lr", "rl"]) {
        const m = read(NODE_LINES.replace(/\n\s*autolayout \w+/g, "").replace(/(\n\s*)include \*/g, `$1include *$1autolayout ${direction}`));
        const { nodes, lines, nodeRects } = arrange(m, view("live", m));
        assert.equal(view("live", m).autolayout.direction, direction);
        const rect = (id) => nodeRects.find((d) => d.element.id === id);
        const [there, back] = lines.filter((l) => l.toNode && [l.source, l.destination].includes("live.cloud.gateway"));
        const segments = (l) => l.points.slice(1).map((p, i) => JSON.stringify([l.points[i], p].sort()));
        assert.ok(!segments(there).some((s) => segments(back).includes(s)), `${direction}: a relationship and its reverse share no segment`);
        const svg = renderView(m, view("live", m));
        const label = (l) => {
            const [, x, y, w, h] = svg.match(new RegExp(`class="c4-label" data-relationship="${l.source} -> ${l.destination}">\\n\\s*<rect [^>]*x="(\\d+)" y="(\\d+)" width="(\\d+)" height="(\\d+)"`)).map(Number);
            return { x, y, w, h };
        };
        assert.ok(!overlap(label(there), label(back)),`${direction}: a relationship and its reverse keep their labels apart`);
        for (const line of lines.filter((l) => l.toNode)) {
            const [first, last] = [line.points[0], line.points[line.points.length - 1]];
            for (const [point, id] of [[first, line.source], [last, line.destination]]) {
                const box = rect(id) ?? nodes.find((node) => node.element.id === id);
                assert.ok(onBorder(point, box), `${direction}: ${line.source} -> ${line.destination} ends on ${id}`);
            }
            for (const node of nodes) {
                const hit = sample(line).some(([x, y]) => x > node.x + 1 && x < node.x + node.w - 1 && y > node.y + 1 && y < node.y + node.h - 1);
                assert.ok(!hit, `${direction}: ${line.source} -> ${line.destination} crosses ${node.element.id}`);
            }
            for (const id of [line.source, line.destination].filter(rect)) {
                const d = rect(id);
                const into = sample(line).some(([x, y]) => x > d.x + 1 && x < d.x + d.w - 1 && y > d.y + 1 && y < d.y + d.h - 1);
                assert.ok(!into, `${direction}: ${line.source} -> ${line.destination} runs into ${id}`);
            }
        }
    }
});

test("deployment: include and exclude by node, and one SVG per environment's view", () => {
    const source = fixture
        .replace(`${LIVE}\n            include *`, `${LIVE}\n            include live.cloud\n            exclude live.cloud.data`)
        .replace(/(\n {8}live = deploymentEnvironment)/, '\n        test = deploymentEnvironment "Test" {\n            box = deploymentNode "Box" {\n                one = containerInstance shop.web\n            }\n        }$1')
        .replace(/(\n {4}views \{)/, "$1\n        deployment * test test {\n            include *\n        }");
    const m = read(source);
    assert.deepEqual(ids(selectDeployment(m, view("live", m)).shown), ["live.cloud.gateway", "live.cloud.app.web", "live.cloud.app.api"]);
    assert.deepEqual(ids(selectDeployment(m, view("test", m)).shown), ["test.box.one"]);
    assert.deepEqual(renderViews(m).rendered.filter((r) => r.kind === "deployment").map((r) => r.key), ["test", "live"]);
});

// ── refresh, against a fixture repository ───────────────────────────────────
//
// The refresh paths run the renderer over `.devbook/arc42/workspace.dsl` into
// `.devbook/arc42/_meta/c4/`. A session never writes this repository's `_meta/`,
// so each test builds a throwaway repository under the system temp folder.

const goldenKeys = ["checkout", "components", "containers", "context", "landscape", "live"];
const workspacePath = ".devbook/arc42/workspace.dsl";
const rendersPath = ".devbook/arc42/_meta/c4";
const golden = (key) => readFileSync(path.join(here, "fixtures", "golden", `${key}.svg`), "utf8").replace(/\r\n/g, "\n");

const withRepo = async (body) => {
    const root = mkdtempSync(path.join(tmpdir(), "c4-refresh-"));
    try {
        mkdirSync(path.join(root, ".devbook", "arc42"), { recursive: true });
        writeFileSync(path.join(root, workspacePath), fixture);
        await body(root);
    } finally { rmSync(root, { recursive: true, force: true }); }
};
const renders = (root) => (existsSync(path.join(root, rendersPath)) ? readdirSync(path.join(root, rendersPath)).filter((f) => f.endsWith(".svg")).sort() : []);
const named = (keys) => keys.map((k) => `${k}.svg`);
const refresh = async (root, ...flags) => {
    const lines = [];
    const code = await main([...flags, workspacePath, rendersPath], { root, log: (l) => lines.push(l), warn: (l) => lines.push(l) });
    return { code, lines };
};

test("refresh: writes one SVG per view key, byte for byte as its golden file", () => withRepo(async (root) => {
    const { code, lines } = await refresh(root);
    assert.equal(code, 0);
    assert.deepEqual(renders(root), named(goldenKeys));
    for (const key of goldenKeys) assert.equal(readFileSync(path.join(root, rendersPath, `${key}.svg`), "utf8"), golden(key), key);
    assert.ok(lines.includes(`added    ${rendersPath}/context.svg`), lines.join("\n"));
}));

test("refresh: a second run moves nothing, and --check then passes", () => withRepo(async (root) => {
    await refresh(root);
    const file = path.join(root, rendersPath, "context.svg");
    const before = statSync(file).mtimeMs;
    const again = await refresh(root);
    assert.equal(again.code, 0);
    assert.deepEqual(again.lines, [`${rendersPath}: 6 renders already current`]);
    assert.equal(statSync(file).mtimeMs, before, "a current file is not rewritten");
    const checked = await refresh(root, "--check");
    assert.equal(checked.code, 0);
    assert.deepEqual(checked.lines, [`checked ${rendersPath}: 6 renders current`]);
}));

test("refresh: deletes the render of a view that no longer exists, and only .svg files", () => withRepo(async (root) => {
    await refresh(root);
    writeFileSync(path.join(root, rendersPath, "retired.svg"), "<svg/>");
    writeFileSync(path.join(root, rendersPath, "notes.txt"), "kept");
    const without = fixture.replace(/\n {8}systemLandscape landscape [^\n]*\{\n {12}include \*\n {8}\}/, "");
    assert.notEqual(without, fixture, "the fixture edit removes the landscape view");
    writeFileSync(path.join(root, workspacePath), without);
    const { code, lines } = await refresh(root);
    assert.equal(code, 0, lines.join("\n"));
    assert.deepEqual(renders(root), named(goldenKeys.filter((k) => k !== "landscape")));
    assert.ok(lines.includes(`removed  ${rendersPath}/landscape.svg`) && lines.includes(`removed  ${rendersPath}/retired.svg`), lines.join("\n"));
    assert.equal(readFileSync(path.join(root, rendersPath, "notes.txt"), "utf8"), "kept");
}));

test("refresh: a workspace with a problem still writes what reads and deletes nothing", () => withRepo(async (root) => {
    await refresh(root);
    writeFileSync(path.join(root, rendersPath, "retired.svg"), "<svg/>");
    writeFileSync(path.join(root, workspacePath), fixture.replace("model {", "!include ../outside.dsl\n    model {"));
    const { code, lines } = await refresh(root);
    assert.equal(code, 1);
    assert.ok(lines.some((l) => l.includes("outside.dsl")), lines.join("\n"));
    assert.ok(lines.includes(`kept     ${rendersPath}/retired.svg: names no view, but the workspace has a problem`), lines.join("\n"));
    assert.ok(existsSync(path.join(root, rendersPath, "retired.svg")));
    assert.ok((await refresh(root, "--check")).lines.includes(`orphan   ${rendersPath}/retired.svg`));
}));

test("refresh: a usage error exits 2 and touches nothing", () => withRepo(async (root) => {
    for (const argv of [[workspacePath], [workspacePath, rendersPath, "extra"], ["--write", workspacePath, rendersPath]]) {
        assert.equal(await main(argv, { root, log: () => {}, warn: () => {} }), 2, argv.join(" "));
    }
    assert.deepEqual(renders(root), []);
}));

test("refresh: --check reports a missing, stale, or orphaned render, exits 1, and writes nothing", () => withRepo(async (root) => {
    const fresh = await refresh(root, "--check");
    assert.equal(fresh.code, 1);
    assert.equal(fresh.lines.filter((l) => l.startsWith("missing  ")).length, 6);
    assert.deepEqual(renders(root), [], "--check created nothing");
    await refresh(root);
    writeFileSync(path.join(root, rendersPath, "context.svg"), "<svg>old</svg>");
    rmSync(path.join(root, rendersPath, "live.svg"));
    writeFileSync(path.join(root, rendersPath, "retired.svg"), "<svg/>");
    const { code, lines } = await refresh(root, "--check");
    assert.equal(code, 1);
    assert.deepEqual(lines, [`missing  ${rendersPath}/live.svg`, `stale    ${rendersPath}/context.svg`, `orphan   ${rendersPath}/retired.svg`]);
    assert.equal(readFileSync(path.join(root, rendersPath, "context.svg"), "utf8"), "<svg>old</svg>", "--check rewrote nothing");
    assert.ok(existsSync(path.join(root, rendersPath, "retired.svg")), "--check deleted nothing");
}));

test("refresh: with the workspace gone every render is an orphan; with no renders either, nothing is created", () => withRepo(async (root) => {
    await refresh(root);
    rmSync(path.join(root, workspacePath));
    assert.equal((await refresh(root, "--check")).lines.filter((l) => l.startsWith("orphan   ")).length, 6);
    assert.equal((await refresh(root)).code, 0);
    assert.deepEqual(renders(root), []);
    rmSync(path.join(root, rendersPath), { recursive: true });
    assert.equal((await refresh(root)).code, 0);
    assert.ok(!existsSync(path.join(root, rendersPath)), "no folder is created for no views");
}));

test("refresh: materialized under .devbook/_tools/c4-render/, it runs from the root on devbook's vendored reader", () => withRepo(async (root) => {
    const devbookMeta = path.join(here, "..", "..", "..", "devbook", "tools", "devbook-meta");
    for (const [from, to] of [[path.join(here, "render.mjs"), "c4-render/render.mjs"], [path.join(devbookMeta, "c4.mjs"), "devbook-meta/c4.mjs"]]) {
        mkdirSync(path.join(root, ".devbook", "_tools", path.dirname(to)), { recursive: true });
        copyFileSync(from, path.join(root, ".devbook", "_tools", to));
    }
    const cli = (...flags) => spawnSync(process.execPath, [".devbook/_tools/c4-render/render.mjs", ...flags, workspacePath, rendersPath], { cwd: root, encoding: "utf8" });
    assert.equal(cli("--check").status, 1);
    const written = cli();
    assert.equal(written.status, 0, written.stderr);
    assert.deepEqual(renders(root), named(goldenKeys));
    assert.equal(cli("--check").status, 0);
    assert.equal(cli("--bogus").status, 2);
}));
