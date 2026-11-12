// 038-journey-specs-own-runner against the repositories it meets: specs importing the runner
// from the repository's copy, from a copy the reconcile already replaced, a destination that
// is taken, and a repository with nothing to move or no `domain/`.
//
//   node --test plugins/devbook/migrations/038-journey-specs-own-runner/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const PAYLOAD = path.join(HERE, "runner");
const TOOLS = ".devbook/_tools/scenarios";

const SPEC = (specifier) => `// scenario: .devbook/domain/work/scenarios.md#fill-the-backlog
// signature: 9c41e2a0
import { scenario, shot } from '${specifier}';

scenario('fill-the-backlog', ({ part }) => {
  part('Statuses are set up', async ({ page }) => { await shot(page, 'statuses'); });
});
`;

function write(root, rel, content) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
}
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");

function withRepo({ adopted = ["arc42", "domain"], tools = "own", files = {} }, body) {
    const root = mkdtempSync(path.join(tmpdir(), "own-runner-"));
    try {
        const stamp = { id: "x", components: { devbook: { pluginVersion: "1.36.0", contractVersion: 38, adopted } } };
        write(root, ".devbook/config.json", JSON.stringify(stamp, null, 2) + "\n");
        if (tools === "own") {
            write(root, `${TOOLS}/setup.ts`, readFileSync(path.join(PAYLOAD, "setup.ts"), "utf8"));
            write(root, `${TOOLS}/setup.mjs`, readFileSync(path.join(PAYLOAD, "setup.mjs"), "utf8"));
        } else if (tools === "replaced") {
            write(root, `${TOOLS}/setup.mjs`, "export function effectiveConfig() {}\n");
        }
        for (const [rel, content] of Object.entries(files)) write(root, rel, content);
        body(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });

const SPECS = {
    "e2e/work/scenarios/fill-the-backlog.spec.ts": SPEC("../../../.devbook/_tools/scenarios/setup"),
    "e2e/shop/scenarios/checkout.spec.ts": SPEC("../../../.devbook/_tools/scenarios/setup.ts"),
};

test("moves the runner beside the specs, rewires every import, and runs once", () => {
    withRepo({ files: SPECS }, (root) => {
        assert.equal(run(root, "--check").status, 1);
        const applied = run(root);
        assert.equal(applied.status, 0, applied.stderr);

        const ts = read(root, "e2e/scenario-runner/setup.ts");
        assert.match(ts, /^\/\/ Moved here from \.devbook\/_tools\/scenarios\//);
        assert.match(ts, /from '\.\.\/\.\.\/\.devbook\/_tools\/scenarios\/parse\.mjs'/);
        assert.match(ts, /from '\.\.\/\.\.\/\.devbook\/_tools\/scenarios\/shot'/);
        assert.match(ts, /from '\.\/setup\.mjs'/, "the runner's own module moves with it");
        assert.match(read(root, "e2e/scenario-runner/setup.mjs"), /from "\.\.\/\.\.\/\.devbook\/_tools\/scenarios\/parse\.mjs"/);
        assert.match(read(root, "e2e/scenario-runner/setup.mjs"), /export async function runSetup\(/);
        assert.deepEqual(JSON.parse(read(root, "e2e/scenario-runner/package.json")), { private: true, type: "module" });

        assert.match(read(root, "e2e/work/scenarios/fill-the-backlog.spec.ts"), /from '\.\.\/\.\.\/scenario-runner\/setup';/);
        assert.match(read(root, "e2e/shop/scenarios/checkout.spec.ts"), /from '\.\.\/\.\.\/scenario-runner\/setup\.ts';/, "an extension is kept");

        assert.equal(run(root, "--check").status, 0);
        const before = read(root, "e2e/scenario-runner/setup.ts");
        assert.equal(run(root).status, 0);
        assert.equal(read(root, "e2e/scenario-runner/setup.ts"), before, "a second run changes nothing");
    });
});

test("a runner three folders down does not read its own usage comment as an import", () => {
    const files = { "tests/e2e/work/journey/a.spec.ts": SPEC("../../../../.devbook/_tools/scenarios/setup") };
    withRepo({ files }, (root) => {
        assert.equal(run(root, "--to", "tests/e2e/support").status, 0);
        assert.ok(existsSync(path.join(root, "tests/e2e/support/setup.ts")));
        assert.equal(run(root, "--check").status, 0);
    });
});

test("takes the frozen runner once the reconcile has replaced the folder", () => {
    withRepo({ tools: "replaced", files: SPECS }, (root) => {
        assert.equal(run(root).status, 0);
        assert.match(read(root, "e2e/scenario-runner/setup.mjs"), /export async function runSetup\(/);
    });
});

test("keeps a customization of the repository's own runner", () => {
    withRepo({ files: SPECS }, (root) => {
        write(root, `${TOOLS}/setup.ts`, `${read(root, `${TOOLS}/setup.ts`)}\n// our own tweak\n`);
        assert.equal(run(root).status, 0);
        assert.match(read(root, "e2e/scenario-runner/setup.ts"), /our own tweak/);
    });
});

test("moves the last shipped runner when the repository's copy is an older release's", () => {
    withRepo({ files: SPECS }, (root) => {
        const old = read(root, `${TOOLS}/setup.ts`).replace("import { dataFolder,", "import { listScenarioPages, dataFolder,");
        write(root, `${TOOLS}/setup.ts`, old);
        const result = run(root);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /older release's runner/);
        assert.doesNotMatch(read(root, "e2e/scenario-runner/setup.ts"), /listScenarioPages/);
    });
});

test("a destination in a dot-folder keeps its ./ prefix", () => {
    withRepo({ files: { "e2e/journey.spec.ts": SPEC("../.devbook/_tools/scenarios/setup") } }, (root) => {
        assert.equal(run(root, "--to", "e2e/.support").status, 0);
        assert.match(read(root, "e2e/journey.spec.ts"), /from '\.\/\.support\/setup';/);
    });
});

test("refuses a destination that holds something else, and writes nothing", () => {
    withRepo({ files: { ...SPECS, "e2e/scenario-runner/setup.ts": "export {};\n" } }, (root) => {
        const result = run(root);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /--to/);
        assert.match(read(root, "e2e/work/scenarios/fill-the-backlog.spec.ts"), /\.devbook\/_tools\/scenarios\/setup'/);
    });
});

test("nothing to move, and not-applicable without domain/", () => {
    withRepo({ files: { "e2e/a.spec.ts": "import { test } from '@playwright/test';\n" } }, (root) => {
        assert.equal(run(root, "--check").status, 0);
    });
    withRepo({ adopted: ["arc42"], files: SPECS }, (root) => {
        const result = run(root, "--check");
        assert.equal(result.status, 0);
        assert.match(result.stdout, /not-applicable/);
    });
});

test("skips node_modules and a nested checkout", () => {
    const files = {
        "node_modules/x/a.spec.ts": SPEC("../../.devbook/_tools/scenarios/setup"),
        "wt/.git": "gitdir: elsewhere\n",
        "wt/b.spec.ts": SPEC("../.devbook/_tools/scenarios/setup"),
    };
    withRepo({ files }, (root) => {
        assert.equal(run(root, "--check").status, 0);
    });
});
