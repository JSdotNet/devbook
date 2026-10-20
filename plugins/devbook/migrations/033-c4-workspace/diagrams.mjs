// diagrams.mjs — 033-c4-workspace's readers: a Mermaid fence or an Archify spec, read
// into one neutral diagram the migration resolves against the workspace.
//
// A diagram is `{ keyword, title, nodes, rels, steps, participants, problems }`:
//
//   nodes         alias → { alias, kind, name, description, technology, tags, parent,
//                 external, boundary }; kind is person, softwareSystem, container,
//                 component, deploymentNode, or boundary; parent the enclosing alias
//   rels          { from, to, description, technology } between aliases
//   steps         the same, in order — a dynamic diagram's messages
//   participants  a sequence's { alias, label }, every one a workspace element to match
//
// Reading never guesses: a statement outside what is understood is a problem, and a
// diagram with a problem is reported and left where it is.

const STYLE = /^(UpdateElementStyle|UpdateRelStyle|UpdateBoundaryStyle|UpdateLayoutConfig|AddElementTag|AddRelTag|AddBoundaryTag|SHOW_LEGEND|HIDE_STEREOTYPE|LAYOUT_\w+)$/;

const ELEMENTS = new Map();
for (const [base, kind] of [["Person", "person"], ["System", "softwareSystem"], ["Container", "container"], ["Component", "component"]]) {
    for (const variant of ["", "Db", "Queue"]) {
        if (kind === "person" && variant) continue;
        for (const ext of ["", "_Ext"]) ELEMENTS.set(`${base}${variant}${ext}`, { kind, db: variant === "Db", queue: variant === "Queue", external: ext !== "" });
    }
}
const BOUNDARIES = { Enterprise_Boundary: "enterprise", System_Boundary: "system", Container_Boundary: "container", Boundary: "generic" };
const NODES = new Set(["Deployment_Node", "Node", "Node_L", "Node_R"]);
const RELS = new Set(["Rel", "BiRel", "Rel_U", "Rel_Up", "Rel_D", "Rel_Down", "Rel_L", "Rel_Left", "Rel_R", "Rel_Right", "Rel_Back", "Rel_Neighbor", "Rel_Back_Neighbor"]);

export const C4_KEYWORDS = ["C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment"];

/** A fence body's lines with `%%` comments, an `%%{init}%%` directive, and front matter taken off. */
function bodyLines(body) {
    const lines = String(body).replace(/\r\n?/g, "\n").split("\n");
    let title = null;
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    if (lines[i]?.trim() === "---") {
        for (i++; i < lines.length && lines[i].trim() !== "---"; i++) {
            const m = /^\s*title:\s*(.+?)\s*$/.exec(lines[i]);
            if (m) title = m[1].replace(/^["']|["']$/g, "");
        }
        i++;
    }
    const out = [];
    for (let n = i; n < lines.length; n++) {
        const line = lines[n].trim();
        if (!line || line.startsWith("%%")) continue;
        out.push({ text: line, line: n + 1 });
    }
    return { lines: out, title };
}

/** The diagram keyword a Mermaid fence opens with, or null. */
export function mermaidKeyword(body) {
    const first = bodyLines(body).lines[0]?.text ?? "";
    return /^([A-Za-z0-9]+)/.exec(first)?.[1] ?? null;
}

/** Arguments of a macro call: comma-separated, quotes stripped, `$name=` arguments set aside. */
function splitArgs(text) {
    const args = [];
    const named = {};
    let current = "";
    let quoted = false;
    for (const c of text) {
        if (c === '"') { quoted = !quoted; continue; }
        if (c === "," && !quoted) { args.push(current.trim()); current = ""; continue; }
        current += c;
    }
    if (current.trim() || args.length) args.push(current.trim());
    const positional = [];
    for (const arg of args) {
        const m = /^\$(\w+)\s*=\s*(.*)$/.exec(arg);
        if (m) named[m[1]] = m[2];
        else positional.push(arg);
    }
    return { positional, named };
}

const blank = (v) => (v == null || v === "" ? null : v);

/** A Mermaid `C4*` fence, read into a diagram. */
export function parseMermaidC4(body) {
    const { lines, title: frontTitle } = bodyLines(body);
    const diagram = { keyword: null, title: frontTitle, nodes: new Map(), rels: [], steps: [], problems: [] };
    const stack = [];
    const problem = (line, message) => diagram.problems.push(`line ${line}: ${message}`);
    for (const [index, { text, line }] of lines.entries()) {
        if (index === 0) {
            diagram.keyword = /^(\w+)/.exec(text)?.[1] ?? null;
            if (!C4_KEYWORDS.includes(diagram.keyword)) { problem(line, `\`${text}\` is not a C4 diagram.`); return diagram; }
            continue;
        }
        if (text === "}") { if (!stack.length) problem(line, "a `}` closes nothing."); stack.pop(); continue; }
        const titled = /^title\s+(.+)$/.exec(text);
        if (titled) { diagram.title = titled[1].trim(); continue; }
        const call = /^(\w+)\s*\((.*)\)\s*(\{)?\s*(\})?$/.exec(text);
        if (!call) { problem(line, `\`${text}\` is not a statement this migration reads.`); continue; }
        const [, macro, argText, opens, closes] = call;
        if (STYLE.test(macro)) continue;
        const { positional: a } = splitArgs(argText);
        const parent = stack.at(-1) ?? null;
        const declare = (node) => {
            if (!node.alias) { problem(line, `\`${macro}\` has no alias.`); return; }
            if (diagram.nodes.has(node.alias)) { problem(line, `\`${node.alias}\` is declared twice.`); return; }
            diagram.nodes.set(node.alias, node);
            if (opens && !closes) stack.push(node.alias);
        };
        const element = ELEMENTS.get(macro);
        if (element) {
            const tags = [];
            if (element.external) tags.push("External");
            if (element.db) tags.push("Database");
            if (element.queue) tags.push("Queue");
            const technical = element.kind === "container" || element.kind === "component";
            declare({
                alias: a[0], kind: element.kind, name: blank(a[1]) ?? a[0],
                technology: technical ? blank(a[2]) : null,
                description: blank(technical ? a[3] : a[2]),
                tags, external: element.external, parent,
            });
            continue;
        }
        if (BOUNDARIES[macro]) {
            declare({ alias: a[0], kind: "boundary", boundary: BOUNDARIES[macro], name: blank(a[1]) ?? a[0], description: null, technology: null, tags: [], external: false, parent });
            continue;
        }
        if (NODES.has(macro)) {
            declare({ alias: a[0], kind: "deploymentNode", name: blank(a[1]) ?? a[0], technology: blank(a[2]), description: blank(a[3]), tags: [], external: false, parent });
            continue;
        }
        if (RELS.has(macro) || macro === "RelIndex") {
            const at = macro === "RelIndex" ? 1 : 0;
            let [from, to] = [a[at], a[at + 1]];
            if (macro.startsWith("Rel_Back")) [from, to] = [to, from];
            const rel = { from, to, description: blank(a[at + 2]), technology: blank(a[at + 3]) };
            if (!from || !to) { problem(line, `\`${macro}\` needs two ends.`); continue; }
            diagram.rels.push(rel);
            diagram.steps.push(rel);
            if (macro === "BiRel") diagram.rels.push({ ...rel, from: to, to: from });
            continue;
        }
        problem(line, `\`${macro}\` is not a C4 statement this migration reads.`);
    }
    if (stack.length) diagram.problems.push(`\`${stack.at(-1)}\` opens a block that is never closed.`);
    for (const rel of diagram.rels) {
        for (const end of [rel.from, rel.to]) {
            if (diagram.nodes.has(end)) continue;
            // A dynamic diagram may name an element it never declares: a workspace element to match.
            if (diagram.keyword === "C4Dynamic") diagram.nodes.set(end, { alias: end, kind: "reference", name: end, description: null, technology: null, tags: [], external: false, parent: null });
            else diagram.problems.push(`a relationship names \`${end}\`, which the diagram never declares.`);
        }
    }
    return diagram;
}

const ARROW = /^(.+?)\s*(<<-->>|<<->>|-->>|->>|-->|->|--x|-x|--\)|-\))\s*([+-]?)\s*(.+?)\s*:\s*(.*)$/;
const SEQUENCE_SKIP = /^(autonumber|activate|deactivate|destroy|note\b|loop\b|alt\b|else\b|opt\b|par\b|and\b|critical\b|option\b|break\b|rect\b|box\b|end$|title\b)/i;

/** A Mermaid `sequenceDiagram`, read into its participants and messages. */
export function parseSequence(body) {
    const { lines, title } = bodyLines(body);
    const diagram = { keyword: "sequenceDiagram", title, participants: [], steps: [], selfMessages: 0, problems: [] };
    const byAlias = new Map();
    const participant = (alias, label) => {
        if (byAlias.has(alias)) return;
        const p = { alias, label: label ?? alias };
        byAlias.set(alias, p);
        diagram.participants.push(p);
    };
    for (const [index, { text, line }] of lines.entries()) {
        if (index === 0) continue;
        const titled = /^title\s*:?\s*(.+)$/i.exec(text);
        if (titled) { diagram.title = titled[1].trim(); continue; }
        const declared = /^(?:create\s+)?(participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i.exec(text);
        if (declared) { participant(declared[2].trim(), declared[3]?.trim()); continue; }
        if (SEQUENCE_SKIP.test(text)) continue;
        const message = ARROW.exec(text);
        if (message) {
            const from = message[1].replace(/^[+-]/, "").trim();
            const to = message[4].trim();
            participant(from);
            participant(to);
            if (from === to) { diagram.selfMessages++; continue; }
            diagram.steps.push({ from, to, description: blank(message[5].trim()), technology: null });
            continue;
        }
        diagram.problems.push(`line ${line}: \`${text}\` is not a statement this migration reads.`);
    }
    return diagram;
}

/** A relationship label `does a thing (HTTPS)` split into what it does and over what. */
function splitLabel(label) {
    const text = String(label ?? "").trim();
    const m = /^(.*\S)\s*\(([^()]+)\)$/.exec(text);
    return m ? { description: m[1], technology: m[2].trim() } : { description: blank(text), technology: null };
}

const PERSON_TYPES = new Set(["person", "user", "actor", "human"]);

/**
 * An Archify `architecture` spec, read into a diagram: a `region` boundary is a system
 * and what it wraps are its containers, so a spec with one reads as `C4Container` and one
 * without as `C4Context`. A card item `<label> — <text>` gives that component its description.
 */
export function parseArchifyArchitecture(spec) {
    const diagram = { keyword: null, title: spec?.meta?.title ?? null, nodes: new Map(), rels: [], steps: [], problems: [] };
    const components = Array.isArray(spec?.components) ? spec.components : [];
    const described = new Map();
    for (const card of spec?.cards ?? []) {
        for (const item of card?.items ?? []) {
            const m = /^(.+?)\s+—\s+(.+)$/.exec(String(item));
            if (m && !described.has(m[1].trim().toLowerCase())) described.set(m[1].trim().toLowerCase(), m[2].trim());
        }
    }
    const wrapper = new Map();
    for (const [n, boundary] of (spec?.boundaries ?? []).entries()) {
        const alias = `~region-${n + 1}`;
        diagram.nodes.set(alias, { alias, kind: "boundary", boundary: "system", name: boundary.label ?? alias, description: null, technology: null, tags: [], external: false, parent: null });
        for (const id of boundary.wraps ?? []) {
            if (wrapper.has(id)) diagram.problems.push(`\`${id}\` sits in two boundaries.`);
            wrapper.set(id, alias);
        }
    }
    for (const c of components) {
        if (!c?.id) { diagram.problems.push("a component has no id."); continue; }
        const type = String(c.type ?? "").toLowerCase();
        const parent = wrapper.get(c.id) ?? null;
        const label = c.label ?? c.id;
        const card = described.get(String(label).toLowerCase());
        const tags = type === "database" ? ["Database"] : [];
        if (!parent && PERSON_TYPES.has(type)) {
            diagram.nodes.set(c.id, { alias: c.id, kind: "person", name: label, description: blank(c.sublabel) ?? card ?? null, technology: null, tags, external: false, parent: null });
        } else if (!parent && type === "external") {
            diagram.nodes.set(c.id, { alias: c.id, kind: "softwareSystem", name: label, description: blank(c.sublabel) ?? card ?? null, technology: null, tags: ["External"], external: true, parent: null });
        } else {
            diagram.nodes.set(c.id, { alias: c.id, kind: parent ? "container" : "softwareSystem", name: label, description: card ?? null, technology: parent ? blank(c.sublabel) : null, tags, external: false, parent, fromArchify: !parent });
        }
    }
    for (const c of spec?.connections ?? []) {
        if (!diagram.nodes.has(c.from) || !diagram.nodes.has(c.to)) { diagram.problems.push(`connection \`${c.id ?? `${c.from}->${c.to}`}\` names a component the spec does not hold.`); continue; }
        const rel = { from: c.from, to: c.to, ...splitLabel(c.label) };
        diagram.rels.push(rel);
    }
    diagram.keyword = (spec?.boundaries ?? []).length ? "C4Container" : "C4Context";
    return diagram;
}

/** An Archify `sequence` spec, read into its participants and messages. */
export function parseArchifySequence(spec) {
    const diagram = { keyword: "sequenceDiagram", title: spec?.meta?.title ?? null, participants: [], steps: [], selfMessages: 0, problems: [] };
    for (const p of spec?.participants ?? []) diagram.participants.push({ alias: p.id, label: p.label ?? p.id });
    const known = new Set(diagram.participants.map((p) => p.alias));
    for (const m of spec?.messages ?? []) {
        if (!known.has(m.from) || !known.has(m.to)) { diagram.problems.push(`message \`${m.id ?? m.label}\` names a participant the spec does not hold.`); continue; }
        if (m.from === m.to) { diagram.selfMessages++; continue; }
        diagram.steps.push({ from: m.from, to: m.to, ...splitLabel(m.label) });
    }
    return diagram;
}
