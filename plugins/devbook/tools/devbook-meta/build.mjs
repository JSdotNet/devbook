#!/usr/bin/env node
// build.mjs — CLI wrapper over the devbook metadata modules. It writes no file.
//
//   node .devbook/_tools/devbook-meta/build.mjs                  # check every adopted scope
//   node .devbook/_tools/devbook-meta/build.mjs --check          # the same; kept so every documented command still runs
//   node .devbook/_tools/devbook-meta/build.mjs --print          # the documents as JSON on stdout, diagnostics on stderr
//   node .devbook/_tools/devbook-meta/build.mjs --scope .tech
//   node .devbook/_tools/devbook-meta/build.mjs --root ../other-repo
//
// Three documents per scope, built in memory from the Markdown:
//
//   graph          the reference graph (nodes, edges, problems)
//   outline        the ordered reading outline
//   annotations    the open-note index, from the annotation fences
//
// A scope is the repository rollup `.` or one adopted folder. `--check` exits 1
// on any problem at error severity and prints nothing else; `--print` emits
// `{ layout, scopes: { "<scope>": { graph, outline, annotations } } }` for a
// viewer that cannot import graph.mjs, outline.mjs, and annotations-index.mjs
// in-process. Nothing is committed: a derived document is a function of the
// chapters and is computed where it is read (record 76).

import path from "node:path";
import { buildGraph, buildGraphDocument, discoverLayout, DEVBOOK_FOLDERS, NESTED_DEVBOOK_FOLDERS, REPO_SCOPE } from "./graph.mjs";
import { buildOutlineDocument } from "./outline.mjs";
import { buildAnnotationsDocument, collectAnnotations } from "./annotations-index.mjs";

const args = process.argv.slice(2);
const printMode = args.includes("--print");
// Diagnostics go to stderr in print mode so stdout stays one parseable document.
const log = printMode ? console.error : console.log;

function optionValue(name) {
    const index = args.indexOf(name);
    return index !== -1 ? args[index + 1] : null;
}

// Defaults to the working directory, which is the repository root in CI and in
// the documented usage above. `--root` keeps the generator usable from anywhere.
const REPO_ROOT = path.resolve(optionValue("--root") ?? process.cwd());
const requestedScope = optionValue("--scope");

const layout = await discoverLayout(REPO_ROOT);
const availableScopes = layout.folders.length ? [REPO_SCOPE, ...layout.folders] : [];

if (!availableScopes.length) {
    console.error(
        `No devbook folders found under ${REPO_ROOT}. ` +
            `Expected at least one of: ${DEVBOOK_FOLDERS.join(", ")} ` +
            `(flat layout), or ${NESTED_DEVBOOK_FOLDERS.join(", ")} (nested).`
    );
    process.exit(2);
}

if (requestedScope && !availableScopes.includes(requestedScope)) {
    console.error(
        `Unknown or unadopted scope "${requestedScope}". ` +
            `Available scopes: ${availableScopes.join(", ")}.`
    );
    process.exit(2);
}

const scopes = requestedScope ? [requestedScope] : availableScopes;
const folders = availableScopes.filter((scope) => scope !== REPO_SCOPE);

log(`layout ${layout.layout}: ${folders.join(", ")}`);

// Parse the corpus once and project it per scope.
const graph = await buildGraph(REPO_ROOT, folders);
const annotations = await collectAnnotations(REPO_ROOT, folders);
let errorCount = 0;
const output = { layout: layout.layout, scopes: {} };

function report(scope, name, document, summary) {
    log(`checked ${`${scope} ${name}`.padEnd(22)} ${summary}`);
    for (const problem of document.problems) {
        log(`  [${problem.severity}] ${problem.message}`);
        if (problem.severity === "error") errorCount++;
    }
}

function countFiles(entries) {
    return entries.reduce(
        (acc, entry) => acc + (entry.type === "file" ? 1 : countFiles(entry.children ?? [])),
        0
    );
}

for (const scope of scopes) {
    const graphDocument = await buildGraphDocument(REPO_ROOT, scope, graph, folders);
    const { stats } = graphDocument;
    report(
        scope,
        "graph",
        graphDocument,
        `${String(stats.nodes).padStart(4)} nodes, ${String(stats.edges).padStart(4)} edges`
    );

    const outlineDocument = await buildOutlineDocument(REPO_ROOT, scope, folders);
    report(
        scope,
        "outline",
        outlineDocument,
        `${String(countFiles(outlineDocument.entries)).padStart(4)} files ordered`
    );

    const annotationsDocument = await buildAnnotationsDocument(REPO_ROOT, scope, annotations, folders);
    report(
        scope,
        "annotations",
        annotationsDocument,
        `${String(annotationsDocument.stats.threads).padStart(4)} threads, ` +
            `${String(annotationsDocument.stats.open).padStart(4)} open`
    );

    output.scopes[scope] = { graph: graphDocument, outline: outlineDocument, annotations: annotationsDocument };
}

if (printMode) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

if (errorCount) {
    console.error(`\n${errorCount} problem(s) at error severity.`);
    process.exit(1);
}
