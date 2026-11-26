// The code-model generator, a .NET console, run against the fixture repository
// `fixtures/shop/`: three projects whose types carry the markers by interface
// and by base class, two building blocks mapping their folders to components,
// and a domain/ chapter carrying all but one class name in `aliases`. The
// fixture's committed `.devbook/arc42/c4/generated/` is the golden output. Each
// test works on a copy in a temporary folder, so nothing is written here.
//
// Pinned: a run from nothing writes the golden files; the C4 reader includes
// them with no problem and the renderer draws every image view; `--check` exits
// 0 when current, and 1 with nothing written when a type moved or a stale
// diagram lies in `code/`; a type with no alias and a root in no block's `code`
// folder are reported; other marker names select other types.
//
// Needs a .NET 10 SDK or later on the PATH and NuGet access for the first
// restore; without the SDK every test is skipped, saying so.
//
// Run: `node --test code-model.test.mjs`.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readWorkspace } from "../../devbook-meta/c4.mjs";
import { renderView } from "../../../../devbook-derived/tools/c4-render/render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.join(here, "CodeModel.csproj");
const fixture = path.join(here, "fixtures", "shop");
const generated = path.join(".devbook", "arc42", "c4", "generated");

const dotnet = (args, options = {}) => spawnSync("dotnet", args, { encoding: "utf8", ...options });
const sdks = dotnet(["--list-sdks"]);
const sdk = sdks.status === 0 && sdks.stdout.split("\n").some((line) => Number(line.split(".")[0]) >= 10);
const skip = sdk ? false : "no .NET 10 SDK on the PATH";

const read = (dir) => readFileSync(dir, "utf8").replace(/\r\n/g, "\n");
const tree = (root) => {
    const files = {};
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else files[path.relative(root, full).replace(/\\/g, "/")] = read(full);
        }
    };
    if (existsSync(root)) walk(root);
    return files;
};

// A copy of the fixture with its solution restored, outside the repository.
const copy = () => {
    const dir = mkdtempSync(path.join(tmpdir(), "code-model-"));
    cpSync(fixture, dir, { recursive: true, filter: (src) => !/[\\/](bin|obj)$/.test(src) });
    const restore = dotnet(["restore", path.join("src", "Shop.sln"), "-v", "q"], { cwd: dir });
    assert.equal(restore.status, 0, restore.stdout + restore.stderr);
    return dir;
};
const run = (dir, ...args) => dotnet(["run", "--project", project, "--no-build", "--", "--solution", path.join("src", "Shop.sln"), ...args], { cwd: dir });

before(() => {
    if (skip) return;
    const build = dotnet(["build", project, "-nologo", "-v", "q"]);
    assert.equal(build.status, 0, build.stdout + build.stderr);
});

test("a run from nothing writes the golden files and reports what it cannot place", { skip }, () => {
    const dir = copy();
    try {
        rmSync(path.join(dir, generated), { recursive: true, force: true });
        const r = run(dir);
        assert.equal(r.status, 0, r.stderr);
        assert.deepEqual(tree(path.join(dir, generated)), tree(path.join(fixture, generated)));
        assert.match(r.stderr, /^no-alias: Address \(value object, src\/Shop\.Ordering\/Order\.cs\)/m);
        assert.match(r.stderr, /^unmapped: AuditEntry \(src\/Shop\.Kernel\/Audit\/AuditEntry\.cs\)/m);
        assert.match(r.stderr, /^name-collision: shop\.api\.ordering: two types are named Money; Shop\.Ordering\.Legacy\.Money is drawn as Money_2$/m);
        assert.doesNotMatch(r.stderr, /no-alias: (Order|OrderLine|Money|Note|Product|Sku)\b/);
        assert.doesNotMatch(r.stderr, /OrderingRoot/, "an abstract base is no root of its own");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("the golden files read clean and every image view draws", () => {
    const model = readWorkspace(path.join(fixture, ".devbook", "arc42", "workspace.dsl"), { root: fixture });
    assert.deepEqual(model.problems, []);
    const images = model.views.filter((v) => v.kind === "image");
    assert.deepEqual(images.map((v) => [v.key, v.scope]), [["shop-api-catalog-code", "shop.api.catalog"], ["shop-api-ordering-code", "shop.api.ordering"]]);
    for (const view of images) assert.match(renderView(model, view), /^<svg/);
});

test("the diagram holds the root's entities and value objects, never its events or another root", () => {
    const ordering = read(path.join(fixture, generated, "code", "shop.api.ordering.mmd"));
    assert.match(ordering, /Order "1" \*-- "many" OrderLine : Lines/);
    assert.match(ordering, /OrderLine "1" --> "1" Money : Price/);
    assert.match(ordering, /<<aggregate root>>/);
    assert.doesNotMatch(ordering, /class OrderPlaced|class Product|class AuditEntry|class OrderingRoot/);
    assert.match(ordering, /Order "1" \*-- "many" OrderLine : ByWarehouse/, "a collection inside a collection is unwrapped");
    assert.match(ordering, /Order "1" --> "many" Order_Note : Notes/, "a nested type is Outer_Inner");
    assert.match(ordering, /OrderLine "1" --> "1" Money_2 : LegacyPrice/, "a second type of one name takes a number");
    assert.match(ordering, /\+ValueTuple~int,decimal~ Totals/, "a tuple is a ValueTuple, not a method");
    assert.match(ordering, /\+DateTime CreatedAt/, "a base class's public member shows on the root");
    assert.doesNotMatch(ordering, /_lines/, "a private field draws nothing");
    const catalog = read(path.join(fixture, generated, "code", "shop.api.catalog.mmd"));
    assert.match(catalog, /Product "1" --> "many" Sku : Variants/, "a base class named for a marker marks the type");
});

test("--check exits 0 when current and 1 on drift, writing nothing", { skip }, () => {
    const dir = copy();
    try {
        const current = run(dir, "--check");
        assert.equal(current.status, 0, current.stderr);

        const order = path.join(dir, "src", "Shop.Ordering", "Order.cs");
        writeFileSync(order, read(order).replace("public int Quantity { get; init; }", "public int Quantity { get; init; }\n\n    public Money Discount { get; init; } = new(0, \"EUR\");"));
        const stale = path.join(dir, generated, "code", "gone.mmd");
        writeFileSync(stale, "classDiagram\n");
        const before = tree(path.join(dir, generated));
        const drift = run(dir, "--check");
        assert.equal(drift.status, 1);
        assert.match(drift.stderr, /^drift: \.devbook\/arc42\/c4\/generated\/code\/shop\.api\.ordering\.mmd$/m);
        assert.match(drift.stderr, /^drift: \.devbook\/arc42\/c4\/generated\/code\/gone\.mmd$/m);
        assert.deepEqual(tree(path.join(dir, generated)), before, "--check writes nothing");

        assert.equal(run(dir).status, 0);
        assert.equal(existsSync(stale), false, "a write removes a diagram no component produces");
        assert.match(read(path.join(dir, generated, "code", "shop.api.ordering.mmd")), /OrderLine "1" --> "1" Money : Discount/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("a project that fails to load writes and compares nothing", { skip }, () => {
    const dir = copy();
    try {
        rmSync(path.join(dir, "src", "Shop.Catalog"), { recursive: true, force: true });
        const before = tree(path.join(dir, generated));
        for (const args of [[], ["--check"]]) {
            const r = run(dir, ...args);
            assert.equal(r.status, 3, r.stderr);
            assert.match(r.stderr, /^load: /m);
        }
        assert.deepEqual(tree(path.join(dir, generated)), before);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("a block whose c4 names no component draws nothing for its code", { skip }, () => {
    const dir = copy();
    try {
        const block = path.join(dir, ".devbook", "arc42", "building-blocks", "catalog.md");
        writeFileSync(block, read(block).replace("c4: [shop.api.catalog]", "c4: [shop.api]"));
        const r = run(dir);
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stderr, /^no-component: \.devbook\/arc42\/building-blocks\/catalog\.md lists `code` but names no component/m);
        assert.match(r.stderr, /^unmapped: Product /m);
        assert.equal(existsSync(path.join(dir, generated, "code", "shop.api.catalog.mmd")), false);
        assert.deepEqual(readWorkspace(path.join(dir, ".devbook", "arc42", "workspace.dsl"), { root: dir }).problems, []);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("--markers replaces the four names", { skip }, () => {
    const dir = copy();
    try {
        const r = run(dir, "--markers", "IAggregateRoot,IEntity,INothing,IDomainEvent");
        assert.equal(r.status, 0, r.stderr);
        const ordering = read(path.join(dir, generated, "code", "shop.api.ordering.mmd"));
        assert.doesNotMatch(ordering, /class (Money|Address)\b/,"a type marked only by the replaced name is no longer a value object");
        assert.match(ordering, /Order "1" \*-- "many" OrderLine : Lines/);

        const bad = run(dir, "--markers", "IAggregateRoot,IEntity");
        assert.equal(bad.status, 2);
        assert.match(bad.stderr, /--markers takes four names/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
