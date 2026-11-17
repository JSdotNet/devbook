// 010-terms-live-in-domain-md against the repositories it meets: a context still keeping
// naming.md with references into it from meta blocks and links, and quoted text that names a
// naming.md without being a reference — a scenario step's test data — which is left alone.
//
//   node --test plugins/devbook/migrations/010-terms-live-in-domain-md/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");

function write(root, rel, content) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
}
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");

function withRepo(files, body) {
    const root = mkdtempSync(path.join(tmpdir(), "terms-in-domain-"));
    try {
        for (const [rel, content] of Object.entries(files)) write(root, rel, content);
        body(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });

const SCENARIOS = `# Scenarios

\`\`\`meta
type: scenarios
\`\`\`

## Move a page

### Part: Rename the path

- Given a page at "onderdelen/naming.md"
- When I change its path to "onderdelen/naming.md"
- Then the page lists 'docs/naming.md' as its old path

\`\`\`text
see orders/naming.md#order
\`\`\`
`;

test("leaves quoted scenario test data alone: --check is clean and a run changes nothing", () => {
    withRepo({ ".devbook/domain/proposals/scenarios.md": SCENARIOS }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout + check.stderr);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, ".devbook/domain/proposals/scenarios.md"), SCENARIOS);
    });
});

test("folds naming.md and rewrites meta and link references, but not prose, then runs once", () => {
    const naming = `# Naming

\`\`\`meta
type: naming
\`\`\`

## Order

\`\`\`meta
type: term
related: [naming.md#line]
\`\`\`

An order. See [line](naming.md#line).

## Line

\`\`\`meta
type: term
\`\`\`

A line.
`;
    const arc42 = `# Context

\`\`\`meta
type: context
related:
  - ../domain/orders/naming.md#order
  - "../domain/orders/naming.md#line"
\`\`\`

Read [the order](../domain/orders/naming.md#order) and [the line][l].
The old file was called "orders/naming.md" in prose.

[l]: ../domain/orders/naming.md#line
`;
    withRepo(
        {
            ".devbook/domain/orders/domain.md": "# Domain\n\n```meta\ntype: domain\n```\n",
            ".devbook/domain/orders/naming.md": naming,
            ".devbook/arc42/03-context.md": arc42,
            ".devbook/domain/proposals/scenarios.md": SCENARIOS,
        },
        (root) => {
            assert.equal(run(root, "--check").status, 1);
            const apply = run(root);
            assert.equal(apply.status, 0, apply.stdout + apply.stderr);

            assert.equal(existsSync(path.join(root, ".devbook/domain/orders/naming.md")), false);
            const domain = read(root, ".devbook/domain/orders/domain.md");
            assert.match(domain, /## Ubiquitous Language/);
            assert.match(domain, /### Order/);
            assert.match(domain, /related: \[domain\.md#line\]/);
            assert.match(domain, /\[line\]\(domain\.md#line\)/);

            const context = read(root, ".devbook/arc42/03-context.md");
            assert.match(context, /- \.\.\/domain\/orders\/domain\.md#order/);
            assert.match(context, /- "\.\.\/domain\/orders\/domain\.md#line"/);
            assert.match(context, /\(\.\.\/domain\/orders\/domain\.md#order\)/);
            assert.match(context, /\[l\]: \.\.\/domain\/orders\/domain\.md#line/);
            assert.match(context, /"orders\/naming\.md" in prose/);

            assert.equal(read(root, ".devbook/domain/proposals/scenarios.md"), SCENARIOS);
            assert.equal(run(root, "--check").status, 0);
        },
    );
});
