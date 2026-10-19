// workspace.mjs — 032-c4-workspace's model of the workspace it writes into.
//
// The workspace is read with the plugin's own reader, `tools/devbook-meta/c4.mjs`, and
// never rewritten whole: a person's file keeps every byte this migration does not add.
// New elements go into the block of the element they sit in, or the `model` block's end;
// new relationships after them; new views at the end of `views`. Everything added is
// held in memory until `render`, and `mark` / `rollback` drop what one diagram added when
// that diagram turns out not to convert.

import path from "node:path";
import { parseWorkspace, tokenize } from "../../tools/devbook-meta/c4.mjs";

export const WORKSPACE = ".devbook/arc42/workspace.dsl";
export const INCLUDE_FOLDER = ".devbook/arc42/c4/";

const posix = path.posix;
const lower = (v) => String(v ?? "").toLowerCase();

/** A DSL string literal. */
export const q = (text) => `"${String(text ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s*\r?\n\s*/g, " ")}"`;

/** An identifier from an alias or a name: letters, digits, `_`, `-`; never empty. */
export function identifier(text, fallback = "element") {
    const id = String(text ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
    return id || fallback;
}

/** Reads the workspace from an in-memory file map, `!include` resolved under `c4/` only. */
export function readFromFiles(files) {
    const include = (target, fromFile) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/") || target.startsWith("\\")) return { problem: `\`!include ${target}\`: only a relative path is supported.` };
        const resolved = posix.normalize(posix.join(posix.dirname(fromFile), target.replace(/\\/g, "/")));
        if (!resolved.startsWith(INCLUDE_FOLDER)) return { problem: `\`!include ${target}\` lands outside \`${INCLUDE_FOLDER.slice(0, -1)}\`, the only folder a workspace includes from.` };
        if (!files.has(resolved)) return { problem: `\`!include ${target}\`: no such file.` };
        return { file: resolved, text: files.get(resolved) };
    };
    return parseWorkspace(files.get(WORKSPACE), { file: WORKSPACE, include });
}

/** The skeleton a repository without a workspace gets. */
export function skeleton(name) {
    return `workspace ${q(name)} {\n\n    !identifiers hierarchical\n\n    model {\n    }\n\n    views {\n    }\n}\n`;
}

// ── block finding ───────────────────────────────────────────────────────────

/** The statement starting on `line` of `text`: where its block closes, or where it ends. */
function statementAt(text, line) {
    const tokens = tokenize(text);
    const start = tokens.findIndex((t) => t.line === line && t.kind !== "end");
    if (start < 0) return null;
    return closeOf(tokens, start);
}

function closeOf(tokens, start) {
    let i = start;
    while (i < tokens.length && tokens[i].kind !== "open" && tokens[i].kind !== "end") i++;
    if (i >= tokens.length) return null;
    if (tokens[i].kind === "end") return { block: false, lastLine: tokens[i - 1].line };
    let depth = 0;
    for (let k = i; k < tokens.length; k++) {
        if (tokens[k].kind === "open") depth++;
        else if (tokens[k].kind === "close" && --depth === 0) {
            let p = k - 1;
            while (p > i && tokens[p].kind === "end") p--;
            // Shared: the `}` stands on a line with another statement, or with its own `{`.
            return { block: true, closeLine: tokens[k].line, shared: (p > i && tokens[p].line === tokens[k].line) || tokens[i].line === tokens[k].line };
        }
    }
    return null;
}

/** The `model` or `views` block directly inside `workspace`, in the main file. */
function topBlock(text, word) {
    const tokens = tokenize(text);
    let depth = 0;
    for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        if (t.kind === "open") depth++;
        else if (t.kind === "close") depth--;
        else if (depth === 1 && t.kind === "word" && lower(t.text) === word && tokens[k + 1]?.kind === "open") return closeOf(tokens, k);
    }
    return null;
}

function workspaceClose(text) {
    const tokens = tokenize(text);
    const start = tokens.findIndex((t) => t.kind === "word" && lower(t.text) === "workspace");
    return start < 0 ? null : closeOf(tokens, start);
}

// ── the model ───────────────────────────────────────────────────────────────

export class Model {
    constructor(files) {
        this.files = files;
        this.reading = readFromFiles(files);
        this.hierarchical = this.reading.hierarchical;
        this.elements = this.reading.elements.map((e) => ({ ...e, isNew: false }));
        this.envs = this.reading.environments.map((e) => ({ ...e, isNew: false }));
        this.rels = this.reading.relationships.map((r) => ({ source: r.source, destination: r.destination, description: r.description ?? null, isNew: false }));
        this.views = [];
        this.viewKeys = new Set(this.reading.views.map((v) => lower(v.key)));
        this.notes = [];
        this.aliases = new Map(); // a boundary's name in one diagram → the element it was inferred to be
    }

    get byId() { return new Map(this.elements.map((e) => [lower(e.id), e])); }
    element(id) { return this.byId.get(lower(id)) ?? null; }

    mark() { return { e: this.elements.length, n: this.envs.length, r: this.rels.length, v: this.views.length, k: new Set(this.viewKeys), a: new Map(this.aliases), notes: this.notes.length }; }
    rollback(m) {
        this.elements.length = m.e; this.envs.length = m.n; this.rels.length = m.r; this.views.length = m.v;
        this.viewKeys = m.k; this.aliases = m.a; this.notes.length = m.notes;
    }

    /** The one named element of `kinds` called `name`, or else whose own identifier is `name`. */
    find(name, kinds = null, parent = undefined) {
        const n = lower(name).trim();
        if (!n) return null;
        const pool = this.elements.filter((e) => !e.anonymous && e.name !== null && (!kinds || kinds.includes(e.kind)) && (parent === undefined || (e.parent ?? null) === parent));
        const byName = pool.filter((e) => lower(e.name).trim() === n);
        if (byName.length === 1) return byName[0];
        const aliased = this.aliases.has(n) ? pool.find((e) => lower(e.id) === lower(this.aliases.get(n))) : null;
        if (aliased && !byName.length) return aliased;
        if (byName.length > 1) return null;
        const byAlias = pool.filter((e) => lower(e.id.split(".").at(-1)) === n);
        return byAlias.length === 1 ? byAlias[0] : null;
    }

    /** Whether an element of `kind` called `name` already sits under `parent` — one `find` could not pick. */
    named(name, kind, parent = null) {
        return this.elements.some((e) => e.kind === kind && e.name !== null && lower(e.name).trim() === lower(name).trim() && (e.parent ?? null) === parent);
    }

    ancestors(id) {
        const out = [];
        let e = this.element(id);
        while (e?.parent) { out.push(e.parent); e = this.element(e.parent); }
        return out;
    }

    isUnder(id, of) { return lower(id) === lower(of) || this.ancestors(id).some((a) => lower(a) === lower(of)); }

    /** A relationship from `a` (or below it) to `b` (or below it) exists. */
    related(a, b) { return this.rels.some((r) => this.isUnder(r.source, a) && this.isUnder(r.destination, b)); }

    uniqueId(base) {
        const taken = new Set([...this.elements.map((e) => lower(e.id)), ...this.envs.filter((e) => e.id).map((e) => lower(e.id))]);
        let id = base;
        for (let n = 2; taken.has(lower(id)); n++) id = `${base}${n}`;
        return id;
    }

    addElement({ kind, local, name = null, description = null, technology = null, tags = [], parent = null, group = null, environment = null, instanceOf = null }) {
        const env = environment ? this.envs.find((e) => lower(e.name) === lower(environment)) : null;
        const prefix = parent ?? (env?.id || null);
        const base = this.hierarchical && prefix ? `${prefix}.${identifier(local)}` : identifier(local);
        const id = this.uniqueId(base);
        const element = { id, kind, name, description, technology, tags, parent, group, environment, instanceOf, isNew: true };
        this.elements.push(element);
        return element;
    }

    addEnvironment(name) {
        const id = this.uniqueId(identifier(lower(name), "environment"));
        const env = { id, name, isNew: true };
        this.envs.push(env);
        return env;
    }

    addRelationship(source, destination, description, technology) {
        this.rels.push({ source, destination, description: description ?? null, technology: technology ?? null, isNew: true });
    }

    uniqueKey(base) {
        const clean = String(base ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "view";
        let key = clean;
        for (let n = 2; this.viewKeys.has(key); n++) key = `${clean}-${n}`;
        this.viewKeys.add(key);
        return key;
    }

    addView(view) { this.views.push(view); }

    get changed() { return this.elements.some((e) => e.isNew) || this.envs.some((e) => e.isNew) || this.rels.some((r) => r.isNew) || this.views.length > 0; }

    // ── rendering ──

    localOf(e) {
        if (!this.hierarchical) return e.id;
        return e.id.split(".").at(-1);
    }

    elementLines(e, indent) {
        const tail = [];
        const local = this.localOf(e);
        let head;
        if (e.kind === "containerInstance" || e.kind === "softwareSystemInstance") head = `${local} = ${e.kind} ${e.instanceOf}`;
        else {
            const args = [q(e.name), q(e.description)];
            const tags = e.tags.length ? q(e.tags.join(",")) : null;
            if (e.kind === "container" || e.kind === "component") {
                if (e.technology || tags) args.push(q(e.technology ?? ""));
            } else if (e.kind === "deploymentNode") {
                if (e.technology || tags) args.push(q(e.technology ?? ""));
            }
            if (tags) args.push(tags);
            head = `${local} = ${e.kind} ${args.join(" ")}`;
        }
        const children = this.elements.filter((c) => c.isNew && c.parent === e.id);
        if (!children.length) return [`${indent}${head}`];
        tail.push(`${indent}${head} {`, ...this.childLines(children, `${indent}    `), `${indent}}`);
        return tail;
    }

    /** New elements under one host, each group in a `group` block of its own. */
    childLines(children, indent) {
        const lines = [];
        const grouped = new Map();
        for (const c of children) {
            if (!c.group) { lines.push(...this.elementLines(c, indent)); continue; }
            if (!grouped.has(c.group)) grouped.set(c.group, []);
            grouped.get(c.group).push(c);
        }
        for (const [group, members] of grouped) {
            lines.push(`${indent}group ${q(group)} {`);
            for (const c of members) lines.push(...this.elementLines(c, `${indent}    `));
            lines.push(`${indent}}`);
        }
        return lines;
    }

    envLines(env, indent) {
        const nodes = this.elements.filter((e) => e.isNew && !e.parent && lower(e.environment) === lower(env.name));
        const head = env.id ? `${env.id} = deploymentEnvironment ${q(env.name)}` : `deploymentEnvironment ${q(env.name)}`;
        return [`${indent}${head} {`, ...this.childLines(nodes, `${indent}    `), `${indent}}`];
    }

    viewLines(view, indent) {
        const inner = `${indent}    `;
        let head;
        if (view.kind === "systemLandscape") head = `systemLandscape ${view.key}`;
        else if (view.kind === "deployment") head = `deployment ${view.scope ?? "*"} ${q(view.environment)} ${view.key}`;
        else head = `${view.kind} ${view.scope ?? "*"} ${view.key}`;
        const lines = [`${indent}${head} {`];
        if (view.title) lines.push(`${inner}title ${q(view.title)}`);
        if (view.kind === "dynamic") {
            for (const step of view.steps) lines.push(`${inner}${step.source} -> ${step.destination}${step.description ? ` ${q(step.description)}` : ""}`);
        } else if (view.includes === "*") lines.push(`${inner}include *`);
        else if (view.includes.length) lines.push(`${inner}include ${view.includes.join(" ")}`);
        lines.push(`${inner}autolayout lr`, `${indent}}`);
        return lines;
    }

    /**
     * The files with every addition written in: `{ files, problems }`. A problem means a
     * block could not be found or written into, and nothing should be written.
     */
    render() {
        const files = new Map(this.files);
        const problems = [];
        const inserts = new Map(); // file → [{ line, mode, lines }]
        const push = (file, entry) => { if (!inserts.has(file)) inserts.set(file, []); inserts.get(file).push(entry); };
        const into = (file, declLine, lines, what) => {
            const s = statementAt(files.get(file), declLine);
            if (!s) { problems.push(`${file}:${declLine} — ${what}'s statement could not be found to write into.`); return; }
            if (s.block && s.shared) { problems.push(`${file}:${s.closeLine} — ${what}'s block closes on a line with other statements; nothing can be added to it here.`); return; }
            // A `{` appended after text the DSL reads as a comment or stray text would not open a block.
            if (!s.block && /\/\/|\/\*|\s#/.test(files.get(file).split(/\r?\n/)[s.lastLine - 1].replace(/"(?:[^"\\]|\\.)*"/g, '""'))) { problems.push(`${file}:${s.lastLine} — ${what}'s line ends in a comment, so no block can be opened on it.`); return; }
            push(file, s.block ? { line: s.closeLine, mode: "before", lines } : { line: s.lastLine, mode: "open", lines });
        };

        // elements into an element or environment that already exists
        for (const host of this.elements.filter((e) => !e.isNew)) {
            const children = this.elements.filter((c) => c.isNew && c.parent === host.id);
            if (children.length) into(host.file, host.line, this.childLines(children, ""), `\`${host.id}\``);
        }
        for (const env of this.envs.filter((e) => !e.isNew)) {
            const nodes = this.elements.filter((e) => e.isNew && !e.parent && lower(e.environment) === lower(env.name));
            if (nodes.length) into(env.file, env.line, this.childLines(nodes, ""), `deployment environment \`${env.name}\``);
        }

        // top-level elements, new environments, and relationships at the end of `model`
        const top = [
            ...this.childLines(this.elements.filter((e) => e.isNew && !e.parent && !e.environment), ""),
            ...this.envs.filter((e) => e.isNew).flatMap((env) => this.envLines(env, "")),
        ];
        const rels = this.rels.filter((r) => r.isNew).map((r) => `${r.source} -> ${r.destination}${r.description || r.technology ? ` ${q(r.description ?? "")}` : ""}${r.technology ? ` ${q(r.technology)}` : ""}`);
        const main = files.get(WORKSPACE);
        if (top.length || rels.length) {
            const model = topBlock(main, "model");
            if (!model?.block) problems.push(`${WORKSPACE} — no \`model\` block in the workspace file itself to add elements to.`);
            else if (model.shared) problems.push(`${WORKSPACE}:${model.closeLine} — the \`model\` block closes on a line with other statements.`);
            else push(WORKSPACE, { line: model.closeLine, mode: "before", lines: [...top, ...(top.length && rels.length ? [""] : []), ...rels] });
        }
        if (this.views.length) {
            const views = this.views.flatMap((v) => this.viewLines(v, ""));
            const block = topBlock(main, "views");
            if (block?.block && !block.shared) push(WORKSPACE, { line: block.closeLine, mode: "before", lines: views });
            else if (block) problems.push(`${WORKSPACE} — the \`views\` block cannot be written into.`);
            else {
                const ws = workspaceClose(main);
                if (!ws?.block || ws.shared) problems.push(`${WORKSPACE} — no \`views\` block, and no place to add one.`);
                else push(WORKSPACE, { line: ws.closeLine, mode: "before", lines: ["", "views {", ...views.map((l) => (l ? `    ${l}` : l)), "}"] });
            }
        }

        for (const [file, entries] of inserts) {
            const eol = files.get(file).includes("\r\n") ? "\r\n" : "\n";
            const lines = files.get(file).split(/\r?\n/);
            for (const entry of entries.sort((a, b) => b.line - a.line)) {
                const at = entry.line - 1;
                if (entry.mode === "before") {
                    const indent = `${/^\s*/.exec(lines[at])[0]}    `;
                    lines.splice(at, 0, ...entry.lines.map((l) => (l ? indent + l : l)));
                } else {
                    const indent = /^\s*/.exec(lines[at])[0];
                    lines[at] = `${lines[at].replace(/\s+$/, "")} {`;
                    lines.splice(at + 1, 0, ...entry.lines.map((l) => (l ? `${indent}    ${l}` : l)), `${indent}}`);
                }
            }
            files.set(file, lines.join(eol));
        }
        return { files, problems };
    }
}
