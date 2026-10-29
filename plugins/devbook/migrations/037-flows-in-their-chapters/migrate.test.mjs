// 037-flows-in-their-chapters against a repository holding flow pages: a state
// diagram lands under the aggregate its heading names, a section under the
// chapter of its name, and a split page under the chapter its `related` names,
// each labelled and ahead of the chapter's prose. A section nothing names is an
// `ask` and stays on its page until `--place` answers it; then the page goes,
// and every reference to it — a quoted `related` entry, a prose link — follows
// the section. A second run changes nothing; without `domain/` it is not
// applicable.
//
//   node --test plugins/devbook/migrations/037-flows-in-their-chapters/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDocument } from "../../tools/devbook-meta/metadata.mjs";
import { insertInto, readFlowPage } from "./migrate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";
const W = ".devbook/domain/work";

const DOMAIN_MD = `# Domain

${F}meta
type: domain
${F}

## Order

${F}meta
type: aggregate
related: [domain.invariants.md#order]
${F}

${F}annotation
kind: question
status: open
author: claude
date: 2026-10-28
quote: An order
body: Which?
${F}

An order is what a customer buys.

## Fulfilment

${F}meta
type: domain-service
${F}

Ships orders.
`;

const FEATURES_MD = `# Features

${F}meta
type: features
${F}

## Returns

${F}meta
type: feature
related: [flow.returns.md]
${F}

A customer sends an item back.
`;

const CONTEXT_MD = `# Work

${F}meta
type: context
index: root
${F}

The boundary.

## Express

${F}meta
type: feature-flag
key: express
${F}

A switch.
`;

const FLOW_MD = `# Flows

${F}meta
type: flow
${F}

> Lifecycle and process flows for this bounded context. Complementary to \`model.md\` (structure).

## Order lifecycle

${F}mermaid
stateDiagram-v2
    [*] --> Open
    Open --> Shipped
${F}

- Shipping is [Fulfilment](#fulfilment).

## Fulfilment

${F}mermaid
flowchart LR
    A --> B
${F}

## Month end

${F}mermaid
flowchart LR
    C --> D
${F}
`;

const RETURNS_MD = `# Returns

${F}meta
type: flow
related: [features.md#returns]
${F}

> How a return comes back, from the customer to the shelf.

${F}mermaid
flowchart LR
    R --> S
${F}
`;

const ADR = `# Orders are aggregates

${F}meta
status: accepted
related: [".devbook/domain/work/flow.md#order-lifecycle", ".devbook/domain/work/domain.md#order"]
${F}

See [the lifecycle](../../domain/work/flow.md#order-lifecycle) and [month end](../../domain/work/flow.md#month-end).
`;

function repo(files, adopted = ["domain"]) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-037-"));
    mkdirSync(path.join(root, ".devbook"), { recursive: true });
    writeFileSync(path.join(root, ".devbook/config.json"), JSON.stringify({ components: { devbook: { adopted } } }));
    for (const [rel, text] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        writeFileSync(path.join(root, rel), text);
    }
    return root;
}
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });
const files = () => ({
    [`${W}/domain.md`]: DOMAIN_MD,
    [`${W}/features.md`]: FEATURES_MD,
    [`${W}/context.md`]: CONTEXT_MD,
    [`${W}/flow.md`]: FLOW_MD,
    [`${W}/flow.returns.md`]: RETURNS_MD,
    ".devbook/arc42/adr/orders.md": ADR,
});

test("a flow page reads as its units, its template summary apart", () => {
    const page = readFlowPage(FLOW_MD);
    assert.equal(page.type, "flow");
    assert.deepEqual(page.units.map((u) => [u.anchor, u.kind]), [["order-lifecycle", "stateDiagram-v2"], ["fulfilment", "flowchart"], ["month-end", "flowchart"]]);
    assert.match(page.summary, /^Lifecycle and process flows/);
    assert.deepEqual(readFlowPage(RETURNS_MD).units.map((u) => u.anchor), ["returns"]);
});

test("a block lands under the chapter's meta block and its annotations, ahead of its prose", () => {
    const out = insertInto(DOMAIN_MD, "order", ["**X**\n\nDIAGRAM"]);
    assert.match(out, /body: Which\?\n```\n\n\*\*X\*\*\n\nDIAGRAM\n\nAn order is what a customer buys\./);
    assert.match(insertInto(CONTEXT_MD, null, ["MAP"]), /The boundary\.\n\nMAP\n\n## Express/);
});

test("--check plans the moves, asks about the rest, and writes nothing", () => {
    const root = repo(files());
    try {
        const result = run(root, "--check");
        assert.equal(result.status, 1);
        assert.match(result.stdout, /move \.devbook\/domain\/work\/flow\.md#order-lifecycle .* to \.devbook\/domain\/work\/domain\.md#order, by the aggregate its heading names/);
        assert.match(result.stdout, /move \.devbook\/domain\/work\/flow\.md#fulfilment .* to \.devbook\/domain\/work\/domain\.md#fulfilment, by the chapter of the same name/);
        assert.match(result.stdout, /move \.devbook\/domain\/work\/flow\.returns\.md#returns .* to \.devbook\/domain\/work\/features\.md#returns, by the page's own chapter/);
        assert.match(result.stdout, /ask \.devbook\/domain\/work\/flow\.md#month-end .*Candidates: .*context\.md\. Answer with --place \.devbook\/domain\/work\/flow\.md#month-end=/);
        assert.equal(read(root, `${W}/domain.md`), DOMAIN_MD);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("a run moves what it can, keeps the asked section on its page, and --place finishes it", () => {
    const root = repo(files());
    try {
        const first = run(root);
        assert.equal(first.status, 1, first.stdout);
        assert.ok(!existsSync(path.join(root, `${W}/flow.returns.md`)), "the split page is gone");
        const left = read(root, `${W}/flow.md`);
        assert.match(left, /## Month end/);
        assert.doesNotMatch(left, /## Order lifecycle|## Fulfilment/);

        const domain = read(root, `${W}/domain.md`);
        assert.match(domain, /```\n\n\*\*Order lifecycle\*\*\n\n```mermaid\nstateDiagram-v2[\s\S]*Shipping is \[Fulfilment\]\(domain\.md#fulfilment\)\.\n\nAn order is what/);
        assert.match(domain, /type: domain-service\n```\n\n\*\*Fulfilment\*\*\n\n```mermaid\nflowchart LR\n    A --> B/);
        const features = read(root, `${W}/features.md`);
        assert.match(features, /\*\*Returns\*\*\n\n```mermaid\nflowchart LR\n    R --> S\n```\n\nHow a return comes back, from the customer to the shelf\.\n\nA customer sends/, "a summary of its own is carried");
        assert.doesNotMatch(features, /related: \[flow\.returns\.md\]/, "a reference to the chapter itself is dropped");

        const adr = read(root, ".devbook/arc42/adr/orders.md");
        assert.match(adr, /related: \["\.devbook\/domain\/work\/domain\.md#order"\]/, "a quoted entry moves and the duplicate goes");
        assert.match(adr, /\[the lifecycle\]\(\.\.\/\.\.\/domain\/work\/domain\.md#order\)/);
        assert.match(adr, /\[month end\]\(\.\.\/\.\.\/domain\/work\/flow\.md#month-end\)/, "a waiting section's link stays");

        const second = run(root, "--place", `${W}/flow.md#month-end=${W}/context.md`);
        assert.equal(second.status, 0, second.stdout);
        assert.ok(!existsSync(path.join(root, `${W}/flow.md`)));
        assert.match(read(root, `${W}/context.md`), /The boundary\.\n\n\*\*Month end\*\*\n\n```mermaid\nflowchart LR\n    C --> D\n```\n\n## Express/);
        assert.match(read(root, ".devbook/arc42/adr/orders.md"), /\[month end\]\(\.\.\/\.\.\/domain\/work\/context\.md\)/);

        for (const rel of [`${W}/domain.md`, `${W}/features.md`, `${W}/context.md`]) {
            // The annotation fence the fixture carries is 038's to delete, which runs after this.
            const errors = validateDocument(rel, read(root, rel)).filter(
                (i) => i.severity === "error" && !i.message.includes("`annotation` fence")
            );
            assert.deepEqual(errors, [], rel);
        }
        const again = run(root, "--check");
        assert.equal(again.status, 0);
        assert.match(again.stdout, /nothing to do — no flow page left/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("drop removes a section, and a refused answer names why", () => {
    const root = repo(files());
    try {
        const result = run(root, "--place", `${W}/flow.md#month-end=drop`, "--place", `${W}/flow.md#order-lifecycle=${W}/domain.md#nowhere`);
        assert.equal(result.status, 0, result.stdout);
        assert.match(result.stdout, /refused --place .*#order-lifecycle=.*no chapter with a `meta` block is anchored #nowhere/);
        assert.match(result.stdout, /month-end .* to nowhere — dropped/);
        assert.match(read(root, `${W}/domain.md`), /\*\*Order lifecycle\*\*/, "a refused answer falls back to what the page says");
        assert.match(read(root, ".devbook/arc42/adr/orders.md"), /\[month end\]\(\.\.\/\.\.\/domain\/work\/domain\.md#order\)/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("without domain/ adopted it is not applicable", () => {
    const root = repo(files(), ["arc42"]);
    try {
        const result = run(root, "--check");
        assert.equal(result.status, 0);
        assert.match(result.stdout, /not-applicable/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
