// graph.mjs — derives the cross-folder reference graph from the `meta` blocks
// embedded in .arc42/, .domain/, .tech/, .design/, and .ai/.
//
// Markdown stays canonical; this produces the *derived* index. Output shape is
// Cytoscape.js `elements` JSON, which most graph libraries consume natively or
// map from trivially.
//
// Consumed by the `build.mjs` CLI and by the devbook-graph canvas, so
// the CLI output and the live view can never disagree.

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    parseDocument,
    folderKindForPath,
    resolveType,
    resolveStatus,
    validateDocument,
    slugify,
    documentNumber,
    isExtensionField,
    parseAnnotations,
    resolveAnnotation,
    DEVBOOK_FOLDER_NAMES,
    NESTED_ROOT,
} from "./metadata.mjs";

/** Every devbook folder this convention recognizes. A repository adopts any subset. */
export const DEVBOOK_FOLDERS = DEVBOOK_FOLDER_NAMES.map((name) => `.${name}`);

/**
 * The same five in the nested layout, under one `.devbook/` parent with the
 * leading dot dropped. Both spellings are just repository paths — every scope,
 * output path, and reference below works off the path it is given, so nothing
 * downstream of discovery knows which layout it is looking at.
 */
export const NESTED_DEVBOOK_FOLDERS = DEVBOOK_FOLDER_NAMES.map(
    (name) => `${NESTED_ROOT}/${name}`
);

export { DEVBOOK_FOLDER_NAMES, NESTED_ROOT };
// The repo-visible contract: one number covering the metadata schema a
// repository authors and the derived artifacts a consumer reads. It moves only
// when something repo-visible changes shape, which is why a plugin release
// usually leaves it alone — and why the migration ledger keys off it.
//
// Version 10 moves the generator from `.github/tools/` to `.devbook/tools/`,
// devbook's own folder, and `generatedBy` with it; the migration folder is
// `10-the-generator-lives-under-devbook`. Version 9 and 8 are recorded in the
// migration ledger's history. Version 7 is additive over 6: the nested `.devbook/` layout is recognized
// alongside the flat dot-folders, and `bounded-context` joins the `.domain`
// chapter types so a context-map section can be addressed. Nothing that
// validated under 6 stops validating, so there is no migration folder.
// Version 6 removes `.backlog` from the recognized folders and with it the
// `implements` reference field, and adds two things on top of 5: the shared
// `approved` rung with its `approved-by`/`approved-at` record, and the opaque
// `ext` namespace an L1 plugin persists its own state in. Only the removal was
// breaking; its migration predates 1.0.0 and no longer ships. Version 5 was
// additive over 4: `status` may now be resolved from the folder's resting value
// rather than read off the block, and both artifacts gained an optional
// `statusDeclared: false` marking the entries where that happened. Version 4
// was additive over 3, adding the `tests` field carrying the
// `<level>:<runner>:<selector>` test identifiers a chapter or file declares.
export const CONTRACT_VERSION = 10;

// What the derived artifacts stamp themselves with. The same number under the
// name a consumer of `graph.json` / `index.json` reads it by: the schema those
// files follow *is* the contract, so keeping two counters would only let them
// drift. A contract bump with no migration folder is normal and harmless —
// presence of a migration decides whether one runs, never the version number.
export const SCHEMA_VERSION = CONTRACT_VERSION;
export const REPO_SCOPE = ".";

// Where a repository that adopts the convention keeps this folder: under
// `.devbook/`, beside the stack config and the stamp, because the generator is
// plain Node and `.github/` is one host's folder. The fallback for
// `generatedBy`, and still the right answer whenever the generator is not
// inside the repository it is indexing — a plugin install, or `--root`.
export const GENERATOR = ".devbook/tools/devbook-meta/build.mjs";

const GENERATOR_FILE = fileURLToPath(new URL("./build.mjs", import.meta.url));

/**
 * What a derived artifact stamps as `generatedBy`: a repo-relative path to the
 * generator, so anyone finding a `_meta/` file knows how to regenerate it.
 *
 * A repository that vendors this folder somewhere other than the conventional
 * location — the one that authors the convention, for instance — gets a path
 * that actually resolves. When the generator sits outside the repository the
 * only honest answer is the conventional location: an absolute path would break
 * determinism, and a `../..` climb out of the repository is not repo-relative.
 */
export function generatorPath(repoRoot) {
    const relative = path.relative(path.resolve(repoRoot), GENERATOR_FILE);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return GENERATOR;
    return relative.split(path.sep).join("/");
}

// Metadata fields that hold `<path>` / `<path>#<slug>` references, and the edge
// type each one produces. Non-reference list fields (`aliases`, `alternatives`,
// `feature-flag`, `roadmap`, `stage`) are deliberately absent — they stay node attributes.
const REFERENCE_FIELDS = {
    "depends-on": "depends-on",
    related: "related",
};

// The authored `type` field is emitted under the node key `kind`, because
// `type` on a node is already the structural discriminator
// (`file`/`chapter`/`heading`/`external`). `.tech` nodes have always carried
// `kind`; the field is simply populated for every folder now.
const ATTRIBUTE_FIELDS = [
    "version",
    "issue",
    "aliases",
    "alternatives",
    "date",
    "approved-by",
    "approved-at",
];

// Non-reference fields whose authored form may be a scalar or a bracket list,
// and which are always emitted as a list so a consumer reading graph.json never
// has to branch on shape. `aliases`/`alternatives` above stay verbatim.
//
// `tests` is here rather than in REFERENCE_FIELDS because a test identifier
// names something in a test project, not a chapter, so it produces no edge — the
// same reason `feature-flag`, `roadmap`, and `.ai`'s `stage` stay attributes.
const LIST_ATTRIBUTE_FIELDS = ["feature-flag", "roadmap", "stage", "tests"];

// Fields authored as an integer scalar. The parser hands back the raw string,
// so they are coerced here and a viewer can sum or threshold them directly.
// A value that is not a non-negative integer is left off the node — the lint in
// metadata.mjs is what reports it, and the graph never carries a bad number.
const NUMERIC_ATTRIBUTE_FIELDS = ["effort"];

/** Recursively collect Markdown files under a folder, as repo-relative posix paths. */
async function collectMarkdown(repoRoot, relFolder) {
    const results = [];
    async function walk(current) {
        let entries;
        try {
            entries = await readdir(path.join(repoRoot, current), { withFileTypes: true });
        } catch {
            return; // folder not present yet
        }
        for (const entry of entries) {
            const child = `${current}/${entry.name}`;
            if (entry.isDirectory()) await walk(child);
            else if (entry.isFile() && entry.name.endsWith(".md")) results.push(child);
        }
    }
    await walk(relFolder);
    return results.sort();
}

function asList(value) {
    if (value === null || value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}

function applyMeta(node, meta, folder) {
    if (!meta) return;
    // An omitted status in an editorial folder means that folder's resting
    // value, so the node carries the resolved word — a viewer that read
    // `meta.status` straight through would badge a few hundred resting
    // chapters as unknown and collapse `nodesByStatus`. `statusDeclared` is
    // written only when it is false, both to keep the distinction between "at
    // rest" and "nobody said" available and to leave every already-declared
    // node byte-identical to what earlier versions emitted.
    const { status, declared } = resolveStatus(folder, meta);
    node.status = status;
    if (!declared && status !== null) node.statusDeclared = false;
    const declaredType = resolveType(folder, meta);
    if (declaredType !== null) node.kind = declaredType;
    for (const field of ATTRIBUTE_FIELDS) {
        if (meta[field] !== undefined && meta[field] !== null) node[field] = meta[field];
    }
    for (const field of LIST_ATTRIBUTE_FIELDS) {
        const values = asList(meta[field]);
        if (values.length) node[field] = values;
    }
    for (const field of NUMERIC_ATTRIBUTE_FIELDS) {
        const raw = meta[field];
        if (typeof raw === "string" && /^\d+$/.test(raw)) node[field] = Number(raw);
    }
    for (const field of Object.keys(REFERENCE_FIELDS)) {
        const refs = asList(meta[field]);
        if (refs.length) node[field] = refs;
    }
    // Everything under `ext` belongs to a plugin layered on top of devbook and
    // is carried through verbatim: same keys, same values, gathered under one
    // node key so a consumer can hand the block to its owner without having to
    // know what is in it. No edge is produced, and no value is inspected.
    const ext = {};
    for (const [key, value] of Object.entries(meta)) {
        if (isExtensionField(key)) ext[key] = value;
    }
    if (Object.keys(ext).length) node.ext = ext;
}

/**
 * Compose a file node's display label.
 *
 * Heading text carries the name only, so every file in a `.domain` bounded
 * context is titled with the bare context name — six nodes sharing one label.
 * The file's `type` disambiguates them, and is left off when the title already
 * says it ("Context Map" + `context-map`).
 */
function composeFileLabel(title, type) {
    if (!type || slugify(title) === type) return title;
    return `${title} (${type})`;
}

/**
 * Build the graph from every devbook document.
 *
 * Nodes: one per file, one per heading that carries a `meta` block, plus any
 * structural heading that something actually references. Edges: `contains`
 * from the structural hierarchy, and one per `depends-on`/`related` entry.
 */
export async function buildGraph(repoRoot, folders = null) {
    const nodes = new Map();
    const edges = [];
    const problems = [];
    // Every heading anchor in the corpus, including structural headings with no
    // `meta` block. Those are still legal reference targets — e.g. a .domain
    // naming term pointing at a Value Object sub-chapter covered by its parent
    // aggregate's block — so they are materialized on demand.
    const headingIndex = new Map();

    const layout = folders ? null : await discoverLayout(repoRoot);
    const scanned = folders ?? layout.folders;
    if (layout?.mixed) {
        problems.push({
            severity: "error",
            message:
                `Both layouts are present: ${layout.flat.join(", ")} beside ` +
                `${layout.nested.join(", ")}. A repository picks one and never mixes them. ` +
                `Both are indexed here so nothing is invisible, but addresses will not agree ` +
                `until one is moved.`,
        });
    }

    const files = (
        await Promise.all(scanned.map((folder) => collectMarkdown(repoRoot, folder)))
    ).flat();

    for (const relPath of files) {
        const folder = folderKindForPath(relPath);
        const raw = await readFile(path.join(repoRoot, relPath), "utf8");
        const { fileTitle, chapters } = parseDocument(raw);

        // Open notes per chapter, counted from the same read. Carrying the
        // count on the node is what lets the canvas badge the chapters nobody
        // has answered — and because the canvas imports this module, the live
        // view and the committed graph.json can never disagree about it.
        const openNotes = new Map();
        for (const note of parseAnnotations(raw)) {
            if (resolveAnnotation(note.fields).status !== "open") continue;
            const key = note.chapter?.slug ?? null;
            openNotes.set(key, (openNotes.get(key) ?? 0) + 1);
        }

        const fileMeta = chapters.find((c) => c.level === 1)?.meta ?? null;
        const fileNode = {
            id: relPath,
            label: composeFileLabel(
                fileTitle ?? path.basename(relPath, ".md"),
                resolveType(folder, fileMeta)
            ),
            type: "file",
            folder,
            path: relPath,
        };

        // An .arc42 file is exactly one top-level chapter, so its level-1 block
        // serves as the file-level block; other folders follow the same shape.
        applyMeta(fileNode, fileMeta, folder);
        // Set outside applyMeta because it also comes from the filename, which
        // no metadata field can supply.
        const number = documentNumber(relPath, fileMeta);
        if (number !== null) fileNode.number = number;
        // Omitted rather than emitted as 0, so adding this did not churn every
        // node of every existing index.
        const fileOpenNotes = [...openNotes.values()].reduce((a, b) => a + b, 0);
        if (fileOpenNotes) fileNode.openNotes = fileOpenNotes;
        nodes.set(fileNode.id, fileNode);

        // The schema lint, over every block in the file at once. It is the only
        // implementation of the per-block rules — the status ladders, the value
        // shapes, the unrecognized-field sweep, a heading carrying no `meta`
        // block at all — so the gate runs it here rather than leaving it to the
        // editor extension, which not every author has open. Each issue keeps
        // its own severity: a warning stays a warning, and only an error fails
        // the run.
        for (const issue of validateDocument(relPath, raw)) {
            problems.push({
                severity: issue.severity,
                path: relPath,
                message: `${relPath} ${issue.message}`,
            });
        }

        // Track the nearest enclosing addressable heading per level so
        // sub-chapters attach to their parent rather than to the file.
        const ancestors = [{ level: 1, id: relPath }];

        for (const chapter of chapters) {
            if (chapter.level === 1) continue;
            while (ancestors.length && ancestors[ancestors.length - 1].level >= chapter.level) {
                ancestors.pop();
            }
            const parentId = ancestors.length ? ancestors[ancestors.length - 1].id : relPath;

            const id = `${relPath}#${chapter.slug}`;

            // An anchor is claimed by any heading, structural ones included, so
            // this runs before the fence guard below. The first heading keeps
            // it — that is the one GitHub leaves unsuffixed — and the later one
            // is dropped rather than overwriting it.
            //
            // Only a collision with a chapter on either side is reported. A
            // chapter that cannot be addressed is the error; two structural
            // headings sharing an anchor is the ordinary shape of a chapter
            // file (`### Invariants` under each aggregate), and those are
            // materialized on demand, never referenced by accident.
            if (headingIndex.has(id)) {
                if (chapter.meta || nodes.has(id)) {
                    problems.push({
                        severity: "error",
                        path: relPath,
                        message: `Duplicate chapter anchor "${id}" — two headings slugify identically, so a reference to it is ambiguous. The first heading keeps the anchor; the one on line ${chapter.line} is dropped from the graph and cannot be addressed.`,
                    });
                }
                continue;
            }

            headingIndex.set(id, {
                id,
                label: chapter.text,
                type: "heading",
                folder,
                path: relPath,
                slug: chapter.slug,
                level: chapter.level,
                line: chapter.line,
                parent: parentId,
            });

            if (!chapter.meta) continue; // structural heading, not an addressable chapter

            const node = {
                id,
                label: chapter.text,
                type: "chapter",
                folder,
                path: relPath,
                slug: chapter.slug,
                level: chapter.level,
                line: chapter.line,
            };
            applyMeta(node, chapter.meta, folder);
            if (openNotes.get(chapter.slug)) node.openNotes = openNotes.get(chapter.slug);
            nodes.set(id, node);
            ancestors.push({ level: chapter.level, id });

            edges.push({
                id: `contains:${parentId}->${id}`,
                source: parentId,
                target: id,
                type: "contains",
            });
        }
    }

    // Reference edges are resolved only after every node exists, so forward
    // references across files are valid.
    for (const node of nodes.values()) {
        for (const [field, edgeType] of Object.entries(REFERENCE_FIELDS)) {
            for (const ref of asList(node[field])) {
                const targetPath = ref.split("#")[0];
                if (!nodes.has(ref)) {
                    // A structural heading is a legal target — materialize it
                    // (with its containment edge) the first time it is cited.
                    const heading = headingIndex.get(ref);
                    if (heading) {
                        const { parent, ...data } = heading;
                        nodes.set(ref, data);
                        edges.push({
                            id: `contains:${parent}->${ref}`,
                            source: parent,
                            target: ref,
                            type: "contains",
                        });
                    } else {
                        const insideDevbook = folderKindForPath(targetPath) !== null;
                        problems.push({
                            severity: insideDevbook ? "error" : "warning",
                            path: node.path,
                            message: insideDevbook
                                ? `${node.id} has \`${field}\` reference "${ref}" that does not resolve to any chapter, heading, or file.`
                                : `${node.id} has \`${field}\` reference "${ref}" pointing outside the devbook folders; recorded as an external node.`,
                        });
                        if (insideDevbook) continue; // don't invent a node for a typo
                        nodes.set(ref, {
                            id: ref,
                            label: ref,
                            type: "external",
                            folder: null,
                            path: targetPath,
                        });
                    }
                }
                edges.push({
                    id: `${edgeType}:${node.id}->${ref}`,
                    source: node.id,
                    target: ref,
                    type: edgeType,
                });
            }
        }
    }

    return { nodes: [...nodes.values()], edges, problems };
}

function summarize(nodes, edges) {
    const count = (items, key) =>
        items.reduce((acc, item) => {
            const value = item[key] ?? "none";
            acc[value] = (acc[value] ?? 0) + 1;
            return acc;
        }, {});
    return {
        nodes: nodes.length,
        edges: edges.length,
        nodesByFolder: count(nodes, "folder"),
        nodesByType: count(nodes, "type"),
        nodesByKind: count(nodes, "kind"),
        nodesByStatus: count(nodes, "status"),
        edgesByType: count(edges, "type"),
    };
}

/**
 * Project the full graph down to one scope.
 *
 * A scoped graph keeps every node inside the scope, plus any node outside it
 * that an in-scope node references — those boundary nodes are flagged
 * `outOfScope: true` so a viewer can render them as stubs rather than pretend
 * they are part of the scope. Edges are kept when both ends survive.
 *
 * `scope` is a devbook folder path (".tech") or "." for the whole repository.
 */
export function projectScope(graph, scope) {
    if (scope === REPO_SCOPE) {
        return { nodes: graph.nodes, edges: graph.edges, problems: graph.problems };
    }

    const prefix = `${scope}/`;
    const inScope = (node) => node.path === scope || node.path?.startsWith(prefix);

    const kept = new Map();
    for (const node of graph.nodes) {
        if (inScope(node)) kept.set(node.id, node);
    }

    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const boundary = new Map();
    for (const edge of graph.edges) {
        const sourceIn = kept.has(edge.source);
        const targetIn = kept.has(edge.target);
        if (!sourceIn && !targetIn) continue;
        // Only outbound references pull a boundary node in; an unrelated
        // document merely pointing *at* this scope must not drag its whole
        // neighbourhood into the scoped graph.
        if (sourceIn && !targetIn) {
            const target = byId.get(edge.target);
            if (target) boundary.set(target.id, { ...target, outOfScope: true });
        }
    }

    const nodes = [...kept.values(), ...boundary.values()];
    const available = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter(
        (edge) => available.has(edge.source) && available.has(edge.target) && kept.has(edge.source)
    );

    return {
        nodes,
        edges,
        problems: graph.problems.filter((problem) => !problem.path || inScope({ path: problem.path })),
    };
}

/**
 * Build the serializable index document for one scope, following the
 * derived-artifacts convention.
 *
 * Pass a pre-built graph to project several scopes without re-reading disk.
 * `folders` is the set of devbook folders this repository actually adopts,
 * so the repo-wide `sources` never claims a folder that is not there.
 */
export async function buildGraphDocument(
    repoRoot,
    scope = REPO_SCOPE,
    prebuilt = null,
    folders = null
) {
    folders ??= (await discoverLayout(repoRoot)).folders;
    const graph = prebuilt ?? (await buildGraph(repoRoot, folders));
    const { nodes, edges, problems } = projectScope(graph, scope);
    return {
        // Bumped whenever the emitted shape changes, so consumers detect drift.
        schemaVersion: SCHEMA_VERSION,
        generatedBy: generatorPath(repoRoot),
        scope,
        sources: scope === REPO_SCOPE ? folders : [scope],
        // Deliberately no timestamp: the index is a deterministic function of
        // the Markdown, so re-running it produces a byte-identical file and CI
        // can diff it to detect a stale commit.
        stats: summarize(nodes, edges),
        problems,
        elements: {
            nodes: nodes.map((data) => ({ data })),
            edges: edges.map((data) => ({ data })),
        },
    };
}

/** Every scope this generator knows about: the repo-wide rollup plus one per folder. */
export const SCOPES = [REPO_SCOPE, ...DEVBOOK_FOLDERS, ...NESTED_DEVBOOK_FOLDERS];

/**
 * The scopes a specific repository actually has, so a repo that adopts only
 * `.domain` and `.arc42` never gets `_meta/` folders for conventions it does
 * not use. Returns an empty array when no devbook folder is present.
 */
export async function discoverScopes(repoRoot) {
    const { folders } = await discoverLayout(repoRoot);
    return folders.length ? [REPO_SCOPE, ...folders] : [];
}

/**
 * Which devbook folders this repository actually has, and in which layout.
 *
 * `folders` holds real repository paths, so a caller never has to know whether
 * it is looking at `.tech` or `.devbook/tech`. Both are probed because a
 * repository picks one layout and never mixes them — and `mixed` is how the
 * caller learns that this one did, rather than the generator quietly indexing
 * half a corpus.
 */
export async function discoverLayout(repoRoot) {
    const flat = [];
    const nested = [];
    for (const name of DEVBOOK_FOLDER_NAMES) {
        if (await isDirectory(path.join(repoRoot, `.${name}`))) flat.push(`.${name}`);
        if (await isDirectory(path.join(repoRoot, NESTED_ROOT, name))) {
            nested.push(`${NESTED_ROOT}/${name}`);
        }
    }
    const mixed = flat.length > 0 && nested.length > 0;
    return {
        flat,
        nested,
        mixed,
        // Both are indexed even when mixed, so nothing becomes invisible while
        // the repository is being straightened out. `mixed` is what makes it an
        // error rather than a silent half-corpus.
        folders: [...flat, ...nested],
        layout: mixed ? "mixed" : nested.length ? "nested" : flat.length ? "flat" : "none",
    };
}

async function isDirectory(absolutePath) {
    try {
        return (await stat(absolutePath)).isDirectory();
    } catch {
        return false; // Folder not adopted by this repository.
    }
}

/** Repo-relative output path for a scope, per the derived-index convention. */
export function outputPathFor(scope) {
    return scope === REPO_SCOPE ? "_meta/graph.json" : `${scope}/_meta/graph.json`;
}
