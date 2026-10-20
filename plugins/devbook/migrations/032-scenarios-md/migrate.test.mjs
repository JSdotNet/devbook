// 032-scenarios-md against a repository holding journey pages: two pages, one
// nested, fold into their context's scenarios.md, and every reference moves
// with them — `Proved by:` by stem, by path, and across contexts, a `related`
// entry, a prose link, a `scenario:` image, a demo walkthrough's `part`, the
// run folder, and the spec header. A page outside a context and one whose
// anchor the file already holds are left `not-applicable`; a second run
// changes nothing, and a repository without `domain/` is not applicable.
//
//   node --test plugins/devbook/migrations/032-scenarios-md/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildGraph } from "../../tools/devbook-meta/graph.mjs";
import { validateDocument } from "../../tools/devbook-meta/metadata.mjs";
import { parseScenariosFile } from "../../tools/scenarios/parse.mjs";
import { signatureOf } from "../../tools/scenarios/signature.mjs";
import { journeyOf } from "./migrate.mjs";
import { parseScenarioPage } from "./legacy-page.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";
const W = ".devbook/domain/work";

const BOARD = `# Set up the board

${F}meta
type: scenario
related: [features.md#backlog-board]
actor: actors.md#product-owner
${F}

A product owner sets up the board.

![The start](shot:start)

## Statuses are set up
- **Given** a product with no statuses
- **When** I create "New", "Doing" and "Done"
- **Then** they appear as columns in that order

![The board](shot:statuses-set-up)

### A note under the part

Prose.
`;
const MOVE = `# Move an item

${F}meta
type: scenario
status: draft
related: [../features.md#backlog-board]
actor: actors.md#product-owner
${F}

## An item is moved
- **When** I drag it to "Doing"
- **Then** it shows in "Doing"
`;
const CONTEXT = `# Work\n\n${F}meta\ntype: context\nindex: root\n${F}\n\nThe work context.\n`;
const ACTORS = `# Actors\n\n${F}meta\ntype: actors\n${F}\n\nWho.\n\n## Product Owner\n\n${F}meta\ntype: user\n${F}\n\nOwns it.\n`;
const FEATURES = `# Features

${F}meta
type: features
${F}

What it does. See [the board journey](set-up-the-board.md#statuses-are-set-up).

![Board](scenario:set-up-the-board#statuses-set-up)

## Backlog Board

${F}meta
type: feature
related: [.devbook/domain/work/set-up-the-board.md]
${F}

The board.
`;
const requirement = (name, target) =>
    `### Requirement: ${name}\n\n${F}meta\ntype: requirement\n${F}\n\nThe board SHALL ${name.toLowerCase()}.\n\n#### Scenario: ${name}\n\nProved by: ${target}\n\n`;
const REQUIREMENTS =
    `# Requirements\n\n${F}meta\ntype: requirements\n${F}\n\n## Backlog board\n\n${F}meta\ntype: requirements\nrelated: [.devbook/domain/work/features.md#backlog-board]\n${F}\n\n` +
    requirement("Show columns", "set-up-the-board.md#statuses-are-set-up") +
    requirement("Move items", "journeys/move-an-item.md#an-item-is-moved");
const SHOP_REQUIREMENTS =
    `# Requirements\n\n${F}meta\ntype: requirements\n${F}\n\n## Checkout\n\n${F}meta\ntype: requirements\nrelated: [.devbook/domain/work/features.md#backlog-board]\n${F}\n\n` +
    requirement("Use the board", ".devbook/domain/work/set-up-the-board.md#statuses-are-set-up");
const DEMO = `<!doctype html><html><head><title>Work</title>
<script type="application/json" id="demo-model">{ "screens": [], "walkthroughs": [ { "id": "w", "part": "set-up-the-board.md#statuses-are-set-up", "signature": "00000000", "steps": [] } ] }</script>
</head><body></body></html>
`;
const RUN = JSON.stringify({ version: 2, page: `${W}/set-up-the-board.md`, signature: "1234abcd", ranAt: "2026-10-08T08:30:00.000Z", parts: [], shots: {} }, null, 2) + "\n";
const SPEC = `// scenario: ${W}/set-up-the-board.md\n// signature: 1234abcd\nscenario('set-up-the-board', ({ part }) => {});\n`;

function repo(files, adopted = ["domain"]) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-032-"));
    const stamp = { components: { devbook: { adopted } } };
    for (const [rel, content] of Object.entries({ ".devbook/config.json": JSON.stringify(stamp, null, 2) + "\n", ...files })) {
        mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        writeFileSync(path.join(root, rel), content, "utf8");
    }
    return root;
}
function withRepo(files, body, adopted) {
    const root = repo(files, adopted);
    return Promise.resolve(body(root)).finally(() => rmSync(root, { recursive: true, force: true }));
}
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });
const read = (root, rel) => readFileSync(path.join(root, rel), "utf8");
const full = () => ({
    [`${W}/context.md`]: CONTEXT,
    [`${W}/actors.md`]: ACTORS,
    [`${W}/features.md`]: FEATURES,
    [`${W}/requirements.md`]: REQUIREMENTS,
    [`${W}/set-up-the-board.md`]: BOARD,
    [`${W}/journeys/move-an-item.md`]: MOVE,
    [`${W}/features.demo.html`]: DEMO,
    ".devbook/domain/shop/requirements.md": SHOP_REQUIREMENTS,
    ".devbook/domain/loose.md": `# Loose\n\n${F}meta\ntype: scenario\n${F}\n\n## A part\n- **Given** a\n`,
    ".devbook/scenarios/set-up-the-board/run.json": RUN,
    ".devbook/scenarios/set-up-the-board/statuses-set-up.png": "png",
    ".devbook/scenarios/profiles.json": "{}\n",
    "e2e/tests/set-up-the-board.spec.ts": SPEC,
});

test("--check lists the work and writes nothing; apply folds every page and moves every reference", () =>
    withRepo(full(), async (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 1, check.stdout + check.stderr);
        assert.match(check.stdout, /fold \.devbook\/domain\/work\/set-up-the-board\.md into \.devbook\/domain\/work\/scenarios\.md#set-up-the-board/);
        assert.match(check.stdout, /not-applicable \.devbook\/domain\/loose\.md/);
        assert.equal(existsSync(path.join(root, `${W}/scenarios.md`)), false, "--check writes nothing");

        const apply = run(root);
        assert.equal(apply.status, 0, apply.stdout + apply.stderr);

        const scenarios = read(root, `${W}/scenarios.md`);
        assert.match(scenarios, /^# Scenarios\n\n```meta\ntype: scenarios\n```/);
        assert.match(scenarios, /\n## Set up the board\n\n```meta\ntype: scenario\nrelated: \[features\.md#backlog-board\]\nactor: actors\.md#product-owner\n```\n/);
        assert.match(scenarios, /\n### Statuses are set up\n/);
        assert.match(scenarios, /\n#### A note under the part\n/);
        assert.match(scenarios, /\n## Move an item\n\n```meta\ntype: scenario\nstatus: draft\nrelated: \[features\.md#backlog-board\]\nactor: actors\.md#product-owner\n```\n/, "a nested page's reference is rebased to the context; one that fell back to it stays");
        assert.equal(existsSync(path.join(root, `${W}/set-up-the-board.md`)), false);
        assert.equal(existsSync(path.join(root, `${W}/journeys/move-an-item.md`)), false);
        assert.equal(existsSync(path.join(root, ".devbook/domain/loose.md")), true, "a page outside a context is left");

        const requirements = read(root, `${W}/requirements.md`);
        assert.match(requirements, /Proved by: scenarios\.md#statuses-are-set-up\n/);
        assert.match(requirements, /Proved by: scenarios\.md#an-item-is-moved\n/);
        assert.match(read(root, ".devbook/domain/shop/requirements.md"), /Proved by: \.devbook\/domain\/work\/scenarios\.md#statuses-are-set-up\n/);

        const features = read(root, `${W}/features.md`);
        assert.match(features, /\[the board journey\]\(scenarios\.md#statuses-are-set-up\)/);
        assert.match(features, /!\[Board\]\(scenario:work\/scenarios\.md#statuses-set-up\)/);
        assert.match(features, /related: \[\.devbook\/domain\/work\/scenarios\.md#set-up-the-board\]/);

        assert.match(read(root, `${W}/features.demo.html`), /"part": "scenarios\.md#statuses-are-set-up"/);

        const runFolder = `${W}/scenarios/set-up-the-board`;
        const moved = JSON.parse(read(root, `${runFolder}/run.json`));
        assert.deepEqual(Object.keys(moved).slice(0, 3), ["version", "journey", "signature"]);
        assert.equal(moved.version, 3);
        assert.equal(moved.journey, `${W}/scenarios.md#set-up-the-board`);
        assert.equal(read(root, `${runFolder}/statuses-set-up.png`), "png");
        assert.equal(existsSync(path.join(root, ".devbook/scenarios/set-up-the-board")), false);
        assert.match(read(root, "e2e/tests/set-up-the-board.spec.ts"), /^\/\/ scenario: \.devbook\/domain\/work\/scenarios\.md#set-up-the-board\n\/\/ signature: 1234abcd\n/);

        // The result is the shape the checker of 32 reads, with nothing unresolved.
        const lint = validateDocument(`${W}/scenarios.md`, scenarios).filter((issue) => issue.severity === "error");
        assert.deepEqual(lint, []);
        const graph = await buildGraph(root, [".devbook/domain"]);
        const unresolved = graph.problems.filter((p) => p.severity === "error" && !p.path?.endsWith("loose.md"));
        assert.deepEqual(unresolved, []);

        const again = run(root, "--check");
        assert.equal(again.status, 0, again.stdout + again.stderr);
        assert.match(again.stdout, /not-applicable \.devbook\/domain\/loose\.md/);
        const second = run(root);
        assert.equal(second.status, 0);
        assert.equal(read(root, `${W}/scenarios.md`), scenarios, "a second run changes nothing");
    }));

test("a journey's signature is its page's: the canonical text does not move", () => {
    const old = signatureOf(parseScenarioPage(BOARD, `${W}/set-up-the-board.md`));
    const file = `# Scenarios\n\n${F}meta\ntype: scenarios\n${F}\n\n${journeyOf(BOARD, W, W)}`;
    const journey = parseScenariosFile(file, `${W}/scenarios.md`).journeys[0];
    assert.equal(journey.slug, "set-up-the-board");
    assert.equal(signatureOf(journey), old);
});

test("a page whose anchor the scenarios file already holds is not applicable, and the file is left alone", () => {
    const existing = `# Scenarios\n\n${F}meta\ntype: scenarios\n${F}\n\nLead.\n\n## Set up the board\n\n${F}meta\ntype: scenario\n${F}\n\n### Other\n- **Given** x\n`;
    return withRepo({ [`${W}/context.md`]: CONTEXT, [`${W}/scenarios.md`]: existing, [`${W}/set-up-the-board.md`]: BOARD }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout + check.stderr);
        assert.match(check.stdout, /not-applicable \.devbook\/domain\/work\/set-up-the-board\.md: left as it is — \.devbook\/domain\/work\/scenarios\.md already holds its anchor "#set-up-the-board"/);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, `${W}/scenarios.md`), existing);
        assert.equal(read(root, `${W}/set-up-the-board.md`), BOARD);
    });
});

test("a page joins an existing scenarios file after its journeys", () => {
    const existing = `# Scenarios\n\n${F}meta\ntype: scenarios\n${F}\n\nLead.\n\n## Close the sprint\n\n${F}meta\ntype: scenario\n${F}\n\n### The sprint is closed\n- **When** I close it\n`;
    return withRepo({ [`${W}/context.md`]: CONTEXT, [`${W}/actors.md`]: ACTORS, [`${W}/features.md`]: FEATURES, [`${W}/scenarios.md`]: existing, [`${W}/set-up-the-board.md`]: BOARD }, (root) => {
        assert.equal(run(root).status, 0);
        const text = read(root, `${W}/scenarios.md`);
        assert.ok(text.startsWith(existing), text);
        assert.deepEqual(parseScenariosFile(text, `${W}/scenarios.md`).journeys.map((j) => j.slug), ["close-the-sprint", "set-up-the-board"]);
    });
});

test("a file checked out with CRLF line endings keeps them", () => {
    const crlf = (text) => text.replace(/\n/g, "\r\n");
    return withRepo({ [`${W}/context.md`]: CONTEXT, [`${W}/requirements.md`]: crlf(REQUIREMENTS), [`${W}/set-up-the-board.md`]: BOARD }, (root) => {
        assert.equal(run(root).status, 0);
        const text = read(root, `${W}/requirements.md`);
        assert.ok(text.includes("\r\n") && !/[^\r]\n/.test(text), "CRLF kept");
        assert.match(text, /Proved by: scenarios\.md#statuses-are-set-up\r\n/);
    });
});

test("a repository that never adopted domain/ is not applicable", () =>
    withRepo({ [`${W}/set-up-the-board.md`]: BOARD }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0);
        assert.match(check.stdout, /not-applicable — `domain` is not adopted/);
    }, ["arc42"]));
