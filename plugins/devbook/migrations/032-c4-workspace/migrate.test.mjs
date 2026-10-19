// 032-c4-workspace against a fixture repository holding every source form it meets: a
// workspace under `_c4/` with an include; Mermaid C4Context, C4Container, C4Component,
// C4Dynamic and C4Deployment fences; a sequence whose participants match, one whose do
// not, and one an Archify sequence spec re-draws; an Archify architecture spec over a
// flowchart fence and a lifecycle spec; a C4 fence in a chapter its view does not belong
// in; and debt records with `## Severity` and `## Status` sections. Also: `--check`
// writes nothing, a second run changes nothing, the result passes the devbook check, a
// repository with no workspace gets one, and one without `arc42/` is not-applicable.
//
//   node --test plugins/devbook/migrations/032-c4-workspace/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readWorkspace } from "../../tools/devbook-meta/c4.mjs";
import { buildGraph } from "../../tools/devbook-meta/graph.mjs";
import { fenceHash, migrateDebtRecord } from "./migrate.mjs";
import { parseMermaidC4, parseSequence } from "./diagrams.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";
const A = ".devbook/arc42";

const chapter = (title, body) => `# ${title}\n\n${F}meta\n${F}\n\n${body}`;

const SHOP = `workspace "Shop" {

    !identifiers hierarchical

    model {
        !include people.dsl
        shop = softwareSystem "Shop" "Sells things." {
            web = container "Web" "Serves the pages." "ASP.NET Core"
        }
        customer -> shop.web "Browses" "HTTPS"
    }

    views {
    }
}
`;
const PEOPLE = `customer = person "Customer" "Buys things."\n`;

const CONTEXT = `${F}mermaid
C4Context
    title Shop in context
    Person(customer, "Customer", "Buys things")
    System(shop, "Shop", "Sells things")
    System_Ext(mail, "Mail", "Sends the order mail")
    Rel(shop, mail, "Sends mail", "SMTP")
    UpdateLayoutConfig($c4ShapeInRow="3")
${F}`;

const CONTAINERS = `${F}mermaid
C4Container
    Person(customer, "Customer")
    System_Boundary(b0, "Online shop") {
        Container(web, "Web", "ASP.NET Core", "Serves the pages")
        Container(api, "API", "C#", "Takes orders")
        ContainerDb(db, "Database", "PostgreSQL", "Holds orders")
    }
    Rel(web, api, "Calls", "HTTPS/JSON")
    Rel(api, db, "Reads and writes", "EF Core")
${F}`;

const COMPONENTS = `${F}mermaid
C4Component
    Container_Boundary(api, "API") {
        Component(orders, "Orders", "C# class", "Order logic")
        Component(payments, "Payments", "C# class", "Takes payment")
    }
    Rel(orders, payments, "Charges")
${F}`;

const FLOW = `${F}mermaid
flowchart LR
    worker --> queue
${F}`;

const MISPLACED = `${F}mermaid
C4Context
    Person(customer, "Customer", "Buys things")
${F}`;

const DYNAMIC = `${F}mermaid
C4Dynamic
    Rel(customer, web, "Places an order")
    Rel(web, api, "Submits the order")
${F}`;

const SEQUENCE = `${F}mermaid
sequenceDiagram
    actor Customer
    participant Web
    participant API
    Customer->>Web: Opens the basket
    Web->>Web: Renders it
    Web->>API: Reads the basket
    API-->>Web: The basket
${F}`;

const UNMATCHED = `${F}mermaid
sequenceDiagram
    participant Cache as Redis cache
    participant API
    API->>Cache: Reads
${F}`;

const REDRAWN = `${F}mermaid
sequenceDiagram
    participant W as Web front end
    participant A as Order API
    W->>A: Pays
${F}`;

const DEPLOYMENT = `${F}mermaid
C4Deployment
    Deployment_Node(cloud, "Cloud", "Azure", "Where it runs") {
        Deployment_Node(app, "App Service", "Linux") {
            Container(web, "Web", "ASP.NET Core")
        }
    }
${F}`;

const ARCHITECTURE = {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "Workers" },
    components: [
        { id: "worker", type: "backend", label: "Worker", sublabel: ".NET worker" },
        { id: "queue", type: "database", label: "Queue", sublabel: "Azure Service Bus" },
        { id: "payer", type: "external", label: "Payment Provider", sublabel: "Takes card payments" },
    ],
    boundaries: [{ kind: "region", label: "Online shop", wraps: ["worker", "queue"] }],
    connections: [
        { id: "w-q", from: "worker", to: "queue", label: "drains (AMQP)" },
        { id: "w-p", from: "worker", to: "payer", label: "charges cards" },
    ],
    cards: [{ title: "Parts", items: ["Worker — Runs the background jobs", "Queue — Holds the jobs"] }],
};
const ARCHIFY_SEQUENCE = {
    schema_version: 1,
    diagram_type: "sequence",
    meta: { title: "Paying" },
    participants: [{ id: "w", label: "Web" }, { id: "a", label: "API" }],
    messages: [{ id: "pay", from: "w", to: "a", label: "Pays (HTTPS)" }],
};
const LIFECYCLE = { schema_version: 1, diagram_type: "lifecycle", meta: { title: "Order states" }, states: [], transitions: [] };

const bodyOf = (fence) => fence.split("\n").slice(1, -1).join("\n");

function fixture({ workspace = true } = {}) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-032-"));
    const write = (rel, text) => {
        mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        writeFileSync(path.join(root, rel), typeof text === "string" ? text : `${JSON.stringify(text, null, 2)}\n`);
    };
    write(".devbook/config.json", { id: "shop", components: { devbook: { adopted: ["arc42"] } } });
    if (workspace) {
        write(`${A}/_c4/shop.dsl`, SHOP);
        write(`${A}/_c4/people.dsl`, PEOPLE);
        write(`${A}/_c4/references.json`, { views: {} });
    }
    write(`${A}/03-context-and-scope.md`, chapter("3. Context and Scope", `## Business Context\n\n${F}meta\n${F}\n\n${CONTEXT}\n`));
    write(`${A}/05-building-block-view.md`, chapter("5. Building Block View", [
        `## Container View\n\n${F}meta\n${F}\n\n${CONTAINERS}\n`,
        `## API\n\n${F}meta\n${F}\n\n${COMPONENTS}\n`,
        `## Workers\n\n${F}meta\n${F}\n\n${FLOW}\n`,
    ].join("\n")));
    write(`${A}/06-runtime-view.md`, chapter("6. Runtime View", [
        `## Placing an Order\n\n${F}meta\n${F}\n\n${DYNAMIC}\n`,
        `## Opening the Basket\n\n${F}meta\n${F}\n\n${SEQUENCE}\n`,
        `## Caching\n\n${F}meta\n${F}\n\n${UNMATCHED}\n`,
        `## Paying\n\n${F}meta\n${F}\n\n${REDRAWN}\n`,
        `## Order States\n\n${F}meta\n${F}\n\n${F}mermaid\nstateDiagram-v2\n    [*] --> Placed\n${F}\n`,
    ].join("\n")));
    write(`${A}/07-deployment-view.md`, chapter("7. Deployment View", `## Azure\n\n${F}meta\n${F}\n\n${DEPLOYMENT}\n`));
    write(`${A}/08-crosscutting-concepts.md`, chapter("8. Crosscutting Concepts", `## Who Buys\n\n${F}meta\n${F}\n\n${MISPLACED}\n`));
    write(`${A}/_archify/05-building-block-view.3.architecture.json`, ARCHITECTURE);
    write(`${A}/_archify/06-runtime-view.4.sequence.json`, ARCHIFY_SEQUENCE);
    write(`${A}/_archify/06-runtime-view.5.lifecycle.json`, LIFECYCLE);
    write(`${A}/_archify/index.json`, {
        schemaVersion: 1,
        entries: {
            [fenceHash(bodyOf(FLOW))]: { chapter: "05-building-block-view.md", ordinal: 3, type: "architecture", spec: "05-building-block-view.3.architecture.json", artifact: "05-building-block-view.3.architecture.html" },
            [fenceHash(bodyOf(REDRAWN))]: { chapter: "06-runtime-view.md", ordinal: 4, type: "sequence", spec: "06-runtime-view.4.sequence.json" },
            lifecycle: { chapter: "06-runtime-view.md", ordinal: 5, type: "lifecycle", spec: "06-runtime-view.5.lifecycle.json" },
        },
    });
    write(`${A}/_archify/05-building-block-view.3.architecture.html`, "<!doctype html>");
    write(`${A}/tdr/README.md`, `# Debt\n\n${F}meta\nindex: root\n${F}\n\nThe set.\n`);
    write(`${A}/tdr/1-no-retry.md`, `# 1. No Retry\n\n${F}meta\ndate: 2026-10-01\n${F}\n\n## Status\n\n**Planned** — next sprint.\n\n## Severity\n\n**High.** Orders are lost. It rises to **critical** at scale.\n`);
    write(`${A}/tdr/2-old-shape.md`, `# 2. Old Shape\n\n${F}meta\ndate: 2026-10-02\nstatus: active\n${F}\n\n## Status\n\n**Identified** — logged.\n\n## Severity\n\n**Low.**\n`);
    write(`${A}/tdr/3-no-sections.md`, `# 3. No Sections\n\n${F}meta\ndate: 2026-10-03\n${F}\n\nNothing ranked yet.\n`);
    return root;
}

const migrate = (root, ...args) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8" });
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");

function snapshot(root) {
    const out = {};
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            const full = path.join(dir, name);
            if (statSync(full).isDirectory()) walk(full);
            else out[path.relative(root, full).split(path.sep).join("/")] = createHash("sha256").update(readFileSync(full)).digest("hex");
        }
    };
    walk(root);
    return out;
}

test("--check lists every change and writes nothing", () => {
    const root = fixture();
    try {
        const before = snapshot(root);
        const r = migrate(root, "--check");
        assert.equal(r.status, 1, r.stdout + r.stderr);
        for (const expected of [
            "move .devbook/arc42/_c4/shop.dsl → .devbook/arc42/workspace.dsl",
            "move .devbook/arc42/_c4/people.dsl → .devbook/arc42/c4/people.dsl",
            "Mermaid `C4Context` → `systemContext` view `business-context`",
            "Mermaid `C4Container` → `container` view `container-view`",
            "Mermaid `C4Component` → `component` view `api`",
            "Archify architecture spec 05-building-block-view.3.architecture.json → `container` view `workers`",
            "Mermaid `C4Dynamic` → `dynamic` view `placing-an-order`",
            "Mermaid `sequenceDiagram` → `dynamic` view `opening-the-basket`",
            "Archify sequence spec 06-runtime-view.4.sequence.json → `dynamic` view `paying`",
            "Mermaid `C4Deployment` → `deployment` view `azure`",
            "set severity: high, status: planned on .devbook/arc42/tdr/1-no-retry.md",
            "set severity: low, status: identified",
        ]) assert.ok(r.stdout.includes(expected), `missing "${expected}" in:\n${r.stdout}`);
        assert.deepEqual(snapshot(root), before);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("apply moves the workspace, converts every fence it can, and reports the rest", async () => {
    const root = fixture();
    try {
        const r = migrate(root);
        assert.equal(r.status, 0, r.stdout + r.stderr);

        // the workspace moved, its include rewritten into c4/
        assert.ok(!existsSync(path.join(root, A, "_c4/shop.dsl")) && !existsSync(path.join(root, A, "_c4/people.dsl")));
        assert.ok(existsSync(path.join(root, A, "_c4/references.json")), "a non-workspace file in _c4/ stays");
        assert.match(r.stdout, /_c4\/references\.json stays/);
        const dsl = read(root, `${A}/workspace.dsl`);
        assert.match(dsl, /!include c4\/people\.dsl/);
        assert.equal(read(root, `${A}/c4/people.dsl`), PEOPLE);

        // the result reads clean, and holds what the diagrams drew
        const ws = readWorkspace(`${A}/workspace.dsl`, { root });
        assert.deepEqual(ws.problems, []);
        const ids = ws.elements.map((e) => e.id);
        for (const id of ["customer", "shop", "shop.web", "shop.api", "shop.db", "shop.api.orders", "shop.api.payments", "mail", "shop.worker", "shop.queue", "payer"]) assert.ok(ids.includes(id), `no ${id} in ${ids.join(", ")}`);
        assert.equal(ids.filter((id) => id === "shop.web").length, 1, "Web matched the existing container");
        assert.ok(ws.elements.find((e) => e.id === "shop.db").tags.includes("Database"));
        assert.equal(ws.elements.find((e) => e.id === "shop.worker").description, "Runs the background jobs");
        assert.ok(ws.relationships.some((r) => r.source === "shop.worker" && r.destination === "shop.queue" && r.technology === "AMQP"));
        assert.ok(ws.relationships.some((r) => r.source === "shop" && r.destination === "mail" && r.technology === "SMTP"));
        const views = Object.fromEntries(ws.views.map((v) => [v.key, v]));
        assert.equal(views["business-context"].kind, "systemContext");
        assert.equal(views["business-context"].scope, "shop");
        assert.equal(views["container-view"].scope, "shop");
        assert.equal(views.api.scope, "shop.api");
        assert.equal(views["placing-an-order"].steps.length, 2);
        assert.equal(views["opening-the-basket"].steps.length, 3, "the self-message has no step");
        assert.equal(views.paying.steps.length, 1);
        assert.equal(views.azure.kind, "deployment");
        assert.ok(ws.elements.some((e) => e.kind === "containerInstance" && e.instanceOf === "shop.web"));

        // each converted fence is its embed; the rest stay
        assert.match(read(root, `${A}/03-context-and-scope.md`), /^!\[Shop in context\]\(c4:business-context\)$/m);
        const blocks = read(root, `${A}/05-building-block-view.md`);
        for (const key of ["container-view", "api", "workers"]) assert.match(blocks, new RegExp(`\\(c4:${key}\\)`));
        assert.doesNotMatch(blocks, /```mermaid/);
        const runtime = read(root, `${A}/06-runtime-view.md`);
        assert.match(runtime, /\(c4:placing-an-order\)/);
        assert.match(runtime, /\(c4:paying\)/);
        assert.match(runtime, /participant Cache as Redis cache/, "the unmatched sequence stays");
        assert.match(runtime, /stateDiagram-v2/, "a diagram inside one element stays");
        assert.match(r.stdout, /Cache \("Redis cache"\) match no workspace element/);
        assert.match(read(root, `${A}/08-crosscutting-concepts.md`), /C4Context/, "the misplaced fence stays");
        assert.match(r.stdout, /08-crosscutting-concepts\.md:\d+: Mermaid `C4Context` would be a view that belongs in `03-context-and-scope\.md`/);

        // Archify: converted specs go with their index entries; a lifecycle spec stays, reported
        assert.ok(!existsSync(path.join(root, A, "_archify/05-building-block-view.3.architecture.json")));
        assert.ok(!existsSync(path.join(root, A, "_archify/05-building-block-view.3.architecture.html")));
        assert.ok(!existsSync(path.join(root, A, "_archify/06-runtime-view.4.sequence.json")));
        assert.ok(existsSync(path.join(root, A, "_archify/06-runtime-view.5.lifecycle.json")));
        assert.deepEqual(Object.keys(JSON.parse(read(root, `${A}/_archify/index.json`)).entries), ["lifecycle"]);
        assert.match(r.stdout, /06-runtime-view\.5\.lifecycle\.json: a `lifecycle` spec/);

        // debt records
        assert.match(read(root, `${A}/tdr/1-no-retry.md`), /```meta\ndate: 2026-10-01\nseverity: high\nstatus: planned\n```/);
        assert.match(read(root, `${A}/tdr/2-old-shape.md`), /```meta\ndate: 2026-10-02\nseverity: low\n```/);
        assert.doesNotMatch(read(root, `${A}/tdr/README.md`), /severity/);
        assert.match(r.stdout, /3-no-sections\.md: no `## Severity` section/);

        // the devbook check reads the result without an error
        const { problems } = await buildGraph(root);
        assert.deepEqual(problems.filter((p) => p.severity === "error"), []);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a second run changes nothing and --check passes", () => {
    const root = fixture();
    try {
        assert.equal(migrate(root).status, 0);
        const after = snapshot(root);
        const check = migrate(root, "--check");
        assert.equal(check.status, 0, check.stdout);
        assert.match(check.stdout, /no work left/);
        assert.equal(migrate(root).status, 0);
        assert.deepEqual(snapshot(root), after);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a repository with no workspace gets one, and the diagrams go into it", () => {
    const root = fixture({ workspace: false });
    try {
        const r = migrate(root);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.stdout, /created \.devbook\/arc42\/workspace\.dsl/);
        const ws = readWorkspace(`${A}/workspace.dsl`, { root });
        assert.deepEqual(ws.problems, []);
        assert.ok(ws.hierarchical);
        assert.equal(ws.name, "shop");
        assert.ok(ws.elements.some((e) => e.id === "shop"));
        assert.ok(ws.views.some((v) => v.key === "container-view"));
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a model left in _c4/ that cannot move strands nothing: no skeleton, no conversion", () => {
    for (const setup of [
        (root) => { mkdirSync(path.join(root, A, "c4")); writeFileSync(path.join(root, A, "c4/people.dsl"), "keep me\n"); },
        (root) => writeFileSync(path.join(root, A, "_c4/other.dsl"), 'workspace "Other" {\n}\n'),
    ]) {
        const root = fixture();
        try {
            setup(root);
            const r = migrate(root);
            assert.equal(r.status, 0, r.stdout + r.stderr);
            assert.match(r.stdout, /no diagram converted/);
            assert.ok(!existsSync(path.join(root, A, "workspace.dsl")));
            assert.ok(existsSync(path.join(root, A, "_c4/shop.dsl")));
            if (existsSync(path.join(root, A, "c4/people.dsl"))) assert.equal(read(root, `${A}/c4/people.dsl`), "keep me\n");
            assert.match(read(root, `${A}/03-context-and-scope.md`), /C4Context/);
            assert.match(read(root, `${A}/tdr/1-no-retry.md`), /severity: high/, "debt records are still ranked");
        } finally { rmSync(root, { recursive: true, force: true }); }
    }
});

test("what it will not guess: an unnamed twin, a stray artifact path, a sequence outside 06, a ladder of the repository's own", () => {
    const root = fixture();
    try {
        writeFileSync(path.join(root, A, "_c4/people.dsl"), `${PEOPLE}softwareSystem "Mail" "Sends mail, with no identifier."\n`);
        writeFileSync(path.join(root, A, "08-crosscutting-concepts.md"), chapter("8. Crosscutting Concepts", `## Retries\n\n${F}meta\n${F}\n\n${F}mermaid\nsequenceDiagram\n    Worker->>Timer: Waits\n${F}\n`));
        const index = JSON.parse(read(root, `${A}/_archify/index.json`));
        index.entries[fenceHash(bodyOf(FLOW))].artifact = "../../config.json";
        writeFileSync(path.join(root, A, "_archify/index.json"), JSON.stringify(index));
        writeFileSync(path.join(root, ".devbook/statuses.json"), JSON.stringify({ folders: { arc42: { rules: [{ files: ["tdr/**"], scope: "file", statuses: ["open", "closed"] }] } } }));
        const r = migrate(root);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.stdout, /"Mail" names more than one softwareSystem/);
        assert.match(read(root, `${A}/03-context-and-scope.md`), /C4Context/, "the fence naming the unnamed system stays");
        assert.match(r.stdout, /Timer match no workspace element, so it draws inside one element and may stay/);
        assert.ok(existsSync(path.join(root, ".devbook/config.json")), "an artifact path outside _archify/ is never deleted");
        assert.match(r.stdout, /statuses\.json` gives `tdr\/` a ladder of its own/);
        assert.match(read(root, `${A}/tdr/1-no-retry.md`), /```meta\ndate: 2026-10-01\nseverity: high\n```/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a repository without arc42/ is not-applicable", () => {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-032-"));
    try {
        mkdirSync(path.join(root, ".devbook"));
        writeFileSync(path.join(root, ".devbook/config.json"), JSON.stringify({ components: { devbook: { adopted: ["domain"] } } }));
        for (const args of [["--check"], []]) {
            const r = migrate(root, ...args);
            assert.equal(r.status, 0);
            assert.match(r.stdout, /not-applicable/);
        }
        assert.ok(!existsSync(path.join(root, A)));
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the readers: macros, boundaries, and sequence arrows", () => {
    const c4 = parseMermaidC4("C4Container\n  Boundary(g, \"Group\") {\n    SystemQueue_Ext(q, \"Bus\", \"Carries events\")\n  }\n  BiRel(q, q2, \"x\")\n  Rel_Back(a, b, \"y\")\n  Wibble(a)\n");
    assert.equal(c4.nodes.get("q").kind, "softwareSystem");
    assert.deepEqual(c4.nodes.get("q").tags, ["External", "Queue"]);
    assert.equal(c4.nodes.get("q").parent, "g");
    assert.ok(c4.problems.some((p) => /`Wibble` is not a C4 statement/.test(p)));
    assert.ok(c4.problems.some((p) => /`q2`, which the diagram never declares/.test(p)));
    const seq = parseSequence("sequenceDiagram\n  participant A as Alpha\n  loop each\n    A->>+B: go\n    B--)A: back\n  end\n  Note over A: hi\n");
    assert.deepEqual(seq.participants.map((p) => [p.alias, p.label]), [["A", "Alpha"], ["B", "B"]]);
    assert.deepEqual(seq.steps.map((s) => [s.from, s.to, s.description]), [["A", "B", "go"], ["B", "A", "back"]]);
    assert.deepEqual(seq.problems, []);
});

test("a debt record's fields: the first bold word, the ladder, and what is left alone", () => {
    const record = (meta, body) => `# 9. X\n\n${F}meta\n${meta}${F}\n\n${body}`;
    assert.match(migrateDebtRecord(record("", "## Status\n\n**In progress** since May.\n")).markdown, /status: in-progress\n/);
    assert.equal(migrateDebtRecord(record("severity: low\nstatus: planned\n", "## Severity\n\n**High**\n")).set.length, 0);
    const odd = migrateDebtRecord(record("", "## Severity\n\n**Painful**\n\n## Status\n\n**Open**\n"));
    assert.deepEqual(odd.set, []);
    assert.equal(odd.reports.length, 2);
    assert.match(migrateDebtRecord(record("", "## Severity\n\nText first, then **Critical**.\n")).markdown, /severity: critical/);
});
