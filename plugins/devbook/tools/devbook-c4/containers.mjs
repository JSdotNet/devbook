#!/usr/bin/env node
// containers.mjs — the C4 container level, generated from an Aspire AppHost.
//
// Reads the Mermaid flowchart `aspire describe --format mermaid` prints (Aspire
// 17) and writes `.devbook/arc42/c4/generated/containers.dsl`: one container per
// resource the mapping keeps, one relationship per reference between two of
// them. It never starts the app: the caller passes the describe output, so a
// run is a pure function of that text and the mapping file.
//
// The mapping file, `.devbook/arc42/c4/aspire-map.json`, is a person's: it sits
// beside `generated/`, never in it, because no person edits a file there.
//
//   {
//     "drop": ["ui-storybook", "*-browser-logs"],
//     "resources": {
//       "api":   { "element": "shop.api", "name": "API", "description": "Takes orders", "technology": ".NET" },
//       "db":    { "element": "shop.db",  "description": "Holds orders" },
//       "db-orders": { "element": "shop.db" }
//     }
//   }
//
// `drop` names resources a container view leaves out, `*` matching any run of
// characters. `element` is the identifier the rest of the workspace knows the
// resource's container by, `<system>.<container>`, declared here under
// `!element <system>`; resources sharing one fold into one container, the way a
// database's own containers fold into the database, and a folded resource whose
// name, description, or technology contradicts the first one's is reported.
// A resource neither dropped nor mapped is reported and left out; a container
// with no description is reported and written with an empty one.
//
// Run:
//   aspire describe --format mermaid > describe.mmd
//   node containers.mjs --describe describe.mmd [--root .] [--map <file>] [--output <file>] [--check]
// `--describe -` reads stdin. `--check` writes nothing and exits 1 when the
// committed file differs from what this run generates.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED, compare, finish, isHierarchical, option, quote, render, splitIdentifier } from "./common.mjs";

const MAP = ".devbook/arc42/c4/aspire-map.json";

const ARROW = /\s*(?:<?-{2,}>|<?-\.+->|<?={2,}>|-{3,}|-\.+-|={3,})(?:\|[^|]*\|)?\s*/;
const NODE = /^([A-Za-z0-9_][\w-]*)\s*(?:(?:\[\[|\[\(|\(\(|\(\[|\[\/|\[\\|\{\{|\[|\(|\{|>)\s*(?:"([^"]*)"|([^\]\)\}"]*?))\s*(?:\]\]|\)\]|\)\)|\]\)|\/\]|\\\]|\}\}|\]|\)|\}))?$/;
const IGNORED = /^(?:classDef|class|style|linkStyle|click|direction|subgraph|end|accTitle|accDescr)\b/;

/**
 * The resources and references of a Mermaid flowchart.
 * Returns `{ resources: Map<id, name>, edges: [{ from, to }], problems }`, a
 * resource's name being its label, or its id when it has none.
 */
export function parseDescribe(text) {
    const resources = new Map();
    const edges = [];
    const problems = [];
    const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    let header = false;
    const node = (raw, lineNo) => {
        const m = NODE.exec(raw.trim());
        if (!m) { problems.push(`line ${lineNo}: \`${raw.trim()}\` is not a node this reader understands; it was skipped`); return null; }
        const label = m[2] ?? (m[3] != null && m[3] !== "" ? m[3].trim() : null);
        if (label != null || !resources.has(m[1])) resources.set(m[1], label ?? resources.get(m[1]) ?? m[1]);
        return m[1];
    };
    lines.forEach((raw, k) => {
        const line = raw.replace(/;\s*$/, "").trim();
        const lineNo = k + 1;
        if (!line || line.startsWith("%%")) return;
        if (!header) {
            if (/^(?:flowchart|graph)\b/i.test(line)) { header = true; return; }
            problems.push(`line ${lineNo}: the describe output opens with \`flowchart\` or \`graph\`; \`${line}\` was skipped`);
            return;
        }
        if (IGNORED.test(line)) return;
        const parts = line.split(ARROW);
        if (parts.length === 1) { node(line, lineNo); return; }
        const ids = parts.map((p) => p.split(/\s*&\s*/).map((q) => node(q, lineNo)));
        for (let i = 0; i + 1 < ids.length; i++) {
            for (const from of ids[i]) for (const to of ids[i + 1]) if (from && to) edges.push({ from, to });
        }
    });
    if (!header) problems.push("the describe output holds no `flowchart`; nothing was read");
    return { resources, edges, problems };
}

const pattern = (glob) => new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);

/**
 * The generated container file, and what the run reports.
 * `map` is the parsed mapping file.
 */
export function containersDsl(describe, map) {
    const { resources, edges, problems } = parseDescribe(describe);
    const reports = [...problems];
    const drops = (Array.isArray(map?.drop) ? map.drop : []).map(pattern);
    const mapping = map?.resources && typeof map.resources === "object" ? map.resources : {};
    const elementOf = new Map(); // resource id → element id
    const containers = new Map(); // element id → { name, description, technology }

    const names = [...resources].sort((a, b) => compare(a[1], b[1]));
    for (const [id, name] of names) {
        if (drops.some((d) => d.test(name))) continue;
        const entry = mapping[name];
        if (!entry || typeof entry !== "object") { reports.push(`resource \`${name}\` has no mapping: add it to \`resources\` or \`drop\``); continue; }
        const element = entry.element;
        if (!isHierarchical(element) || element.split(".").length !== 2) {
            reports.push(`resource \`${name}\` maps to \`${element ?? ""}\`, not a container identifier \`<system>.<container>\`; it was left out`);
            continue;
        }
        elementOf.set(id, element);
        const c = containers.get(element) ?? { name: null, description: null, technology: null };
        for (const field of ["name", "description", "technology"]) {
            const value = entry[field] ?? null;
            if (value == null) continue;
            if (c[field] == null) c[field] = value;
            else if (c[field] !== value) reports.push(`resource \`${name}\` gives \`${element}\` the ${field} \`${value}\`, but an earlier resource gave \`${c[field]}\`; the earlier one was kept`);
        }
        containers.set(element, c);
    }
    for (const unused of Object.keys(mapping).filter((n) => ![...resources.values()].includes(n)).sort(compare)) {
        reports.push(`mapping names \`${unused}\`, which the describe output does not hold`);
    }

    const children = [];
    for (const [element, c] of containers) {
        const { parent, local } = splitIdentifier(element);
        if (!c.description) reports.push(`container \`${element}\` has no description: give one of its resources a \`description\``);
        const args = [quote(c.name ?? local), quote(c.description ?? "")];
        if (c.technology) args.push(quote(c.technology));
        children.push({ parent, local, line: `${local} = container ${args.join(" ")}` });
    }

    const seen = new Set();
    const relationships = [];
    for (const { from, to } of edges) {
        const source = elementOf.get(from);
        const destination = elementOf.get(to);
        if (!source || !destination || source === destination) continue;
        const key = `${source}->${destination}`;
        if (seen.has(key)) continue;
        seen.add(key);
        relationships.push({ source, destination, description: "References" });
    }

    const header = [
        "Generated by devbook-c4/containers.mjs from `aspire describe --format mermaid` and aspire-map.json.",
        "Never edit: the next run replaces it. Include it in workspace.dsl after the systems it reopens.",
    ];
    return { text: render(header, children, relationships), reports };
}

async function main(args) {
    const root = path.resolve(option(args, "--root") ?? process.cwd());
    const describePath = option(args, "--describe");
    if (!describePath) {
        process.stderr.write("containers: --describe <file> is required, the output of `aspire describe --format mermaid` (`-` reads stdin)\n");
        return 2;
    }
    const mapPath = path.resolve(root, option(args, "--map") ?? MAP);
    const output = path.resolve(root, option(args, "--output") ?? `${GENERATED}/containers.dsl`);
    const describe = describePath === "-" ? await readStdin() : await readFile(path.resolve(describePath), "utf8");
    let map;
    try {
        map = JSON.parse(await readFile(mapPath, "utf8"));
    } catch (error) {
        process.stderr.write(`containers: cannot read the mapping file ${mapPath}: ${error.message}\n`);
        return 2;
    }
    const { text, reports } = containersDsl(describe, map);
    return finish({ file: output, text, check: args.includes("--check"), reports, label: "containers" });
}

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
