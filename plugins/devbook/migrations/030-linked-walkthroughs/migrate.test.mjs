// 030-linked-walkthroughs against the demos it meets: a free walkthrough of its part's
// step count, which is linked; one whose step count differs, and one whose slug names two
// parts, which are left free and listed not-applicable; one no `Proved by:` case names,
// which is left alone; a `Proved by:` path written from the requirement's folder; and a
// repository that never adopted `domain/`.
//
//   node --test plugins/devbook/migrations/030-linked-walkthroughs/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { linkedWalkthroughs } from "../../tools/devbook-meta/demo.mjs";
import { parseScenarioPage } from "../../tools/scenarios/parse.mjs";
import { signatureOf } from "../../tools/scenarios/signature.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";
const PAGE_PATH = ".devbook/domain/work/set-up-the-board.md";
const REQUIREMENTS_PATH = ".devbook/domain/work/requirements.md";
const DEMO_PATH = ".devbook/domain/work/features.demo.html";

const PAGE = `# Set up the board

${F}meta
type: scenario
${F}

## Statuses are set up
- **Given** a product with no statuses
- **When** I create "New", "Doing" and "Done"
- **Then** they appear as columns in that order
`;
const SIGNATURE = signatureOf(parseScenarioPage(PAGE, PAGE_PATH));

const requirements = (cases) => `# Requirements

${F}meta
type: requirements
${F}

## Board

${F}meta
type: requirements
${F}

### Requirement: Columns follow the status order

${F}meta
type: requirement
${F}

The board SHALL show one column per status.

${cases}`;
const PROVED = "#### Scenario: Statuses are set up\n\nProved by: set-up-the-board.md#statuses-are-set-up\n";

// Hand-formatted on purpose: the migration must keep every byte it does not own.
const demo = (walkthroughs) => `<!doctype html>
<html><head><title>Work</title>
<script type="application/json" id="demo-meta">{"question":"Does the board read?"}</script>
<script type="application/json" id="demo-model">
{
  "screens": [ {"id": "statuses", "title": "Statuses"}, {"id": "board", "title": "Board"} ],
  "walkthroughs": [
${walkthroughs.join(",\n")}
  ]
}
</script>
</head><body>
<section id="statuses" data-screen></section>
<section id="board" data-screen></section>
</body></html>
`;
const FREE = `    { "id": "statuses-are-set-up", "title": "Set up statuses",
      "steps": [
        {"screen": "statuses", "text": "**Given** an empty product"},
        {"screen": "statuses",   "text": "I add three statuses"},
        {"screen": "board", "text": "the columns show"}
      ] }`;
const LINKED = `    { "id": "statuses-are-set-up", "part": "set-up-the-board.md#statuses-are-set-up", "signature": "${SIGNATURE}", "title": "Set up statuses",
      "steps": [
        {"step": 1, "screen": "statuses", "text": "Given a product with no statuses"},
        {"step": 2, "screen": "statuses",   "text": "I create \\"New\\", \\"Doing\\" and \\"Done\\""},
        {"step": 3, "screen": "board", "text": "they appear as columns in that order"}
      ] }`;
const SHORT = `    { "id": "statuses-are-set-up", "title": "Set up statuses",
      "steps": [ {"screen": "board", "text": "the columns show"} ] }`;
const UNNAMED = `    { "id": "drag-a-card", "title": "Drag", "steps": [ {"screen": "board", "text": "drag it"} ] }`;

function repo(files, adopted = ["arc42", "domain"]) {
    const root = mkdtempSync(path.join(tmpdir(), "linked-walkthroughs-"));
    const stamp = { id: "x", components: { devbook: { pluginVersion: "1.20.1", contractVersion: 30, adopted, materialized: {} } } };
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
const board = (demoHtml, cases = PROVED) => ({ [PAGE_PATH]: PAGE, [REQUIREMENTS_PATH]: requirements(cases), [DEMO_PATH]: demoHtml });

/** What devbook-meta's checker says about the linked walkthroughs in `root`. */
async function checker(root) {
    const page = parseScenarioPage(PAGE, PAGE_PATH);
    const register = [{ path: PAGE_PATH, stem: page.stem, parts: page.parts.map((p) => ({ anchor: p.anchor })) }];
    return linkedWalkthroughs(root, [".devbook/domain"], register);
}

test("a free walkthrough of its part's step count is linked, its text copied, and nothing else moves", () =>
    withRepo(board(demo([FREE, UNNAMED])), async (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 1, check.stdout + check.stderr);
        assert.match(check.stdout, /link \.devbook\/domain\/work\/features\.demo\.html walkthrough "statuses-are-set-up"/);
        assert.equal(read(root, DEMO_PATH), demo([FREE, UNNAMED]), "--check writes nothing");

        const apply = run(root);
        assert.equal(apply.status, 0, apply.stdout + apply.stderr);
        assert.equal(read(root, DEMO_PATH), demo([LINKED, UNNAMED]));
        const { problems, links } = await checker(root);
        assert.deepEqual(problems, [], "the checker reads the rewritten walkthrough as linked and current");
        assert.deepEqual(links.map((l) => l.id), ["statuses-are-set-up"]);

        assert.equal(run(root, "--check").status, 0);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, DEMO_PATH), demo([LINKED, UNNAMED]), "a second run changes nothing");
    }));

test("a walkthrough whose step count differs is left free and listed not-applicable", () =>
    withRepo(board(demo([SHORT])), (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0, "a listed walkthrough is no work left");
        assert.match(check.stdout, /not-applicable .*walkthrough "statuses-are-set-up": left free — it has 1 step\(s\) and \.devbook\/domain\/work\/set-up-the-board\.md#statuses-are-set-up has 3/);
        const apply = run(root);
        assert.equal(apply.status, 0);
        assert.match(apply.stdout, /not-applicable/);
        assert.equal(read(root, DEMO_PATH), demo([SHORT]));
    }));

test("a slug two Proved by cases point at different parts is left free and listed", () => {
    const page2 = ".devbook/domain/other/set-up-another-board.md";
    const other = PAGE.replace("# Set up the board", "# Set up another board");
    const cases = `${PROVED}\n### Requirement: Another\n\n${F}meta\ntype: requirement\n${F}\n\nIt SHALL.\n\n#### Scenario: Statuses are set up\n\nProved by: set-up-another-board.md#statuses-are-set-up\n`;
    return withRepo({ ...board(demo([FREE]), cases), [page2]: other }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout + check.stderr);
        assert.match(check.stdout, /not-applicable .*naming 2 parts/);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, DEMO_PATH), demo([FREE]));
    });
});

test("a walkthrough no Proved by case names, or one beside an inline case, is left alone", () => {
    const inline = "#### Scenario: Statuses are set up\n\n- **Given** a product\n- **When** I add one\n- **Then** it shows\n";
    return withRepo(board(demo([FREE, UNNAMED]), inline), (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0);
        assert.doesNotMatch(check.stdout, /not-applicable|link /);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, DEMO_PATH), demo([FREE, UNNAMED]));
    });
});

test("a Proved by path written from the requirement's folder becomes the page's repository path", () => {
    const requirementsElsewhere = ".devbook/domain/work/rules/requirements.md";
    const cases = "#### Scenario: Statuses are set up\n\nProved by: ../set-up-the-board.md#statuses-are-set-up\n";
    return withRepo({ [PAGE_PATH]: PAGE, [requirementsElsewhere]: requirements(cases), [DEMO_PATH]: demo([FREE]) }, async (root) => {
        assert.equal(run(root).status, 0);
        assert.match(read(root, DEMO_PATH), /"part": "\.devbook\/domain\/work\/set-up-the-board\.md#statuses-are-set-up"/);
        assert.deepEqual((await checker(root)).problems, []);
    });
});

test("a repository that never adopted domain/ is not-applicable", () =>
    withRepo(board(demo([FREE])), (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0);
        assert.match(check.stdout, /not-applicable — `domain` is not adopted/);
        assert.equal(read(root, DEMO_PATH), demo([FREE]));
    }, ["arc42"]));
