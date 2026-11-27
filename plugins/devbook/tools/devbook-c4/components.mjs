#!/usr/bin/env node
// components.mjs — the C4 component level, generated from the .NET project graph.
//
// Reads every `.csproj` with no build, the way devbook-tech's inventory does,
// and every building block under `.devbook/arc42/building-blocks/`, and writes
// `.devbook/arc42/c4/generated/components.dsl`: one component per building
// block whose `code` field names a project's folder, and one relationship per
// `ProjectReference` from a project of one block to a project of another.
//
// A block's component is the element its `c4` field names first,
// `<system>.<container>.<component>`, titled by the block's heading and
// described by the `<Description>` of its first project that has one. A block
// whose component has no description is reported, and so is a project no
// block's `code` holds.
//
// Run: node components.mjs [--root .] [--blocks <folder>] [--output <file>] [--check]
// `--check` writes nothing and exits 1 when the committed file differs from what
// this run generates.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../devbook-meta/metadata.mjs";
import { GENERATED, compare, finish, isHierarchical, option, quote, render, splitIdentifier } from "./common.mjs";

// The folders the inventory skips, plus `.claude`, where a host keeps worktrees of
// this same repository; a `packages/` folder holding no project is a NuGet cache.
const EXCLUDED = new Set([".git", ".vs", ".claude", "bin", "obj", "node_modules", "TestResults", "_meta"]);

// A folder below the root that holds its own `.git` is another checkout — a
// worktree, a submodule — whose projects are not this repository's.
async function isCheckout(directory) {
    try { return (await readdir(directory)).includes(".git"); } catch { return false; }
}

async function holdsProject(directory, depth = 0) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return false; }
    for (const entry of entries) {
        if (entry.isFile() && /\.csproj$/i.test(entry.name)) return true;
        if (entry.isDirectory() && depth < 2 && (await holdsProject(path.join(directory, entry.name), depth + 1))) return true;
    }
    return false;
}

async function walk(directory, found = []) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return found; }
    for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED.has(entry.name)) continue;
            if (entry.name === "packages" && !(await holdsProject(full))) continue;
            if (await isCheckout(full)) continue;
            await walk(full, found);
        } else if (entry.isFile() && /\.csproj$/i.test(entry.name)) found.push(full);
    }
    return found;
}

const decode = (v) => v.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** What a project file says about itself: its `<Description>` and its `ProjectReference` paths. */
export function parseProject(xml) {
    const description = /<Description\b[^>]*>([^<]*)<\/Description>/i.exec(xml);
    const references = [];
    for (const m of xml.matchAll(/<ProjectReference\b([^>]*?)\/?>/gi)) {
        const include = /\bInclude\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]);
        if (include) references.push(decode(include[1] ?? include[2]).replace(/\\/g, "/"));
    }
    const text = description ? decode(description[1]).replace(/\s+/g, " ").trim() : "";
    return { description: text || null, references };
}

const posix = (p) => p.split(path.sep).join("/");
const under = (folder, code) => code === "." || folder === code || folder.startsWith(`${code}/`);
// A `code` entry as a folder: `/`-separated, no `./` prefix, no trailing `/`, the root as `.`.
const folderOf = (entry) => path.posix.normalize(String(entry).replace(/\\/g, "/")).replace(/\/+$/, "") || ".";

/**
 * The generated component file, and what the run reports.
 * `projects` is `[{ path, description, references }]`, `path` repository-relative
 * with `/`; `blocks` is `[{ file, title, c4, code }]`.
 */
export function componentsDsl(projects, blocks) {
    const reports = [];
    const owners = [];
    for (const block of [...blocks].sort((a, b) => compare(a.file, b.file))) {
        const code = (Array.isArray(block.code) ? block.code : []).map(folderOf);
        if (!code.length) continue;
        const element = Array.isArray(block.c4) ? block.c4[0] : null;
        owners.push({ block, code, element });
    }

    // A project belongs to the block whose code folder holds it most closely.
    const ownerOf = new Map(); // project path → owner
    for (const project of projects) {
        const folder = path.posix.dirname(project.path);
        let best = null;
        let depth = -1;
        let tie = null;
        for (const o of owners) for (const c of o.code) {
            if (!under(folder, c) || c.length < depth) continue;
            if (c.length === depth && best !== o) { tie = o; continue; }
            if (c.length > depth) { best = o; depth = c.length; tie = null; }
        }
        if (tie) reports.push(`project \`${project.path}\` sits in the \`code\` of both \`${best.block.file}\` and \`${tie.block.file}\`; the first was kept`);
        if (best) ownerOf.set(project.path, best);
        else reports.push(`project \`${project.path}\` sits in no building block's \`code\` folder`);
    }

    const children = [];
    const placed = new Set();
    for (const o of owners) {
        const mine = projects.filter((p) => ownerOf.get(p.path) === o).sort((a, b) => compare(a.path, b.path));
        if (!mine.length) continue;
        if (!isHierarchical(o.element) || o.element.split(".").length !== 3) {
            reports.push(`\`${o.block.file}\` holds projects, but its \`c4\` names \`${o.element ?? ""}\`, not a component \`<system>.<container>.<component>\`; it was left out`);
            continue;
        }
        if (placed.has(o.element)) { reports.push(`\`${o.block.file}\` names \`${o.element}\`, which another block already names; it was left out`); continue; }
        placed.add(o.element);
        const description = mine.find((p) => p.description)?.description ?? null;
        if (!description) reports.push(`component \`${o.element}\` has no description: give one of its projects a \`<Description>\``);
        const { parent, local } = splitIdentifier(o.element);
        children.push({ parent, local, line: `${local} = component ${quote(o.block.title ?? local)} ${quote(description ?? "")} ".NET"` });
    }

    const byPath = new Map(projects.map((p) => [p.path, p]));
    const seen = new Set();
    const relationships = [];
    for (const project of [...projects].sort((a, b) => compare(a.path, b.path))) {
        const from = ownerOf.get(project.path);
        if (!from || !placed.has(from.element)) continue;
        for (const ref of project.references) {
            const target = path.posix.normalize(path.posix.join(path.posix.dirname(project.path), ref));
            if (!byPath.has(target)) { reports.push(`\`${project.path}\` references \`${ref}\`, which is no project in the repository`); continue; }
            const to = ownerOf.get(target);
            if (!to || to === from || !placed.has(to.element)) continue;
            const key = `${from.element}->${to.element}`;
            if (seen.has(key)) continue;
            seen.add(key);
            relationships.push({ source: from.element, destination: to.element, description: "References" });
        }
    }

    const header = [
        "Generated by devbook-c4/components.mjs from the .csproj files and the building blocks' `code` folders.",
        "Never edit: the next run replaces it. Include it in workspace.dsl after the containers it reopens.",
    ];
    return { text: render(header, children, relationships), reports };
}

/** Every project under `root`, read with no build. */
export async function readProjects(root) {
    const out = [];
    for (const file of await walk(root)) out.push({ path: posix(path.relative(root, file)), ...parseProject(await readFile(file, "utf8")) });
    return out.sort((a, b) => compare(a.path, b.path));
}

/** Every building block chapter under `folder`: its file, heading, `c4`, and `code`. */
export async function readBlocks(root, folder) {
    let entries;
    try { entries = await readdir(folder, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const entry of entries.filter((e) => e.isFile() && /\.md$/i.test(e.name)).sort((a, b) => compare(a.name, b.name))) {
        const full = path.join(folder, entry.name);
        const { fileTitle, fileMeta } = parseDocument(await readFile(full, "utf8"));
        out.push({ file: posix(path.relative(root, full)), title: fileTitle, c4: fileMeta?.c4 ?? null, code: fileMeta?.code ?? null });
    }
    return out;
}

async function main(args) {
    const root = path.resolve(option(args, "--root") ?? process.cwd());
    const blocks = path.resolve(root, option(args, "--blocks") ?? ".devbook/arc42/building-blocks");
    const output = path.resolve(root, option(args, "--output") ?? `${GENERATED}/components.dsl`);
    const { text, reports } = componentsDsl(await readProjects(root), await readBlocks(root, blocks));
    return finish({ file: output, text, check: args.includes("--check"), reports, label: "components" });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
