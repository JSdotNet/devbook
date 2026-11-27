// common.mjs — what both C4 generators share: argument reading, DSL quoting,
// code-point ordering, and the write-or-check step that ends every run.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Code-point order, so a generated file reads the same on every machine:
// localeCompare follows the host's collation and would reorder it between two
// contributors.
export const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const IDENTIFIER = /^[A-Za-z0-9_-]+$/;

export const GENERATED = ".devbook/arc42/c4/generated";

export function option(args, name) {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] ?? null;
}

/** A DSL string: quoted, with `\` and `"` escaped and every run of whitespace one space. */
export function quote(value) {
    const line = String(value ?? "").replace(/\s+/g, " ").trim();
    return `"${line.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** A hierarchical identifier split into its parent and its own last segment. */
export function splitIdentifier(id) {
    const at = id.lastIndexOf(".");
    return at < 0 ? { parent: null, local: id } : { parent: id.slice(0, at), local: id.slice(at + 1) };
}

/** Whether `id` is a dotted run of DSL identifiers. */
export const isHierarchical = (id) => typeof id === "string" && id.split(".").every((s) => IDENTIFIER.test(s));

/**
 * The generated file: `!element <parent> { … }` per parent, its children in
 * identifier order, then the relationships at the top of the model.
 * `children` is `[{ parent, local, line }]`, `relationships` `[{ source, destination, description }]`.
 */
export function render(header, children, relationships) {
    const lines = header.map((h) => `// ${h}`);
    const parents = [...new Set(children.map((c) => c.parent))].sort(compare);
    for (const parent of parents) {
        lines.push("", `!element ${parent} {`);
        for (const c of children.filter((x) => x.parent === parent).sort((a, b) => compare(a.local, b.local))) lines.push(`    ${c.line}`);
        lines.push("}");
    }
    const edges = [...relationships].sort((a, b) => compare(a.source, b.source) || compare(a.destination, b.destination));
    if (edges.length) lines.push("");
    for (const r of edges) lines.push(`${r.source} -> ${r.destination} ${quote(r.description)}`);
    return `${lines.join("\n")}\n`;
}

const lf = (text) => text.replace(/\r\n?/g, "\n");

/**
 * Writes `text` to `file`, or with `check` compares it and writes nothing.
 * Prints each report to stderr and returns the exit code: 1 when the check
 * finds the committed file differs, else 0.
 */
export async function finish({ file, text, check, reports, label }) {
    for (const r of reports) process.stderr.write(`${label}: ${r}\n`);
    const shown = path.relative(process.cwd(), file).split(path.sep).join("/") || file;
    if (check) {
        let committed = null;
        try { committed = await readFile(file, "utf8"); } catch { /* absent reads as different */ }
        if (committed !== null && lf(committed) === text) {
            process.stdout.write(`${label}: ${shown} is current\n`);
            return 0;
        }
        process.stderr.write(`${label}: ${shown} ${committed === null ? "does not exist" : "differs from what the code generates"}; run without --check to rewrite it\n`);
        return 1;
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text, "utf8");
    process.stdout.write(`${label}: wrote ${shown}\n`);
    return 0;
}
