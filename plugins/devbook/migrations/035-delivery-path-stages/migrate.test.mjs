// 035-delivery-path-stages against an `ai/` folder written in the DevOps
// loop's words: every `stage` list moves onto the delivery path, de-duplicated
// and in path order, and the result validates against the checker. A shared
// `release` moves only where the folder is the loop's, a block already on the
// path is left, a second run changes nothing, and a repository without `ai/`
// adopted is not applicable.
//
//   node --test plugins/devbook/migrations/035-delivery-path-stages/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDocument } from "../../tools/devbook-meta/metadata.mjs";
import { rewriteWords } from "./migrate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const F = "```";

const usage = (title, stage, extra = "") => `## ${title}

${F}meta
status: adopted
type: practice
stage: ${stage}${extra}
${F}

What it does.
`;
const DELIVER = `# 2. Deliver

${F}meta
status: adopted
type: stage
${F}

The loop.

${usage("Flow", "[plan, code, test]")}
${usage("Ship", "[build, test, release, deploy]")}
${usage("Watch", "[operate, monitor]")}
${usage("Alone", "release")}
${F}text
stage: [plan]
${F}
`;

function repo(files, adopted = ["ai"]) {
    const root = mkdtempSync(path.join(tmpdir(), "devbook-035-"));
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
const D = ".devbook/ai/02-deliver.md";

test("--check lists the work and writes nothing; apply maps, de-duplicates, and orders every list", () =>
    withRepo({ [D]: DELIVER }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 1);
        assert.match(check.stdout, /would move .*\(Flow\): stage \[plan, code, test\] → \[specify, code, verify\]/);
        assert.equal(read(root, D), DELIVER, "--check writes nothing");

        const apply = run(root);
        assert.equal(apply.status, 0, apply.stdout + apply.stderr);
        assert.match(apply.stdout, /repository's to place/);
        const text = read(root, D);
        assert.match(text, /## Flow\n\n```meta\n[^`]*stage: \[specify, code, verify\]\n/);
        assert.match(text, /## Ship\n\n```meta\n[^`]*stage: \[verify, integrate, release\]\n/);
        assert.match(text, /## Watch\n\n```meta\n[^`]*stage: \[operate\]\n/);
        assert.match(text, /## Alone\n\n```meta\n[^`]*stage: integrate\n/, "a scalar stays a scalar; the loop's release is integrate");
        assert.match(text, /```text\nstage: \[plan\]\n```/, "a non-meta fence is never read");
        for (const field of ["substage", "layer", "feeds", "evidence"]) assert.doesNotMatch(text, new RegExp(`^${field}:`, "m"));

        const errors = validateDocument(D, text).filter((issue) => issue.severity === "error");
        assert.deepEqual(errors, []);
    }));

test("a second run changes nothing, and the moved release is not moved again", () =>
    withRepo({ [D]: DELIVER }, (root) => {
        assert.equal(run(root).status, 0);
        const once = read(root, D);
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout);
        assert.match(check.stdout, /nothing to do/);
        assert.equal(run(root).status, 0);
        assert.equal(read(root, D), once);
    }));

test("CRLF is kept", () =>
    withRepo({ [D]: DELIVER.replace(/\n/g, "\r\n") }, (root) => {
        assert.equal(run(root).status, 0);
        const text = read(root, D);
        assert.ok(!/[^\r]\n/.test(text), "every line ends CRLF");
        assert.match(text, /stage: \[specify, code, verify\]\r\n/);
    }));

test("a folder already on the path is left; a lone shared release there is reported, never counted", () =>
    withRepo({ [D]: `# Deliver\n\n${usage("Path", "[specify, verify]")}\n${usage("Shared", "[release]")}` }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout);
        assert.match(check.stdout, /\(Shared\): left — it reads the same under both vocabularies/);
    }));

test("a block mixing both vocabularies moves its loop-only words and keeps the rest", () => {
    assert.deepEqual(rewriteWords(["specify", "test", "release"], true).words, ["specify", "verify", "release"]);
    assert.match(rewriteWords(["specify", "test", "release"], true).note, /mixes both vocabularies/);
    assert.deepEqual(rewriteWords(["code", "release"], true).words, ["code", "integrate"]);
    assert.equal(rewriteWords(["code", "operate"], false).words, null);
    assert.deepEqual(rewriteWords(["deploy", "custom"], false).words, ["release", "custom"], "a word off both vocabularies is kept, last");
});

test("a word of neither vocabulary is reported; a quoted entry is read", () =>
    withRepo({ [D]: `# Deliver\n\n${usage("Odd", '["deploy", custom]')}` }, (root) => {
        const apply = run(root);
        assert.equal(apply.status, 0);
        assert.match(apply.stdout, /\(Odd\): kept "custom", a word of neither vocabulary/);
        assert.match(read(root, D), /stage: \[release, custom\]\n/);
    }));

test("a repository that never adopted ai/ is not applicable", () =>
    withRepo({ [D]: DELIVER }, (root) => {
        const check = run(root, "--check");
        assert.equal(check.status, 0);
        assert.match(check.stdout, /not-applicable — `ai` is not adopted/);
        assert.equal(read(root, D), DELIVER);
    }, ["arc42"]));
