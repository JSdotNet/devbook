// 039-context-map-joins-c4 against a devbook still carrying its context map:
// each context gets its element in the workspace and `c4` on its context.md,
// the relationships and the subdomain class land in the workspace, the
// published languages and strategic rules in chapter 8, every reference to the
// map is rewritten, the map is deleted, line endings survive, a second run
// changes nothing, and a map it cannot place blocks the run and writes nothing.
//
//   node --test plugins/devbook/migrations/039-context-map-joins-c4/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readWorkspace } from "../../tools/devbook-meta/c4.mjs";
import { validateDocument } from "../../tools/devbook-meta/metadata.mjs";
import { describe, mermaidRows, relationshipRows, tables } from "./migrate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";
const meta = (body) => `${F}meta\n${body}${F}\n`;

function repo(files, adopted = ["domain", "arc42"]) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-039-"));
    const stamp = { id: "shop", components: { devbook: { adopted } } };
    for (const [rel, content] of Object.entries({ ".devbook/config.json": JSON.stringify(stamp, null, 2) + "\n", ...files })) {
        if (content === null) continue;
        mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        writeFileSync(path.join(root, rel), content, "utf8");
    }
    return root;
}
function withRepo(files, body, adopted) {
    const root = repo(files, adopted);
    try {
        return body(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");

const WORKSPACE = `workspace "Shop" {

    !identifiers hierarchical

    model {
        shop = softwareSystem "Shop" "Sells things." {
            app = container "App" "The modular monolith." "dotnet"
        }
    }

    views {
        container shop containers {
            include *
            autolayout lr
        }
    }
}
`;

const MAP = `# Shop

${meta("type: context-map\n")}
## Ordering

${meta("type: bounded-context\ndeployment: module\nrelated: [.devbook/domain/ordering/context.md, .devbook/arc42/building-blocks/app.md]\n")}
Takes orders, inside the monolith.

## Billing

${meta("type: bounded-context\ndeployment: service\nrelated: [.devbook/domain/billing/context.md]\n")}
Bills customers, on its own.

## Subdomain landscape

| Subdomain | Classification | Bounded context |
|---|---|---|
| Sales | Core | Ordering |
| Money | Supporting domain | Billing |

## Context map

| Downstream | Upstream | Pattern | Why |
|---|---|---|---|
| Billing | Ordering | Customer/Supplier | reads the order total |

## Published languages

The order event schema, defined in [Ordering](ordering/context.md).

## Strategic rules

- No context reads another's database.
`;

const files = (overrides = {}) => ({
    ".devbook/arc42/workspace.dsl": WORKSPACE,
    ".devbook/arc42/05-building-block-view.md": `# 05. Building Block View\n\n${meta("number: 5\n")}\n![Containers](c4:containers)\n`,
    ".devbook/arc42/08-crosscutting-concepts.md": `# 08. Crosscutting Concepts\n\n${meta("number: 8\n")}\nShared ideas.\n`,
    ".devbook/arc42/building-blocks/app.md": `# App\n\n${meta("c4: [shop.app]\ncode: [src/App]\n")}\nThe monolith.\n`,
    ".devbook/domain/context-map.md": MAP,
    ".devbook/domain/ordering/context.md": `# Ordering\n\n${meta("index: root\ntype: context\ndeployment: module\nrelated: [.devbook/arc42/building-blocks/app.md]\n")}\nOwns the order from cart to confirmation. See [the map](../context-map.md#billing).\n`,
    ".devbook/domain/ordering/domain.md": `# Domain\n\n${meta("type: domain\n")}\n## Order\n\n${meta('type: aggregate\nrelated: [".devbook/domain/context-map.md#billing", ".devbook/domain/billing/context.md"]\n')}\nAn order. Its languages are [published](../context-map.md#published-languages).\n`,
    ".devbook/domain/billing/context.md": `# Billing\n\n${meta("index: root\ntype: context\ndeployment: service\n")}\nBills the customer.\n`.replace(/\n/g, "\r\n"),
    ".devbook/domain/shipping/context.md": `# Shipping\n\n${meta("index: root\ntype: context\n")}\nShips parcels.\n`,
    ...overrides,
});

test("--check reports the work and writes nothing", () => withRepo(files(), (root) => {
    const r = run(root, "--check");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /delete \.devbook\/domain\/context-map\.md/);
    assert.ok(existsSync(path.join(root, ".devbook/domain/context-map.md")));
    assert.equal(read(root, ".devbook/arc42/workspace.dsl"), WORKSPACE);
}));

test("the map joins the workspace and chapter 8, and a second run changes nothing", () => withRepo(files(), (root) => {
    const applied = run(root);
    assert.equal(applied.status, 0, applied.stdout + applied.stderr);
    assert.ok(!existsSync(path.join(root, ".devbook/domain/context-map.md")), "the map is deleted");

    const ws = readWorkspace(".devbook/arc42/workspace.dsl", { root });
    assert.deepEqual(ws.problems, [], "the workspace reads cleanly");
    const el = (id) => ws.elements.find((e) => e.id === id);
    assert.equal(el("shop.app.ordering")?.kind, "component", "a module is a component of its host");
    assert.equal(el("shop.billing")?.kind, "container", "a service is a container of the system");
    assert.deepEqual(el("shop.app.ordering").tags.filter((t) => t !== "Element" && t !== "Component"), ["Core"]);
    assert.ok(el("shop.billing").tags.includes("Supporting"), "the subdomain class is a tag");
    assert.equal(el("shop.billing").description, "Bills customers, on its own.");
    const rel = ws.relationships.find((x) => x.source === "shop.billing" && x.destination === "shop.app.ordering");
    assert.equal(rel?.description, "Customer/Supplier: reads the order total", "the DDD pattern opens the description");

    const ordering = read(root, ".devbook/domain/ordering/context.md");
    assert.match(ordering, /type: context\nc4: \[shop\.app\.ordering\]\n/);
    assert.doesNotMatch(ordering, /deployment/);
    assert.match(ordering, /\[the map\]\(\.\.\/billing\/context\.md\)/, "a link to a context's section lands on its context.md");
    const billing = read(root, ".devbook/domain/billing/context.md");
    assert.match(billing, /\r\nc4: \[shop\.billing\]\r\n/, "a CRLF file keeps its line endings");
    assert.doesNotMatch(billing, /deployment/);
    assert.doesNotMatch(read(root, ".devbook/domain/shipping/context.md"), /c4:/, "a context with nothing to name is left for a person");

    const domain = read(root, ".devbook/domain/ordering/domain.md");
    assert.match(domain, /related: \["\.devbook\/domain\/billing\/context\.md"\]/, "a related entry is rewritten and deduplicated");
    assert.match(domain, /\(\.\.\/\.\.\/arc42\/08-crosscutting-concepts\.md#published-languages\)/);

    const eight = read(root, ".devbook/arc42/08-crosscutting-concepts.md");
    assert.match(eight, /## Published languages\n\n```meta\nrelated: \[\.devbook\/arc42\/05-building-block-view\.md\]\n```\n\nThe order event schema, defined in \[Ordering\]\(\.\.\/domain\/ordering\/context\.md\)\./);
    assert.match(eight, /## Strategic rules[\s\S]*No context reads another's database\./);

    for (const rel of [".devbook/domain/ordering/context.md", ".devbook/domain/ordering/domain.md", ".devbook/arc42/08-crosscutting-concepts.md"]) {
        const errors = validateDocument(rel, read(root, rel)).filter((i) => i.severity === "error");
        assert.deepEqual(errors, [], `${rel} validates`);
    }

    const again = run(root, "--check");
    assert.equal(again.status, 0, again.stdout);
    const snapshot = read(root, ".devbook/arc42/workspace.dsl");
    assert.equal(run(root).status, 0);
    assert.equal(read(root, ".devbook/arc42/workspace.dsl"), snapshot, "a second run changes nothing");
}));

test("an existing element is reused and tagged in place", () => withRepo(files({
    ".devbook/arc42/workspace.dsl": WORKSPACE.replace(`app = container "App" "The modular monolith." "dotnet"`, `app = container "App" "The modular monolith." "dotnet" {\n                ordering = component "Ordering" "Takes orders."\n            }\n            billing = container "Billing" "Bills."`),
}), (root) => {
    assert.equal(run(root).status, 0);
    const ws = readWorkspace(".devbook/arc42/workspace.dsl", { root });
    assert.deepEqual(ws.problems, []);
    assert.equal(ws.elements.filter((e) => e.name === "Ordering").length, 1, "no second Ordering");
    assert.ok(ws.elements.find((e) => e.id === "shop.app.ordering").tags.includes("Core"));
    assert.ok(ws.elements.find((e) => e.id === "shop.billing").tags.includes("Supporting"));
}));

test("a relationship naming no context blocks the run and writes nothing", () => withRepo(files({
    ".devbook/domain/context-map.md": MAP.replace("| Billing | Ordering |", "| Warehouse | Ordering |"),
}), (root) => {
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /blocked .*Warehouse/);
    assert.ok(existsSync(path.join(root, ".devbook/domain/context-map.md")));
    assert.equal(read(root, ".devbook/arc42/workspace.dsl"), WORKSPACE);
    assert.match(read(root, ".devbook/domain/ordering/context.md"), /deployment: module/);
}));

test("a repository without domain/ is not-applicable", () => withRepo({}, (root) => {
    const r = run(root, "--check");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /not-applicable/);
}, ["arc42"]));

test("a `deployment` on context.md alone still moves, with no map", () => withRepo(files({ ".devbook/domain/context-map.md": null }), (root) => {
    assert.equal(run(root).status, 0);
    assert.match(read(root, ".devbook/domain/ordering/context.md"), /c4: \[shop\.app\.ordering\]/);
    assert.equal(run(root, "--check").status, 0);
}));

test("two contexts that share a host get no self-relationship and keep one class", () => withRepo(files({
    ".devbook/domain/context-map.md": MAP.replace("deployment: module\n", "").replace("deployment: service\nrelated: [.devbook/domain/billing/context.md]", "related: [.devbook/domain/billing/context.md, .devbook/arc42/building-blocks/app.md]"),
    ".devbook/domain/ordering/context.md": `# Ordering\n\n${meta("index: root\ntype: context\nrelated: [.devbook/arc42/building-blocks/app.md]\n")}\nOrders.\n`,
    ".devbook/domain/billing/context.md": `# Billing\n\n${meta("index: root\ntype: context\nrelated: [.devbook/arc42/building-blocks/app.md]\n")}\nBills.\n`,
}), (root) => {
    const r = run(root);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /is not carried — both contexts name `shop\.app`/);
    assert.match(r.stdout, /class `(Core|Supporting)` is not carried: its element `shop\.app` is already tagged/);
    const ws = readWorkspace(".devbook/arc42/workspace.dsl", { root });
    assert.equal(ws.relationships.filter((x) => x.source === x.destination).length, 0, "no self-relationship");
    assert.match(read(root, ".devbook/domain/billing/context.md"), /c4: \[shop\.app\]/);
}));

test("a new chapter 8 carries no link to the deleted map", () => withRepo(files({
    ".devbook/arc42/08-crosscutting-concepts.md": null,
    ".devbook/domain/context-map.md": MAP.replace("defined in [Ordering](ordering/context.md).", "defined in [Ordering](ordering/context.md), billed per [Billing](context-map.md#billing) under [the rules](#strategic-rules)."),
}), (root) => {
    assert.equal(run(root).status, 0);
    const eight = read(root, ".devbook/arc42/08-crosscutting-concepts.md");
    assert.doesNotMatch(eight, /context-map\.md/);
    assert.match(eight, /\[Billing\]\(\.\.\/domain\/billing\/context\.md\)/);
    assert.match(eight, /\[the rules\]\(08-crosscutting-concepts\.md#strategic-rules\)/);
}));

test("a reference left by a map deleted by hand is still rewritten", () => withRepo(files({ ".devbook/domain/context-map.md": null }), (root) => {
    assert.equal(run(root, "--check").status, 1, "the reference in domain.md is work");
    assert.equal(run(root).status, 0);
    assert.doesNotMatch(read(root, ".devbook/domain/ordering/domain.md"), /context-map\.md/);
}));

test("the parsers read a relationship table and a Mermaid flowchart", () => {
    const [t] = tables(["| Consumer | Supplier | Relationship | Notes |", "|---|---|---|---|", "| `A` | [B](b.md) | ACL | reads b |"]);
    assert.deepEqual(relationshipRows(t), [{ from: "A", to: "B", pattern: "ACL", description: "reads b" }]);
    assert.deepEqual(mermaidRows(["flowchart LR", "  a[Ordering] -->|ACL: reads totals| b[Billing]", "  b --> c"]), [
        { from: "Ordering", to: "Billing", pattern: "ACL", description: "reads totals" },
        { from: "Billing", to: "c", pattern: "", description: "" },
    ]);
    assert.equal(describe({ pattern: "OHS + Published Language", description: "" }), "OHS + Published Language");
});
