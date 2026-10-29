// 038-workflow-state-leaves-the-chapter against a devbook still carrying its
// workflow state: every moved field comes off, a tech/ or ai/ `status` becomes
// `rating`, a delta's header keeps `change`, archive/ and annotation fences are
// left, line endings survive, and a second run changes nothing.
//
//   node --test plugins/devbook/migrations/038-workflow-state-leaves-the-chapter/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rewrite } from "./migrate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";

function repo(files, adopted = ["domain", "arc42", "tech", "design", "ai"]) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-038-"));
    const stamp = { components: { devbook: { adopted } } };
    for (const [rel, content] of Object.entries({ ".devbook/config.json": JSON.stringify(stamp, null, 2) + "\n", ...files })) {
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

const DOMAIN = `# Domain

${F}meta
type: domain
status: draft
roadmap: [mvp]
${F}

## Order

${F}meta
type: aggregate
status: accepted
approved-by: ana
approved-at: 2026-09-01
approved-hash: sha256:0123abcd
accepted-by: bo
accepted-at: 2026-09-02
accepted-hash: sha256:0123abcd
sync: push
issue: owner/repo#4
effort: 3
change: add-order
ext.some-plugin.checked: 2026-09-17
related: [.devbook/domain/ordering/features.md#checkout]
${F}

The aggregate.

${F}annotation
kind: question
status: open
author: ana
date: 2026-09-01

Why?
${F}

${F}text
status: draft
${F}
`;

const ADR = `# Use Postgres

${F}meta
status: proposed
date: 2026-09-01
${F}

## Why

${F}meta
${F}

Because.
`;

const TDR = `# No retry budget

${F}meta
status: planned
severity: high
${F}
`;

const DESIGN = `# Buttons

${F}meta
status: deprecated
sync: report
${F}
`;

const TECH = `# Runtimes

${F}meta
${F}

## Node

${F}meta
type: runtime
status: adopted
version: 22
${F}

## Deno

${F}meta
type: runtime
rating: trial
status: hold
${F}

## Bun

${F}meta
type: runtime
rating: candidate
status: candidate
${F}
`;

const AI = `# Concepts

${F}meta
type: concepts
${F}

## Worktree

${F}meta
type: concept
status: trial
effort: 2
${F}
`;

const PROPOSAL = `# Add checkout

${F}meta
type: change
status: accepted
category: feature
approved-by: ana
approved-at: 2026-09-01
approved-hash: sha256:aaaaaaaa
accepted-by: bo
accepted-at: 2026-09-02
accepted-hash: sha256:aaaaaaaa
${F}
`;

const DELTA = `# Domain

${F}meta
change: add-checkout
delta: modified
${F}

## Order

### MODIFIED

#### Line

${F}meta
type: entity
status: draft
change: add-checkout
${F}
`;

const TECH_DELTA = `# Runtimes

${F}meta
change: add-checkout
delta: modified
${F}

## Node

${F}meta
type: runtime
status: trial
${F}
`;

const FILES = {
    ".devbook/domain/ordering/domain.md": DOMAIN,
    ".devbook/arc42/adr/use-postgres.md": ADR,
    ".devbook/arc42/tdr/no-retry-budget.md": TDR,
    ".devbook/design/buttons.md": DESIGN,
    ".devbook/tech/runtimes.md": TECH,
    ".devbook/ai/concepts.md": AI,
    "openspec/changes/add-checkout/proposal.md": PROPOSAL,
    "openspec/changes/add-checkout/devbook-delta/domain/ordering/domain.md": DELTA,
    "openspec/changes/add-checkout/devbook-delta/tech/runtimes.md": TECH_DELTA,
    "openspec/changes/archive/2026-09-01-old/proposal.md": PROPOSAL,
};

test("--check lists every value it would take off and writes nothing", () =>
    withRepo(FILES, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 1, check.stdout + check.stderr);
        assert.match(check.stdout, /would take off \.devbook\/arc42\/adr\/use-postgres\.md:3 \(Use Postgres\): status proposed/);
        assert.match(check.stdout, /\(Order\): status accepted, approved-by ana, approved-at 2026-09-01, approved-hash sha256:0123abcd, accepted-by bo, accepted-at 2026-09-02, accepted-hash sha256:0123abcd, sync push, issue owner\/repo#4, effort 3, change add-order/);
        assert.match(check.stdout, /\(Node\): status adopted renamed rating/);
        assert.match(check.stdout, /9 file\(s\) to rewrite/);
        for (const [rel, content] of Object.entries(FILES)) assert.equal(read(root, rel), content, `${rel} untouched by --check`);
    }));

test("apply strips the editorial folders, keeping ext, related, fences, and empty blocks", () =>
    withRepo(FILES, (root) => {
        assert.equal(run(root).status, 0);
        const domain = read(root, ".devbook/domain/ordering/domain.md");
        assert.match(domain, /```meta\ntype: domain\n```/);
        assert.match(domain, /```meta\ntype: aggregate\next\.some-plugin\.checked: 2026-09-17\nrelated: \[\.devbook\/domain\/ordering\/features\.md#checkout\]\n```/);
        assert.match(domain, /```annotation\nkind: question\nstatus: open\n/, "annotation fence untouched");
        assert.match(domain, /```text\nstatus: draft\n```/, "a text sample untouched");
        assert.equal(read(root, ".devbook/arc42/adr/use-postgres.md"), ADR.replace("status: proposed\n", ""));
        assert.match(read(root, ".devbook/arc42/adr/use-postgres.md"), /## Why\n\n```meta\n```/, "empty fence kept");
        assert.equal(read(root, ".devbook/arc42/tdr/no-retry-budget.md"), TDR.replace("status: planned\n", ""));
        assert.equal(read(root, ".devbook/design/buttons.md"), "# Buttons\n\n```meta\n```\n");
    }));

test("apply renames status to rating in tech/ and ai/, and reports a conflict with an existing rating", () =>
    withRepo(FILES, (root) => {
        const result = run(root);
        assert.match(result.stdout, /\(Deno\): status hold — conflict: status hold differs from rating trial; rating kept/);
        assert.doesNotMatch(result.stdout, /\(Bun\).*conflict/);
        const tech = read(root, ".devbook/tech/runtimes.md");
        assert.match(tech, /type: runtime\nrating: adopted\nversion: 22/);
        assert.match(tech, /## Deno\n\n```meta\ntype: runtime\nrating: trial\n```/);
        assert.match(tech, /## Bun\n\n```meta\ntype: runtime\nrating: candidate\n```/);
        assert.doesNotMatch(tech, /status:/);
        assert.match(read(root, ".devbook/ai/concepts.md"), /type: concept\nrating: trial\n```/);
    }));

test("apply takes the rungs off a proposal, keeps a delta header's change, and leaves archive/", () =>
    withRepo(FILES, (root) => {
        assert.equal(run(root).status, 0);
        assert.equal(read(root, "openspec/changes/add-checkout/proposal.md"), `# Add checkout\n\n${F}meta\ntype: change\ncategory: feature\n${F}\n`);
        const delta = read(root, "openspec/changes/add-checkout/devbook-delta/domain/ordering/domain.md");
        assert.match(delta, /```meta\nchange: add-checkout\ndelta: modified\n```/, "header keeps change and delta");
        assert.match(delta, /#### Line\n\n```meta\ntype: entity\n```/, "a chapter block loses status and change");
        const techDelta = read(root, "openspec/changes/add-checkout/devbook-delta/tech/runtimes.md");
        assert.match(techDelta, /```meta\nchange: add-checkout\ndelta: modified\n```/);
        assert.match(techDelta, /type: runtime\nrating: trial\n/, "a delta landing in tech/ renames");
        assert.equal(read(root, "openspec/changes/archive/2026-09-01-old/proposal.md"), PROPOSAL, "archive untouched");
    }));

test("a second run and --check find nothing to do", () =>
    withRepo(FILES, (root) => {
        assert.equal(run(root).status, 0);
        const after = Object.fromEntries(Object.keys(FILES).map((rel) => [rel, read(root, rel)]));
        const again = run(root);
        assert.equal(again.status, 0);
        assert.match(again.stdout, /nothing to do/);
        for (const [rel, content] of Object.entries(after)) assert.equal(read(root, rel), content);
        const check = run(root, "--check");
        assert.equal(check.status, 0);
        assert.match(check.stdout, /nothing to do/);
    }));

test("CRLF line endings survive", () => {
    const crlf = ADR.replace(/\n/g, "\r\n");
    withRepo({ ".devbook/arc42/adr/use-postgres.md": crlf }, (root) => {
        assert.equal(run(root).status, 0);
        assert.equal(read(root, ".devbook/arc42/adr/use-postgres.md"), crlf.replace("status: proposed\r\n", ""));
    });
});

test("a folder that is not adopted is left alone, and no stamp falls back to the folders on disk", () => {
    withRepo({ ".devbook/design/buttons.md": DESIGN }, (root) => {
        const result = run(root);
        assert.match(result.stdout, /nothing to do/);
        assert.equal(read(root, ".devbook/design/buttons.md"), DESIGN);
    }, ["arc42"]);
    const root = mkdtempSync(path.join(tmpdir(), "devbook-038-"));
    try {
        mkdirSync(path.join(root, ".devbook/design"), { recursive: true });
        writeFileSync(path.join(root, ".devbook/design/buttons.md"), DESIGN);
        assert.equal(spawnSync(process.execPath, [SCRIPT, "--root", root], { encoding: "utf8" }).status, 0);
        assert.equal(readFileSync(path.join(root, ".devbook/design/buttons.md"), "utf8"), "# Buttons\n\n```meta\n```\n");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("statuses.json is noted and left in place", () =>
    withRepo({ ".devbook/statuses.json": "{}\n" }, (root) => {
        const result = run(root);
        assert.equal(result.status, 0);
        assert.match(result.stdout, /\.devbook\/statuses\.json is no longer read by the check/);
        assert.ok(existsSync(path.join(root, ".devbook/statuses.json")));
    }));

test("rewrite strips an indented key, and leaves a nested fence and an unclosed block alone", () => {
    const text = `## A

${F}meta
  status: draft
${F}

${F}${F}markdown
${F}meta
status: draft
${F}
${F}${F}

## B

${F}meta
status: draft
`;
    const { text: out, blocks } = rewrite(text);
    assert.equal(out, text.replace("  status: draft\n", ""));
    assert.equal(blocks.length, 1);
});

test("a fence with a long info string opens and closes like any other", () => {
    const text = `## A

${F}js title="x.js"
const a = 1;
${F}

## B

${F}meta
sync: pull
${F}
`;
    const { text: out, blocks } = rewrite(text);
    assert.equal(out, text.replace("sync: pull\n", ""));
    assert.equal(blocks.length, 1);
});

test("the checker files contract 38 retired are deleted, and the rest of the folder kept", () =>
    withRepo(
        {
            ".devbook/_tools/devbook-meta/statuses.mjs": "export {};\n",
            ".devbook/_tools/devbook-meta/sync-field.test.mjs": "\n",
            ".devbook/_tools/devbook-meta/metadata.mjs": "export {};\n",
        },
        (root) => {
            const check = run(root, "--check");
            assert.equal(check.status, 1);
            assert.match(check.stdout, /would delete \.devbook\/_tools\/devbook-meta\/statuses\.mjs/);
            assert.ok(existsSync(path.join(root, ".devbook/_tools/devbook-meta/statuses.mjs")), "--check writes nothing");
            assert.equal(run(root).status, 0);
            assert.ok(!existsSync(path.join(root, ".devbook/_tools/devbook-meta/statuses.mjs")));
            assert.ok(!existsSync(path.join(root, ".devbook/_tools/devbook-meta/sync-field.test.mjs")));
            assert.ok(existsSync(path.join(root, ".devbook/_tools/devbook-meta/metadata.mjs")));
            assert.match(run(root, "--check").stdout, /nothing to do/);
        }
    ));
