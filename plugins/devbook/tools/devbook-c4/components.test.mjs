// components.mjs turns the .NET project graph into the component level. The
// fixture repository is built in a temporary folder, so no `.csproj` sits in
// this repository for a package inventory to find: two blocks whose code
// folders nest, a project in neither, a project with no description, build
// output to skip, and a NuGet cache under `packages/`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentsDsl, parseProject, readBlocks, readProjects } from "./components.mjs";
import { containersDsl } from "./containers.mjs";
import { readWorkspace } from "../devbook-meta/c4.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, "fixtures", name), "utf8");
const lf = (t) => t.replace(/\r\n?/g, "\n");

const csproj = (description, ...refs) => [
    '<Project Sdk="Microsoft.NET.Sdk">',
    "  <PropertyGroup>",
    "    <TargetFramework>net10.0</TargetFramework>",
    description == null ? "" : `    <Description>${description}</Description>`,
    "  </PropertyGroup>",
    "  <ItemGroup>",
    ...refs.map((r) => `    <ProjectReference Include="${r}" />`),
    "  </ItemGroup>",
    "</Project>",
].join("\n");

const block = (title, c4, code) => `# ${title}\n\n\`\`\`meta\nc4: ${JSON.stringify(c4)}\ncode: ${JSON.stringify(code)}\n\`\`\`\n\nWhat it is.\n`;

function repository() {
    const root = mkdtempSync(path.join(tmpdir(), "c4-components-"));
    const put = (file, text) => {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), text);
    };
    put("src/Shop.Orders/Shop.Orders.csproj", csproj("Takes orders &amp; tracks them\n      until they ship.", "..\\Shop.Kernel\\Shop.Kernel.csproj", "../Shop.Payments/Shop.Payments.csproj"));
    put("src/Shop.Orders/Domain/Shop.Orders.Domain.csproj", csproj(null, "../../Shop.Kernel/Shop.Kernel.csproj"));
    put("src/Shop.Payments/Shop.Payments.csproj", csproj("Charges cards.", "../Shop.Kernel/Shop.Kernel.csproj", "../Missing/Missing.csproj"));
    put("src/Shop.Kernel/Shop.Kernel.csproj", csproj(null));
    put("tests/Shop.Orders.Tests/Shop.Orders.Tests.csproj", csproj("Tests.", "../../src/Shop.Orders/Shop.Orders.csproj"));
    put("src/Shop.Orders/bin/Debug/Copy.csproj", csproj("Build output."));
    put("packages/cached.1.0.0/readme.txt", "a NuGet cache");
    put(".claude/worktrees/other/src/Shop.Orders/Shop.Orders.csproj", csproj("A sibling worktree."));
    put("vendor/lib/.git", "gitdir: elsewhere");
    put("vendor/lib/Lib.csproj", csproj("A submodule."));
    put(".devbook/arc42/building-blocks/README.md", "# Building blocks\n\n```meta\n```\n\nThe index.\n");
    put(".devbook/arc42/building-blocks/orders.md", block("Orders", ["shop.api.orders"], ["src/Shop.Orders"]));
    put(".devbook/arc42/building-blocks/payments.md", block("Payments", ["shop.api.payments", "shop.api"], ["src/Shop.Payments"]));
    put(".devbook/arc42/building-blocks/kernel.md", block("Kernel", ["shop.api.kernel"], ["src"]));
    put(".devbook/arc42/building-blocks/web.md", block("Web", ["shop.web"], ["web"]));
    return root;
}

test("reads a project's description and references with no build", () => {
    const p = parseProject(csproj("A &lt;b&gt;", "..\\X\\X.csproj"));
    assert.deepEqual(p, { description: "A <b>", references: ["../X/X.csproj"] });
    assert.deepEqual(parseProject('<Project><ItemGroup><ProjectReference Include="a.csproj"></ProjectReference></ItemGroup></Project>'), { description: null, references: ["a.csproj"] });
});

test("writes a component per block that holds a project, and a relationship per reference between two", async () => {
    const root = repository();
    try {
        const projects = await readProjects(root);
        assert.deepEqual(projects.map((p) => p.path), [
            "src/Shop.Kernel/Shop.Kernel.csproj",
            "src/Shop.Orders/Domain/Shop.Orders.Domain.csproj",
            "src/Shop.Orders/Shop.Orders.csproj",
            "src/Shop.Payments/Shop.Payments.csproj",
            "tests/Shop.Orders.Tests/Shop.Orders.Tests.csproj",
        ], "build output, a NuGet cache, a host's worktrees, and a nested checkout are skipped");
        const { text, reports } = componentsDsl(projects, await readBlocks(root, path.join(root, ".devbook/arc42/building-blocks")));
        assert.equal(text, lf(fixture("components.dsl")));
        assert.match(text, /orders = component "Orders" "Takes orders & tracks them until they ship\."/, "the nearest code folder owns a project, and the description is one line");
        assert.doesNotMatch(text, /web = /, "a block with no project is no component");
        assert.ok(reports.some((r) => /component `shop.api.kernel` has no description/.test(r)), reports.join("\n"));
        assert.ok(reports.some((r) => /`tests\/Shop.Orders.Tests\/Shop.Orders.Tests.csproj` sits in no building block/.test(r)), reports.join("\n"));
        assert.ok(reports.some((r) => /references `..\/Missing\/Missing.csproj`, which is no project/.test(r)), reports.join("\n"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("reports a block whose c4 names no component, and two blocks naming one", () => {
    const projects = [{ path: "a/A.csproj", description: "A.", references: [] }, { path: "b/B.csproj", description: "B.", references: [] }];
    const flat = componentsDsl(projects, [{ file: "x.md", title: "X", c4: ["shop.api"], code: ["a"] }]);
    assert.ok(flat.reports.some((r) => /not a component/.test(r)), flat.reports.join("\n"));
    const twice = componentsDsl(projects, [
        { file: "x.md", title: "X", c4: ["s.c.x"], code: ["a"] },
        { file: "y.md", title: "Y", c4: ["s.c.x"], code: ["b"] },
    ]);
    assert.ok(twice.reports.some((r) => /another block already names/.test(r)), twice.reports.join("\n"));
    const tie = componentsDsl(projects, [
        { file: "x.md", title: "X", c4: ["s.c.x"], code: ["./a/"] },
        { file: "y.md", title: "Y", c4: ["s.c.y"], code: ["a"] },
    ]);
    assert.match(tie.text, /x = component "X" "A\."/, "a `./`-prefixed code entry is the same folder");
    assert.ok(tie.reports.some((r) => /sits in the `code` of both `x.md` and `y.md`/.test(r)), tie.reports.join("\n"));
    const root = componentsDsl([{ path: "Root.csproj", description: "R.", references: [] }], [{ file: "r.md", title: "R", c4: ["s.c.r"], code: ["."] }]);
    assert.match(root.text, /r = component/, "a project at the root belongs to a block whose code is `.`");
});

test("reads a single-quoted ProjectReference", () => {
    assert.deepEqual(parseProject("<Project><ItemGroup><ProjectReference Include='../A/A.csproj' /></ItemGroup></Project>").references, ["../A/A.csproj"]);
});

test("both generated files read clean in one workspace", async () => {
    const root = repository();
    try {
        const generated = path.join(root, ".devbook/arc42/c4/generated");
        mkdirSync(generated, { recursive: true });
        writeFileSync(path.join(generated, "containers.dsl"), containersDsl(fixture("describe.mmd"), JSON.parse(fixture("aspire-map.json"))).text);
        writeFileSync(path.join(generated, "components.dsl"), componentsDsl(await readProjects(root), await readBlocks(root, path.join(root, ".devbook/arc42/building-blocks"))).text);
        writeFileSync(path.join(root, ".devbook/arc42/workspace.dsl"), [
            'workspace "Shop" {',
            "    !identifiers hierarchical",
            "    model {",
            '        shop = softwareSystem "Shop" "Sells things."',
            "        !include c4/generated/containers.dsl",
            "        !include c4/generated/components.dsl",
            "    }",
            "    views {",
            '        component shop.api api "The API\'s components." {',
            "            include *",
            "        }",
            "    }",
            "}",
        ].join("\n"));
        const r = readWorkspace(".devbook/arc42/workspace.dsl", { root });
        assert.deepEqual(r.problems, []);
        assert.deepEqual(r.elements.filter((e) => e.kind === "component").map((e) => e.id).sort(), ["shop.api.kernel", "shop.api.orders", "shop.api.payments"]);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("--check writes nothing and exits 1 until the committed file is current", () => {
    const root = repository();
    const script = path.join(here, "components.mjs");
    const out = path.join(root, ".devbook/arc42/c4/generated/components.dsl");
    try {
        const run = (...extra) => spawnSync(process.execPath, [script, "--root", root, ...extra], { encoding: "utf8" });
        assert.equal(run("--check").status, 1);
        assert.ok(!existsSync(out), "--check wrote the file");
        const written = run();
        assert.equal(written.status, 0, written.stderr);
        assert.match(written.stderr, /no description/);
        assert.equal(readFileSync(out, "utf8"), lf(fixture("components.dsl")));
        assert.equal(run("--check").status, 0);
        writeFileSync(out, "// edited\n");
        assert.equal(run("--check").status, 1);
        assert.equal(readFileSync(out, "utf8"), "// edited\n", "--check rewrote the file");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
