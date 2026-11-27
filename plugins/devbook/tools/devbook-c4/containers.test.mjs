// containers.mjs turns `aspire describe --format mermaid` into the container
// level: the fixture is the shape Aspire 17 prints, positional `resourceN` ids
// labelled by resource name, with a dev-only resource, a database's own
// containers to fold, an unmapped resource, and a container with no description.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { containersDsl, parseDescribe } from "./containers.mjs";
import { readWorkspace } from "../devbook-meta/c4.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, "fixtures", name), "utf8");
const lf = (t) => t.replace(/\r\n?/g, "\n");
const describe = fixture("describe.mmd");
const map = JSON.parse(fixture("aspire-map.json"));

test("reads every resource by its label and every reference", () => {
    const { resources, edges, problems } = parseDescribe(describe);
    assert.deepEqual(problems, []);
    assert.equal(resources.size, 9);
    assert.equal(resources.get("resource0"), "api");
    assert.equal(edges.length, 9);
    assert.deepEqual(edges[0], { from: "resource2", to: "resource4" });
});

test("reads the other flowchart forms a describe output could take", () => {
    const { resources, edges, problems } = parseDescribe([
        "%% a comment",
        "graph TD;",
        "  a[A] -->|uses| b(\"B\")",
        "  c --> d --> e",
        "  f & g -.-> h{H}",
        "  classDef x fill:#fff",
        "  subgraph s",
        "  end",
        "  ??? nonsense",
    ].join("\n"));
    assert.equal(resources.get("a"), "A");
    assert.equal(resources.get("b"), "B");
    assert.equal(resources.get("c"), "c");
    assert.deepEqual(edges.map((e) => `${e.from}>${e.to}`), ["a>b", "c>d", "d>e", "f>h", "g>h"]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /line 9: .* not a node/);
    assert.match(parseDescribe("a --> b").problems.join(), /opens with `flowchart`/);
});

test("writes one container per kept element and one relationship per reference", () => {
    const { text } = containersDsl(describe, map);
    assert.equal(text, lf(fixture("containers.dsl")));
    assert.doesNotMatch(text, /storybook|worker|payments = |orders = /, "dropped, unmapped, and folded resources leave no element of their own");
    assert.equal(text.match(/shop\.api -> shop\.db/g).length, 1, "a reference repeated, or reached through a folded resource, is one relationship");
    assert.doesNotMatch(text, /shop\.db -> shop\.db/, "a folded resource never relates to its own container");
});

test("reports an unmapped resource, a container with no description, and a bad identifier", () => {
    const { reports } = containersDsl(describe, map);
    assert.ok(reports.some((r) => /resource `worker` has no mapping/.test(r)), reports.join("\n"));
    assert.ok(reports.some((r) => /container `shop.cache` has no description/.test(r)), reports.join("\n"));
    const bad = containersDsl(describe, { drop: ["*"], resources: {} });
    assert.deepEqual(bad.reports, []);
    const wrong = containersDsl("flowchart LR\n  a[\"api\"]", { resources: { api: { element: "api", description: "x" }, gone: { element: "s.gone" } } });
    assert.ok(wrong.reports.some((r) => /not a container identifier/.test(r)), wrong.reports.join("\n"));
    assert.ok(wrong.reports.some((r) => /mapping names `gone`/.test(r)), wrong.reports.join("\n"));
    const clash = containersDsl("flowchart LR\n  a[\"a\"]\n  b[\"b\"]", { resources: { a: { element: "s.db", description: "One." }, b: { element: "s.db", description: "Two." } } });
    assert.match(clash.text, /db = container "db" "One\."/);
    assert.ok(clash.reports.some((r) => /resource `b` gives `s.db` the description `Two.`/.test(r)), clash.reports.join("\n"));
});

test("the generated file reads clean in a workspace that includes it", () => {
    const root = mkdtempSync(path.join(tmpdir(), "c4-containers-"));
    try {
        mkdirSync(path.join(root, "c4", "generated"), { recursive: true });
        writeFileSync(path.join(root, "c4", "generated", "containers.dsl"), containersDsl(describe, map).text);
        writeFileSync(path.join(root, "workspace.dsl"), [
            'workspace "Shop" {',
            "    !identifiers hierarchical",
            "    model {",
            '        customer = person "Customer" "Buys things."',
            '        shop = softwareSystem "Shop" "Sells things."',
            "        !include c4/generated/containers.dsl",
            '        customer -> shop.web "Browses"',
            "    }",
            "    views {",
            '        container shop containers "The shop\'s containers." {',
            "            include *",
            "        }",
            "    }",
            "}",
        ].join("\n"));
        const r = readWorkspace("workspace.dsl", { root });
        assert.deepEqual(r.problems, []);
        assert.deepEqual(r.elements.filter((e) => e.kind === "container").map((e) => e.id).sort(), ["shop.api", "shop.cache", "shop.db", "shop.web"]);
        assert.equal(r.relationships.length, 4);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("--check writes nothing and exits 1 until the committed file is current", () => {
    const root = mkdtempSync(path.join(tmpdir(), "c4-containers-cli-"));
    const script = path.join(here, "containers.mjs");
    const out = path.join(root, ".devbook", "arc42", "c4", "generated");
    try {
        mkdirSync(out, { recursive: true });
        copyFileSync(path.join(here, "fixtures", "aspire-map.json"), path.join(out, "..", "aspire-map.json"));
        const run = (...extra) => spawnSync(process.execPath, [script, "--root", root, "--describe", path.join(here, "fixtures", "describe.mmd"), ...extra], { encoding: "utf8" });
        const absent = run("--check");
        assert.equal(absent.status, 1, absent.stderr);
        assert.ok(!existsSync(path.join(out, "containers.dsl")), "--check wrote the file");
        const written = run();
        assert.equal(written.status, 0, written.stderr);
        assert.match(written.stderr, /worker/);
        assert.equal(readFileSync(path.join(out, "containers.dsl"), "utf8"), lf(fixture("containers.dsl")));
        assert.equal(run("--check").status, 0);
        writeFileSync(path.join(out, "containers.dsl"), "// edited by hand\n");
        assert.equal(run("--check").status, 1);
        assert.equal(readFileSync(path.join(out, "containers.dsl"), "utf8"), "// edited by hand\n", "--check rewrote the file");
        const missing = spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
        assert.equal(missing.status, 2);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
