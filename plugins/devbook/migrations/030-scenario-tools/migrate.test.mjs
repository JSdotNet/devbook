// 030-scenario-tools against the folder states it meets: missing, current, a stale copy a
// release shipped, and a customized copy — plus a repository that never adopted `domain/`.
//
//   node --test plugins/devbook/migrations/030-scenario-tools/migrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "migrate.mjs");
const SOURCE = path.resolve(HERE, "..", "..", "tools", "scenarios");
const TARGET = ".devbook/_tools/scenarios";

function files(dir, prefix = "") {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        return e.isDirectory() ? files(path.join(dir, e.name), rel) : [rel];
    });
}
function folderHash(dir) {
    const hash = createHash("sha256");
    for (const f of files(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        hash.update(`${f}\n${readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n")}\n`, "utf8");
    }
    return `sha256:${hash.digest("hex")}`;
}

function repo({ adopted = ["arc42", "domain"], materialized = {}, copy = null } = {}) {
    const root = mkdtempSync(path.join(tmpdir(), "scenario-tools-"));
    mkdirSync(path.join(root, ".devbook"));
    const stamp = { id: "x", components: { devbook: { pluginVersion: "1.20.1", contractVersion: 29, adopted, materialized } } };
    writeFileSync(path.join(root, ".devbook/config.json"), JSON.stringify(stamp, null, 2) + "\n");
    if (copy) copy(path.join(root, TARGET));
    return root;
}
const run = (root, ...flags) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...flags], { encoding: "utf8" });
const shipped = (dir) => cpSync(SOURCE, dir, { recursive: true });
const stamp = (root) => readFileSync(path.join(root, ".devbook/config.json"), "utf8");

function assertMaterialized(root) {
    assert.equal(run(root, "--check").status, 1);
    const before = stamp(root);
    assert.equal(run(root).status, 0);
    assert.equal(folderHash(path.join(root, TARGET)), folderHash(SOURCE));
    assert.equal(stamp(root), before, "the stamp is the reconcile's to write");
    assert.equal(run(root, "--check").status, 0);
    assert.equal(run(root).status, 0);
    assert.equal(folderHash(path.join(root, TARGET)), folderHash(SOURCE), "a second run changes nothing");
}

function withRepo(options, body) {
    const root = repo(options);
    try { body(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("materializes a missing folder", () => withRepo({}, assertMaterialized));

test("a current copy is nothing to do", () => withRepo({ copy: shipped }, (root) => {
    const r = run(root, "--check");
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /current/);
}));

test("replaces a stale copy the stamp recorded as shipped, dropping a file the release no longer ships", () => {
    const old = (dir) => {
        shipped(dir);
        writeFileSync(path.join(dir, "check.mjs"), "// an older release\n");
        writeFileSync(path.join(dir, "retired.mjs"), "// dropped since\n");
    };
    const probe = mkdtempSync(path.join(tmpdir(), "scenario-tools-probe-"));
    old(path.join(probe, "s"));
    const hash = folderHash(path.join(probe, "s"));
    rmSync(probe, { recursive: true, force: true });
    withRepo({ copy: old, materialized: { [TARGET]: { from: "1.21.0", hash, managed: true } } }, (root) => {
        assertMaterialized(root);
        assert.equal(existsSync(path.join(root, TARGET, "retired.mjs")), false);
    });
});

// The listed release hashes, proved against the release itself where the history is at hand;
// a shallow clone skips it.
const RELEASE = "3c4426b4"; // 1.23.0
const git = (...a) => spawnSync("git", ["-C", HERE, ...a], { encoding: "utf8", maxBuffer: 1 << 26 });
test("replaces the copy 1.23.0 shipped", { skip: git("cat-file", "-e", `${RELEASE}^{commit}`).status !== 0 && "no history" }, () => {
    const top = git("rev-parse", "--show-toplevel").stdout.trim();
    const base = path.relative(top, SOURCE).replace(/\\/g, "/") + "/";
    const old = (dir) => {
        for (const f of git("ls-tree", "-r", "--name-only", RELEASE, "--", base).stdout.split("\n").filter(Boolean)) {
            const to = path.join(dir, f.slice(base.length));
            mkdirSync(path.dirname(to), { recursive: true });
            writeFileSync(to, git("show", `${RELEASE}:${f}`).stdout);
        }
    };
    withRepo({ copy: old }, assertMaterialized);
});

test("reports a customized copy and leaves it alone", () => {
    const edited = (dir) => {
        shipped(dir);
        writeFileSync(path.join(dir, "check.mjs"), "// ours\n");
    };
    withRepo({ copy: edited }, (root) => {
        const hash = folderHash(path.join(root, TARGET));
        const check = run(root, "--check");
        assert.equal(check.status, 0, check.stdout);
        assert.match(check.stdout, /customized/);
        assert.equal(run(root).status, 0);
        assert.equal(folderHash(path.join(root, TARGET)), hash);
    });
});

test("a copy the stamp records managed: false is never written, even when it matches a release", () => {
    const old = (dir) => { shipped(dir); writeFileSync(path.join(dir, "check.mjs"), "// older\n"); };
    withRepo({ copy: old, materialized: { [TARGET]: { from: "1.21.0", hash: "sha256:x", managed: false } } }, (root) => {
        const hash = folderHash(path.join(root, TARGET));
        assert.equal(run(root, "--check").status, 0);
        assert.equal(run(root).status, 0);
        assert.equal(folderHash(path.join(root, TARGET)), hash);
    });
});

test("not-applicable where `domain` is not adopted", () => withRepo({ adopted: ["arc42"] }, (root) => {
    const r = run(root, "--check");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /not-applicable/);
    assert.equal(run(root).status, 0);
    assert.equal(existsSync(path.join(root, TARGET)), false);
}));

test("nothing to do without a devbook stamp", () => {
    const root = mkdtempSync(path.join(tmpdir(), "scenario-tools-"));
    try {
        assert.equal(run(root, "--check").status, 0);
        assert.equal(existsSync(path.join(root, TARGET)), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
