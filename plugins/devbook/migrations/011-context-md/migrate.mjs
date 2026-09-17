#!/usr/bin/env node
// 011-context-md — see MIGRATION.md.
//
//   node migrate.mjs --check   verify only; exit 1 while work remains
//   node migrate.mjs           apply; a second run changes nothing
//   node migrate.mjs --root ../other-repo
//
// Idempotent by construction: the shapes that must not be present are a
// bounded context without `context.md`, a `domain.md` still declaring
// `index: root`, and a `feature-flag` entry that is a bare key rather than a
// `<path>#<slug>` reference. Once none is left the migration has nothing to
// see, which is what makes re-running it safe.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex !== -1 ? args[rootIndex + 1] : process.cwd());

// The slug an anchor is built from, taken from the generator so the reference
// this script writes is the one the graph resolves.
const { slugify } = await import(new URL("../../tools/devbook-meta/metadata.mjs", import.meta.url));

const DOMAIN = ".devbook/domain";
const FEATURE_FILES = ["features.md", "skills.md"];

async function exists(relPath) {
    try {
        await stat(path.join(ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

/**
 * Visit every line with the fence it sits in — `null` outside one, the fence's
 * info string inside — so a heading inside a code block stays a code line and
 * a field inside a `meta` block is seen as one.
 */
function walk(text, visit) {
    const lines = text.split("\n");
    let fence = null;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("```")) fence = fence === null ? lines[i].slice(3).trim() : null;
        else visit(lines, i, fence);
    }
    return lines;
}

/**
 * Take `domain.md` apart: its title, the lines of its file-level `meta` block,
 * the boundary prose between the block and the first `##`, and the index of
 * that first `##` — enough to write `context.md` and to trim `domain.md`.
 */
function dissect(text) {
    const lines = text.split("\n");
    let title = null;
    let blockStart = -1;
    let blockEnd = -1;
    let firstChapter = lines.length;
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("```")) {
            if (!inFence && title !== null && blockStart === -1 && line.trim() === "```meta") blockStart = i;
            else if (inFence && blockStart !== -1 && blockEnd === -1) blockEnd = i;
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        if (title === null && /^# /.test(line)) title = line.slice(2).trim();
        else if (title !== null && /^## /.test(line)) {
            firstChapter = i;
            break;
        }
    }
    if (title === null || blockStart === -1 || blockEnd === -1) return null;
    const block = lines.slice(blockStart + 1, blockEnd);
    // The prose: everything after the block up to the first chapter, minus a
    // blockquote — that is the file's own description and stays with it.
    const between = lines.slice(blockEnd + 1, firstChapter);
    const prose = [];
    let inQuote = false;
    for (const line of between) {
        if (line.startsWith(">")) {
            inQuote = true;
            continue;
        }
        if (inQuote && line.trim() === "") {
            inQuote = false;
            continue;
        }
        inQuote = false;
        prose.push(line);
    }
    return { lines, title, block, blockStart, blockEnd, firstChapter, prose: prose.join("\n").trim() };
}

const plans = [];
if (await exists(DOMAIN)) {
    for (const entry of await readdir(path.join(ROOT, DOMAIN), { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
        const context = path.posix.join(DOMAIN, entry.name);
        const contextFile = path.posix.join(context, "context.md");
        const domainFile = path.posix.join(context, "domain.md");
        const plan = { context, contextFile, create: null, trimDomain: null, flags: [], rewrites: [] };

        if (await exists(domainFile)) {
            const parts = dissect(await readFile(path.join(ROOT, domainFile), "utf8"));
            if (parts) {
                const rootLine = parts.block.findIndex((line) => /^index:\s*root\s*$/.test(line));
                if (!(await exists(contextFile))) {
                    const status = parts.block.find((line) => /^status:/.test(line));
                    const block = ["index: root", "type: context"];
                    if (status) block.unshift(status.trim());
                    plan.create = `# ${parts.title}\n\n\`\`\`meta\n${block.join("\n")}\n\`\`\`\n${parts.prose ? `\n${parts.prose}\n` : ""}`;
                    plan.proseMoved = parts.prose.length > 0;
                }
                if (rootLine !== -1 || (plan.create && parts.prose)) {
                    const block = parts.block.filter((_, i) => i !== rootLine);
                    const head = parts.lines.slice(0, parts.blockStart + 1);
                    // Keep the blockquote, drop the prose that moved.
                    const between = parts.lines.slice(parts.blockEnd + 1, parts.firstChapter);
                    const kept = plan.create && parts.prose
                        ? between.filter((line) => line.startsWith(">") || line.trim() === "")
                        : between;
                    const middle = kept.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
                    const tail = parts.lines.slice(parts.firstChapter);
                    plan.trimDomain = {
                        file: domainFile,
                        text: `${head.join("\n")}\n${block.join("\n")}\n\`\`\`\n${middle ? `\n${middle}\n` : ""}${tail.length ? `\n${tail.join("\n")}` : ""}`,
                        rootRemoved: rootLine !== -1,
                    };
                }
            }
        }

        for (const name of FEATURE_FILES) {
            const file = path.posix.join(context, name);
            if (!(await exists(file))) continue;
            const text = await readFile(path.join(ROOT, file), "utf8");
            let chapter = null;
            let changed = false;
            const lines = walk(text, (all, i, fence) => {
                const line = all[i];
                if (fence === null && /^#{2,6} /.test(line)) chapter = line.replace(/^#+ /, "").trim();
                if (fence !== "meta") return;
                const m = /^(feature-flag:\s*)(.*)$/.exec(line);
                if (!m) return;
                const raw = m[2].trim();
                const isList = raw.startsWith("[") && raw.endsWith("]");
                const entries = (isList ? raw.slice(1, -1) : raw)
                    .split(",")
                    .map((e) => e.trim().replace(/^["']|["']$/g, ""))
                    .filter(Boolean);
                let touched = false;
                const out = entries.map((entry) => {
                    if (entry.includes("#")) return entry;
                    touched = true;
                    const address = `${contextFile}#${slugify(entry)}`;
                    if (!plan.flags.some((f) => f.key === entry)) {
                        plan.flags.push({ key: entry, feature: `${file}#${slugify(chapter ?? "")}` });
                    }
                    return address;
                });
                if (!touched) return;
                changed = true;
                all[i] = `${m[1]}${out.length === 1 && !isList ? out[0] : `[${out.join(", ")}]`}`;
            });
            if (changed) plan.rewrites.push({ file, text: lines.join("\n") });
        }

        if (plan.create || plan.trimDomain || plan.flags.length || plan.rewrites.length) plans.push(plan);
    }
}

if (plans.length === 0) {
    console.log(`011-context-md: nothing to do under ${ROOT}.`);
    process.exit(0);
}

const verb = checkOnly ? "would" : "will";
let count = 0;
for (const plan of plans) {
    if (plan.create) {
        count++;
        console.log(`  ${verb} write ${plan.contextFile}${plan.proseMoved ? " with the boundary prose from domain.md" : ""}`);
    }
    if (plan.trimDomain?.rootRemoved) {
        count++;
        console.log(`  ${verb} remove \`index: root\` from ${plan.trimDomain.file}`);
    }
    for (const flag of plan.flags) {
        count++;
        console.log(`  ${verb} add feature-flag chapter "${flag.key}" to ${plan.contextFile}`);
    }
    for (const rewrite of plan.rewrites) {
        count++;
        console.log(`  ${verb} rewrite feature-flag entries in ${rewrite.file}`);
    }
}

if (checkOnly) {
    console.error(`\n011-context-md: ${count} item(s) still to migrate.`);
    process.exit(1);
}

for (const plan of plans) {
    if (plan.trimDomain) await writeFile(path.join(ROOT, plan.trimDomain.file), plan.trimDomain.text, "utf8");
    let contextText = plan.create ?? (await exists(plan.contextFile) ? await readFile(path.join(ROOT, plan.contextFile), "utf8") : "");
    for (const flag of plan.flags) {
        contextText = `${contextText.trimEnd()}\n\n## ${flag.key}\n\n\`\`\`meta\nstatus: draft\ntype: feature-flag\nkey: ${flag.key}\nrelated: ["${flag.feature}"]\n\`\`\`\n\nDecided at release, from configuration. Name the switch in business language, and say who owns the rollout, what turning it on changes, and when the flag is retired.\n`;
    }
    if (plan.create || plan.flags.length) await writeFile(path.join(ROOT, plan.contextFile), contextText, "utf8");
    for (const { file, text } of plan.rewrites) await writeFile(path.join(ROOT, file), text, "utf8");
}

console.log(`\n011-context-md: applied ${count} change(s).`);
