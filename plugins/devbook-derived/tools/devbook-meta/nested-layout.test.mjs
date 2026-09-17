// Exercises the two permitted folder layouts: flat, as five root-level
// dot-folders, and nested, under one `.devbook/` parent whose subfolders drop
// the dot. A repository picks one and never mixes them.
//
// The load-bearing case is that nothing downstream of discovery knows which
// layout it is looking at. An address is just a repository path, so the same
// corpus must produce the same graph and the same edges under either spelling
// — only the paths differ. Before this, `folderKindForPath` recognized the flat
// spelling alone, so a nested repository resolved to no folder at all and
// silently indexed nothing.
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    folderKindForPath,
    validateDocument,
    DEVBOOK_FOLDER_NAMES,
    NESTED_ROOT,
} from "./metadata.mjs";
import {
    buildGraph,
    buildGraphDocument,
    discoverLayout,
    discoverScopes,
    outputPathFor,
    SCOPES,
    DEVBOOK_FOLDERS,
    NESTED_DEVBOOK_FOLDERS,
} from "./graph.mjs";
import { buildOutlineDocument } from "./outline.mjs";

let failed = 0;
const check = (ok, name, detail) => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
};

// -- Path resolution --------------------------------------------------------

for (const name of DEVBOOK_FOLDER_NAMES) {
    check(folderKindForPath(`.${name}/x.md`) === name, `flat .${name}/ resolves to ${name}`);
    check(
        folderKindForPath(`${NESTED_ROOT}/${name}/x.md`) === name,
        `nested ${NESTED_ROOT}/${name}/ resolves to ${name}`
    );
    check(
        folderKindForPath(`${NESTED_ROOT}/${name}/deep/nested/x.md`) === name,
        `nested ${NESTED_ROOT}/${name}/ resolves at any depth`
    );
}

check(folderKindForPath("docs/x.md") === null, "a path outside the convention resolves to null");
check(
    folderKindForPath(`${NESTED_ROOT}/notafolder/x.md`) === null,
    "an unknown subfolder of the nested root resolves to null"
);
check(
    folderKindForPath(`${NESTED_ROOT}/.domain/x.md`) === null,
    "the nested layout drops the dot, so .devbook/.domain is not a folder"
);
check(
    folderKindForPath(".domainish/x.md") === null,
    "a folder that merely starts with a known name is not that folder"
);
check(
    folderKindForPath("x.md") === null && folderKindForPath(".tech") === null,
    "a bare filename, and a folder with no trailing slash, resolve to null"
);
check(
    folderKindForPath(String.raw`.devbook\tech\x.md`) === "tech",
    "a Windows path separator still resolves"
);

// -- Scope names ------------------------------------------------------------

check(
    NESTED_DEVBOOK_FOLDERS.every((f) => SCOPES.includes(f)) &&
        DEVBOOK_FOLDERS.every((f) => SCOPES.includes(f)),
    "SCOPES carries both spellings, so a scope argument is accepted in either layout"
);
check(
    outputPathFor(`${NESTED_ROOT}/tech`) === `${NESTED_ROOT}/tech/_meta/graph.json`,
    "a nested scope writes its _meta beside its own chapters",
    outputPathFor(`${NESTED_ROOT}/tech`)
);

// -- The same corpus, both ways round ---------------------------------------

const fence = (body) => "```meta\n" + body + "```\n";

function corpus(nested) {
    const at = (name) => (nested ? `${NESTED_ROOT}/${name}` : `.${name}`);
    return [
        [
            `${at("domain")}/context-map.md`,
            `# Context Map\n\n${fence("index: root\ntype: context-map\n")}\n` +
                `## Order Management\n\n${fence(
                    `type: bounded-context\nrelated: ["${at("tech")}/technology-graph.md#postgres"]\n`
                )}\nA context.\n`,
        ],
        [
            `${at("tech")}/technology-graph.md`,
            `# Technology Graph\n\n${fence("status: adopted\nindex: root\n")}\n` +
                `## Postgres\n\n${fence("status: adopted\ntype: service\n")}\nA database.\n`,
        ],
    ];
}

async function writeCorpus(root, nested) {
    for (const [rel, body] of corpus(nested)) {
        await mkdir(path.join(root, path.dirname(rel)), { recursive: true });
        await writeFile(path.join(root, rel), body, "utf8");
    }
}

const flatRoot = await mkdtemp(path.join(tmpdir(), "devbook-flat-"));
const nestedRoot = await mkdtemp(path.join(tmpdir(), "devbook-nested-"));
try {
    await writeCorpus(flatRoot, false);
    await writeCorpus(nestedRoot, true);

    const flatLayout = await discoverLayout(flatRoot);
    const nestedLayout = await discoverLayout(nestedRoot);
    check(
        flatLayout.layout === "flat",
        "a root-level corpus reports the flat layout",
        flatLayout.layout
    );
    check(
        nestedLayout.layout === "nested",
        "a .devbook corpus reports the nested layout",
        nestedLayout.layout
    );
    check(!flatLayout.mixed && !nestedLayout.mixed, "neither single-layout corpus is mixed");
    check(
        nestedLayout.folders.every((f) => f.startsWith(`${NESTED_ROOT}/`)),
        "the nested layout discovers real .devbook paths",
        JSON.stringify(nestedLayout.folders)
    );

    const flatScopes = await discoverScopes(flatRoot);
    const nestedScopes = await discoverScopes(nestedRoot);
    check(
        flatScopes.includes(".domain") && nestedScopes.includes(`${NESTED_ROOT}/domain`),
        "discoverScopes returns the paths the repository actually uses",
        JSON.stringify(nestedScopes)
    );

    const flatGraph = await buildGraph(flatRoot);
    const nestedGraph = await buildGraph(nestedRoot);
    check(
        flatGraph.nodes.length > 0 && flatGraph.nodes.length === nestedGraph.nodes.length,
        "both layouts produce the same number of nodes",
        `flat ${flatGraph.nodes.length}, nested ${nestedGraph.nodes.length}`
    );
    check(
        flatGraph.edges.length === nestedGraph.edges.length && nestedGraph.edges.length > 0,
        "the cross-folder reference resolves in both layouts",
        `flat ${flatGraph.edges.length}, nested ${nestedGraph.edges.length}`
    );
    check(
        nestedGraph.problems.filter((p) => p.severity === "error").length === 0,
        "a nested corpus builds without errors",
        JSON.stringify(nestedGraph.problems)
    );

    const nestedDoc = await buildGraphDocument(nestedRoot, `${NESTED_ROOT}/domain`);
    check(
        nestedDoc.elements.nodes.length > 0,
        "a nested scope projects a non-empty graph",
        JSON.stringify(nestedDoc.stats)
    );
    const nestedOutline = await buildOutlineDocument(nestedRoot);
    check(
        nestedOutline.entries.length === nestedLayout.folders.length,
        "the repo-wide outline lists every discovered nested folder",
        JSON.stringify(nestedOutline.entries.map((e) => e.path))
    );

    // -- The mix a repository must never ship --------------------------------
    await mkdir(path.join(nestedRoot, ".design"), { recursive: true });
    await writeFile(
        path.join(nestedRoot, ".design", "README.md"),
        `# Design\n\n${fence("status: draft\nindex: root\n")}\nStrays.\n`,
        "utf8"
    );
    const mixedLayout = await discoverLayout(nestedRoot);
    check(mixedLayout.mixed && mixedLayout.layout === "mixed", "both layouts at once reports mixed");
    const mixedGraph = await buildGraph(nestedRoot);
    check(
        mixedGraph.problems.some(
            (p) => p.severity === "error" && /never mixes them/.test(p.message)
        ),
        "a mixed layout is an error, not a silent half-corpus",
        JSON.stringify(mixedGraph.problems.map((p) => p.message))
    );
    check(
        mixedGraph.nodes.some((n) => n.path && n.path.startsWith(".design/")),
        "the strayed folder is still indexed, so nothing becomes invisible"
    );
} finally {
    await rm(flatRoot, { recursive: true, force: true });
    await rm(nestedRoot, { recursive: true, force: true });
}

// -- bounded-context is a domain chapter type -------------------------------

const contextMap =
    `# Context Map\n\n${fence("index: root\ntype: context-map\n")}\n` +
    `## Order Management\n\n${fence("type: bounded-context\n")}\nA context.\n`;
for (const rel of [".domain/context-map.md", `${NESTED_ROOT}/domain/context-map.md`]) {
    const issues = validateDocument(rel, contextMap);
    check(
        issues.filter((i) => i.severity === "error").length === 0,
        `bounded-context validates as a domain chapter type (${rel})`,
        JSON.stringify(issues)
    );
}
const badType = validateDocument(
    ".domain/context-map.md",
    `# Context Map\n\n${fence("index: root\ntype: context-map\n")}\n` +
        `## Order Management\n\n${fence("type: not-a-type\n")}\nA context.\n`
);
check(
    badType.some((i) => i.severity === "error" && /not-a-type/.test(i.message)),
    "an unknown chapter type is still an error"
);

console.log(failed ? `\n${failed} case(s) failed.` : "\nAll cases passed.");
process.exit(failed ? 1 : 0);
