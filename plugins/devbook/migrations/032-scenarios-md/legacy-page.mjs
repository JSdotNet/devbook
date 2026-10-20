// legacy-page.mjs — the journey page of contracts 30 and 31, frozen.
//
// Before contract 32 a journey was a whole `domain/` file typed `scenario` on
// its `#` block, its `##` headings the parts. The plugin's tools read only
// scenarios files now, so the two migrations that meet the old shape read it
// through this copy: `032-scenarios-md`, which folds each page into its
// context's `scenarios.md`, and `030-linked-walkthroughs`, which links free
// walkthroughs to page parts in a repository that has not reached 32 yet.
// Nothing here changes: it is the shape a repository below 32 holds.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseDemo, DEMO_MODEL_ID, LINKED_PART, stepTextMatches } from "../../tools/devbook-meta/demo.mjs";
import { DEVBOOK_PREFIX, changePathParts } from "../../tools/devbook-meta/metadata.mjs";
import { parseWithSpans } from "../../tools/scenarios/demo-sync.mjs";
import { collapse, DOMAIN_FOLDER, LABEL, normalizePath, parseMeta, resolveInside, SCENARIO_FOLDER, slugify, STEP_KEYWORDS } from "../../tools/scenarios/parse.mjs";
import { journeySignature } from "../../tools/scenarios/signature.mjs";

const SHOT_IMAGE = /!\[([^\]]*)\]\(\s*<?shot:([^)\s>]*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const LIST_ITEM = /^( {0,3})(?:[-*+]|\d+[.)])\s+(.*)$/;

/** A scenario page's stem: its file name without `.md`. */
export function stemOf(relPath) {
    return (String(relPath).replace(/\\/g, "/").split("/").pop() ?? "").replace(/\.md$/i, "");
}

function asList(value) {
    if (value === null || value === undefined || value === "") return [];
    return (Array.isArray(value) ? value : [value]).map(String);
}

/** Replace code spans with spaces, so a quoted `![](shot:x)` is not read as an image. */
function maskCodeSpans(line) {
    return line.replace(/(`+)[^`]*?\1/g, (span) => " ".repeat(span.length));
}

/**
 * Read one scenario page.
 *
 * Returns `{ path, stem, title, isScenario, meta, setup, parts, shots, issues }`:
 * `setup` holds the six setup fields (lists as lists, `profile` a string or
 * null); each part is `{ title, anchor, line, steps, shots }`, a step being
 * `{ keyword, text, line }` with its continuation lines folded in; `shots` is
 * every `shot:` image in document order as `{ label, caption, line, part,
 * inStepList }`, `part` the anchor of the part it sits in or null above the
 * first; `issues` are the label and placement problems the page carries on its
 * own, each `{ kind, line, label, message }`.
 */
export function parseScenarioPage(markdown, relPath = "") {
    const lines = String(markdown).split(/\r?\n/);
    const page = {
        path: String(relPath).replace(/\\/g, "/"),
        stem: stemOf(relPath),
        title: null,
        isScenario: false,
        meta: {},
        setup: {},
        parts: [],
        shots: [],
        issues: [],
    };

    let fence = null;
    let part = null;
    let inList = false;
    let blankSince = false;
    let lastStep = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const marker = /^\s*(`{3,}|~{3,})/.exec(line);
        if (fence) {
            if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
            continue;
        }
        if (marker) {
            fence = marker[1];
            continue;
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading && heading[1].length === 1 && page.title === null) {
            page.title = heading[2].trim();
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === "") j++;
            if (j < lines.length && /^```meta\s*$/.test(lines[j].trim())) {
                const body = [];
                let k = j + 1;
                while (k < lines.length && lines[k].trim() !== "```") body.push(lines[k++]);
                page.meta = parseMeta(body.join("\n"));
                i = k;
            }
            continue;
        }
        if (heading && heading[1].length === 2) {
            part = { title: heading[2].trim(), anchor: slugify(heading[2]), line: i + 1, steps: [], shots: [] };
            page.parts.push(part);
            inList = false;
            blankSince = false;
            lastStep = null;
            continue;
        }
        if (heading) {
            inList = false;
            lastStep = null;
            continue;
        }

        if (line.trim() === "") {
            blankSince = true;
            continue;
        }

        const indented = /^\s{2,}\S/.test(line) || /^\t/.test(line);
        const item = LIST_ITEM.exec(line);
        const topItem = item && item[1].length <= 1;
        let inStepList = false;

        if (part && topItem) {
            const bold = /^\*\*([^*]+)\*\*\s*(.*)$/.exec(item[2]);
            const keyword = bold && STEP_KEYWORDS.includes(bold[1].trim()) ? bold[1].trim() : null;
            lastStep = { keyword, text: collapse(keyword ? bold[2] : item[2]), line: i + 1 };
            part.steps.push(lastStep);
            inList = true;
            inStepList = true;
        } else if (part && inList && (indented || item || !blankSince)) {
            // A nested item, an indented line, or a lazy continuation belongs to the step above.
            if (lastStep) lastStep.text = collapse(`${lastStep.text} ${line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")}`);
            inStepList = true;
        } else {
            inList = false;
            lastStep = null;
        }
        blankSince = false;

        for (const match of maskCodeSpans(line).matchAll(SHOT_IMAGE)) {
            const shot = { label: match[2], caption: match[1], line: i + 1, part: part?.anchor ?? null, inStepList };
            page.shots.push(shot);
            part?.shots.push(shot);
            // A label inside a step would be text of the step it sits in; take it back out.
            if (inStepList && lastStep) lastStep.text = collapse(lastStep.text.replace(collapse(match[0]), ""));
        }
    }

    page.isScenario = page.meta?.type === "scenario";
    page.setup = {
        start: page.meta.start == null ? null : String(page.meta.start),
        actor: asList(page.meta.actor),
        data: asList(page.meta.data),
        profile: page.meta.profile == null || page.meta.profile === "" ? null : String(page.meta.profile),
        flags: asList(page.meta.flags),
        settings: asList(page.meta.settings),
    };

    const seen = new Map();
    for (const shot of page.shots) {
        const at = `line ${shot.line}`;
        if (!LABEL.test(shot.label)) {
            page.issues.push({ kind: "bad-label", line: shot.line, label: shot.label, message: `${at}: label "${shot.label}" is not [a-z0-9-]+.` });
        } else if (seen.has(shot.label)) {
            page.issues.push({ kind: "bad-label", line: shot.line, label: shot.label, message: `${at}: label "${shot.label}" is already used on line ${seen.get(shot.label)}; a label is unique in its page.` });
        } else {
            seen.set(shot.label, shot.line);
        }
        if (shot.inStepList) {
            page.issues.push({
                kind: "image-in-steps",
                line: shot.line,
                label: shot.label,
                message: `${at}: screenshot "${shot.label}" sits inside a step list; put it between step lists, after a blank line.`,
            });
        }
    }
    return page;
}

/** The labels of a page, in document order, each once. */
export function labelsOf(page) {
    return [...new Set(page.shots.map((shot) => shot.label))];
}

/** Every Markdown file under `domain/`, as sorted POSIX paths; `_meta` and dot-folders are skipped. */
async function markdownUnder(repoRoot, folder) {
    const found = [];
    async function walk(rel) {
        let entries;
        try {
            entries = await readdir(resolveInside(repoRoot, rel), { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const child = `${rel}/${entry.name}`;
            if (entry.isDirectory()) {
                if (entry.name === "_meta" || entry.name === "_tools" || entry.name.startsWith(".")) continue;
                await walk(child);
            } else if (entry.isFile() && entry.name.endsWith(".md")) {
                found.push(child);
            }
        }
    }
    await walk(folder);
    return found.sort();
}

/** Every page of the old shape in the repository, parsed, sorted by path. */
export async function listScenarioPages(repoRoot) {
    const pages = [];
    for (const relPath of await markdownUnder(repoRoot, DOMAIN_FOLDER)) {
        const page = parseScenarioPage(await readFile(resolveInside(repoRoot, relPath), "utf8"), relPath);
        if (page.isScenario) pages.push(page);
    }
    return pages;
}

/** Every page of the old shape, keyed by path, with its signature — the canonical text is unchanged at 32. */
export async function scenarioPages(repoRoot, scenarioFolder = SCENARIO_FOLDER) {
    const pages = new Map();
    for (const page of await listScenarioPages(repoRoot)) {
        pages.set(page.path, { path: page.path, stem: page.stem, page, signature: await journeySignature(page, repoRoot, scenarioFolder) });
    }
    return pages;
}

/**
 * The scenario page a linked walkthrough's `part` names, as a path in
 * `pages`: a repository path, a path from the demo's folder — its landing
 * place when the demo sits in a change — or a bare `<stem>.md`.
 */
export function resolveLinkedPage(demoPath, pagePart, pages) {
    if (pagePart.startsWith(DEVBOOK_PREFIX)) return pages.has(pagePart) ? { path: pagePart } : { error: `${pagePart} is not a scenario page` };
    if (pagePart.includes("/")) {
        const from = changePathParts(demoPath)?.target ?? demoPath;
        const target = path.posix.join(path.posix.dirname(from), pagePart);
        return pages.has(target) ? { path: target } : { error: `${target} is not a scenario page` };
    }
    const stem = pagePart.replace(/\.md$/, "");
    const found = [...pages.values()].filter((page) => page.stem === stem);
    if (found.length > 1) return { error: `the stem "${stem}" is ambiguous — ${found.map((page) => page.path).join(", ")}` };
    return found.length ? { path: found[0].path } : { error: `no scenario page has the stem "${stem}"` };
}

/** A string as JSON that is safe inside `<script>`: `</` cannot close the element. */
const scriptString = (text) => JSON.stringify(text).replace(/<\//g, "<\\/");

/**
 * The text a linked step takes from `target`, the part step it names. A copy
 * that opened with its keyword keeps opening with one; otherwise the step's
 * text alone.
 */
function copiedText(current, target) {
    const shown = collapse(current ?? "").replace(/^\*\*(Given|When|Then|And)\*\*/, "$1");
    const withKeyword = STEP_KEYWORDS.some((keyword) => shown === keyword || shown.startsWith(`${keyword} `));
    return withKeyword && target.keyword ? `${target.keyword} ${target.text}` : target.text;
}

// ── One demo ────────────────────────────────────────────────────────────────

/**
 * Sync one demo's linked walkthroughs. `pages` maps a scenario page's path to
 * `{ path, stem, page, signature }`. Returns `{ html, changes, problems }`:
 * `html` the file with every stale `signature` and drifted `text` replaced and
 * nothing else; `changes` one `{ id, kind, step?, from, to }` per replaced
 * value, `kind` `signature` or `text`; `problems` the walkthroughs it could not
 * resolve, as messages. `only`, a set of walkthrough ids, limits the sync to those.
 */
export function syncDemo(html, relPath, pages, { only = null } = {}) {
    const changes = [];
    const problems = [];
    const demo = parseDemo(html);
    if (demo.modelError) return { html, changes, problems: [`${relPath} ${demo.modelError}`] };
    if (!demo.model.linked.size) return { html, changes, problems };

    const script = demo.scripts.find((s) => s.id === DEMO_MODEL_ID);
    const bodyAt = html.indexOf(">", script.offset) + 1;
    const root = parseWithSpans(script.body);
    const walkthroughs = root.members?.get("walkthroughs")?.items ?? [];

    const edits = [];
    for (const node of walkthroughs) {
        const id = node.members?.get("id")?.value;
        const partNode = node.members?.get("part");
        if (partNode?.kind !== "string" || !LINKED_PART.test(partNode.value)) continue;
        if (only && !only.has(id)) continue;
        const part = partNode.value;
        const at = `${relPath} walkthrough "${id}" (\`part\` "${part}")`;
        const hash = part.indexOf("#");
        const anchor = part.slice(hash + 1);
        const resolved = resolveLinkedPage(relPath, part.slice(0, hash), pages);
        if (resolved.error) {
            problems.push(`${at}: names no scenario page part — ${resolved.error}.`);
            continue;
        }
        const entry = pages.get(resolved.path);
        const partSteps = entry.page.parts.find((p) => p.anchor === anchor)?.steps;
        if (!partSteps) {
            problems.push(`${at}: ${resolved.path} has no part "#${anchor}".`);
            continue;
        }

        const signatureNode = node.members.get("signature");
        if (signatureNode?.kind === "string" && signatureNode.value !== entry.signature) {
            edits.push({ node: signatureNode, to: scriptString(entry.signature) });
            changes.push({ id, kind: "signature", from: signatureNode.value, to: entry.signature });
        } else if (signatureNode === undefined) {
            problems.push(`${at}: has no \`signature\` to refresh — add \`"signature": "${entry.signature}"\` by hand.`);
        }

        for (const stepNode of node.members.get("steps")?.items ?? []) {
            const index = stepNode.members?.get("step")?.value;
            const textNode = stepNode.members?.get("text");
            if (!Number.isInteger(index) || textNode?.kind !== "string") continue; // the checker reports the shape
            const target = partSteps[index - 1];
            if (!target) {
                problems.push(`${at}: a step names part step ${index}, but the part has ${partSteps.length} step(s).`);
                continue;
            }
            if (stepTextMatches(textNode.value, target, collapse)) continue;
            const to = copiedText(textNode.value, target);
            edits.push({ node: textNode, to: scriptString(to) });
            changes.push({ id, kind: "text", step: index, from: textNode.value, to });
        }
    }

    let out = html;
    for (const { node, to } of edits.sort((a, b) => b.node.start - a.node.start)) {
        out = out.slice(0, bodyAt + node.start) + to + out.slice(bodyAt + node.end);
    }
    return { html: out, changes, problems };
}
