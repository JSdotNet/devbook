// Session naming: derive a scannable session title from where a run's output actually landed.
//
// The prefix answers "what kind of work was this" without anyone declaring it, because the
// destination already says so: a write under a devbook folder is a specification change, a
// write anywhere else is a code change, and a published Artifact is a deliverable that lives
// outside the repository entirely. Keying on the destination rather than on the skill that ran
// means an ad-hoc session and a tracked one classify identically, and a skill that turns
// out to touch something other than its usual folder is labelled by what it did.
//
// Destinations are observed by the telemetry hook (PostToolUse on every write tool) and
// accumulated onto the run, so the title sharpens as the run reveals itself and then holds
// steady once the dominant destination settles.

import { readdir } from "node:fs/promises";
import path from "node:path";

// Devbook folders carry their own prefix; everything else is code. The order here is also
// the tie-break rank: a run that wrote the same number of files to two destinations is named
// after the rarer one, because "this session touched the domain model" is the more surprising
// fact and the one worth finding again.
//
// The five folders are the set `DEVBOOK_FOLDER_NAMES` in the devbook plugin's
// `tools/devbook-meta/metadata.mjs` defines. It is restated rather than imported: this plugin
// is a surface and declares no dependency, so it must name a folder it is shown without
// requiring the plugin that owns the convention to be installed. The rank below is this
// file's own and deliberately not that constant's order.
const FOLDER_PREFIXES = [
    [".domain", "domain"],
    [".arc42", "arc42"],
    [".tech", "tech"],
    [".design", "design"],
    [".ai", "ai"],
];

// The nested layout puts every folder under one `.devbook/` parent whose subfolders drop the
// dot. Stripping the parent is what lets both layouts classify through the table above.
const NESTED_ROOT = ".devbook";

const DOMAIN_PREFIX = "domain";
const CODE_PREFIX = "code";
const ARTIFACT_PREFIX = "artifact";

// Rank by declaration order, code last.
const PREFIX_RANK = new Map([...FOLDER_PREFIXES.map(([, prefix]) => prefix), CODE_PREFIX].map((p, i) => [p, i]));

// Tools whose input names a file this run produced. Bash-driven writes are deliberately not
// tracked: there is no reliable way to tell `git status` from `sed -i` by inspecting a command
// string, and a guess that misfires renames the session wrongly. Under-counting only costs a
// less specific prefix.
const WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);

// The Artifact tool does more than publish — listing, reading comments, and managing assets all
// come through it. Only an actual publish makes the session an artifact session.
const ARTIFACT_TOOL = "Artifact";
const ARTIFACT_PUBLISH_ACTIONS = new Set(["publish"]);

const MAX_TITLE_LENGTH = 60;

function emptyDestinations() {
    return { prefixes: {}, artifact: false, contexts: null };
}

// Absolute or relative, Windows or POSIX, to repo-relative POSIX segments.
function toSegments(filePath, cwd) {
    if (typeof filePath !== "string" || !filePath) return null;
    let normalized = filePath.replace(/\\/g, "/");
    if (typeof cwd === "string" && cwd) {
        const root = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
        // Case-insensitive because Windows paths reach us in whatever case the caller used.
        if (normalized.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
            normalized = normalized.slice(root.length + 1);
        } else if (path.isAbsolute(filePath)) {
            // An absolute path outside the worktree is scratch space, not run output.
            return null;
        }
    }
    const segments = normalized.split("/").filter((s) => s && s !== ".");
    return segments.length ? segments : null;
}

// `OrderManagement`, `Acme.Billing`, and `order_management` all reduce to the dash-separated
// parts a bounded-context folder is named with, so a code path can be matched back to a context.
//
// A file extension is left in as just another part rather than stripped: telling `Acme.Billing`
// (a module whose last part is the context) from `Invoice.cs` (a file) by shape alone is not
// possible, and a stray `cs` part matches no bounded context anyway.
function toParts(segment) {
    return String(segment)
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase()
        .split(/[-._\s]+/)
        .filter(Boolean);
}

// A context matches when its parts appear as a contiguous run inside the segment's parts, so
// `Acme.Billing` resolves to `billing` and `Contoso.OrderManagement.Api` to `order-management`.
// The longest match wins, so a repository declaring both `billing` and `billing-exports` gets
// the more specific one.
function matchContext(segment, contexts) {
    const parts = toParts(segment);
    let best = null;
    for (const context of contexts) {
        const wanted = context.split("-");
        if (wanted.length > parts.length) continue;
        for (let i = 0; i + wanted.length <= parts.length; i++) {
            if (wanted.every((part, j) => parts[i + j] === part)) {
                if (!best || wanted.length > best.length) best = { context, length: wanted.length };
                break;
            }
        }
    }
    return best ? best.context : null;
}

// The bounded contexts this repository actually declares. Read once per run and cached on it,
// so a code-only run — which never writes a `.domain/` path — can still resolve a boundary.
async function knownContexts(run, cwd) {
    const destinations = run.destinations;
    if (Array.isArray(destinations.contexts)) return destinations.contexts;
    let contexts = [];
    if (typeof cwd === "string" && cwd) {
        // Whichever layout the repository picked. A repository never mixes the two, so the
        // first of these that reads is the one it uses.
        for (const dir of [path.join(cwd, ".domain"), path.join(cwd, NESTED_ROOT, "domain")]) {
            try {
                const entries = await readdir(dir, { withFileTypes: true });
                contexts = entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name);
                break;
            } catch {
                // No such folder, or unreadable. Boundaries simply stay unresolved.
                contexts = [];
            }
        }
    }
    destinations.contexts = contexts;
    return contexts;
}

// `.devbook/domain/billing/domain.md` to `.domain/billing/domain.md`, so everything downstream
// — the prefix table and the boundary in `segments[1]` — sees one shape.
function unnest(segments) {
    if (segments[0] !== NESTED_ROOT || segments.length < 2) return segments;
    return [`.${segments[1]}`, ...segments.slice(2)];
}

function prefixFor(segments) {
    const head = segments[0];
    for (const [folder, prefix] of FOLDER_PREFIXES) {
        if (head === folder) return prefix;
    }
    return CODE_PREFIX;
}

function boundaryFor(segments, prefix, contexts) {
    // A `.domain/<context>/` write names its context outright.
    if (prefix === DOMAIN_PREFIX) return segments.length > 1 ? segments[1] : null;
    if (!contexts.length) return null;
    // Anywhere else, a path segment matching a declared context is the boundary. The
    // convention asks that context folders and code module names be kept aligned, which is
    // exactly what makes this resolvable.
    for (const segment of segments) {
        const matched = matchContext(segment, contexts);
        if (matched) return matched;
    }
    return null;
}

/**
 * Fold one tool call into the run's destination tally. Best-effort and silent: a tool that
 * names no file, or names one outside the worktree, is simply not counted.
 */
export async function recordDestination(run, { toolName, input, cwd }) {
    run.destinations = run.destinations && typeof run.destinations === "object" ? run.destinations : emptyDestinations();
    const destinations = run.destinations;
    destinations.prefixes =
        destinations.prefixes && typeof destinations.prefixes === "object" ? destinations.prefixes : {};

    if (toolName === ARTIFACT_TOOL) {
        const action = input && input.action;
        if (!action || ARTIFACT_PUBLISH_ACTIONS.has(action)) destinations.artifact = true;
        return;
    }
    if (!WRITE_TOOLS.has(toolName)) return;

    const raw = toSegments(input && input.file_path, cwd);
    if (!raw) return;
    // Derived indexes are generated output; a run that regenerated them is not *about* them.
    if (raw.includes("_meta")) return;
    const segments = unnest(raw);

    const prefix = prefixFor(segments);
    // Boundaries are tallied per prefix, not globally: the boundary shown has to belong to the
    // files that won the prefix. A run that edited one `.domain/billing/` chapter and two
    // unrelated source files is `code`, and calling it `code:billing` would overclaim.
    const bucket = destinations.prefixes[prefix] || (destinations.prefixes[prefix] = { files: 0, boundaries: {} });
    bucket.files += 1;

    const contexts = await knownContexts(run, cwd);
    const boundary = boundaryFor(segments, prefix, contexts);
    if (boundary) bucket.boundaries[boundary] = (bucket.boundaries[boundary] || 0) + 1;
}

function dominantPrefix(prefixes) {
    let best = null;
    for (const [prefix, bucket] of Object.entries(prefixes)) {
        const files = (bucket && bucket.files) || 0;
        if (!files) continue;
        if (
            !best ||
            files > best.files ||
            (files === best.files && (PREFIX_RANK.get(prefix) ?? 99) < (PREFIX_RANK.get(best.prefix) ?? 99))
        ) {
            best = { prefix, files };
        }
    }
    return best ? best.prefix : null;
}

// Cap the assembled name, not the run title: what has to stay scannable is the row in the
// session list, and the prefix is the part of it that must never be the thing that gets cut.
function truncate(text) {
    if (text.length <= MAX_TITLE_LENGTH) return text;
    let cut = text.slice(0, MAX_TITLE_LENGTH - 1);
    // Only trim back to a word boundary when the cut actually landed mid-word.
    if (!/\s/.test(text[MAX_TITLE_LENGTH - 1])) {
        const space = cut.lastIndexOf(" ");
        if (space > MAX_TITLE_LENGTH * 0.6) cut = cut.slice(0, space);
    }
    return `${cut.trimEnd()}…`;
}

/**
 * The session title this run currently warrants, or `null` when nothing has been observed yet.
 *
 * Null matters: renaming before any write has landed would replace the host's own summary of
 * the opening prompt with an unprefixed copy of the run title, which is strictly worse. The
 * rename waits until the destination is actually known.
 */
export function computeSessionTitle(run) {
    const title = run && typeof run.title === "string" ? run.title.trim() : "";
    if (!title) return null;
    const destinations = (run && run.destinations) || emptyDestinations();
    const prefixes = destinations.prefixes || {};

    // A published artifact wins outright. It is the session's shareable deliverable, and it is
    // the one output that cannot be found again by browsing the repository.
    const prefix = destinations.artifact ? ARTIFACT_PREFIX : dominantPrefix(prefixes);
    if (!prefix) return null;

    let boundary = null;
    if (prefix !== ARTIFACT_PREFIX) {
        // Only an unambiguous boundary is worth showing; a run spanning two contexts is
        // better labelled by its folder alone than by an arbitrary half-truth.
        const named = Object.keys((prefixes[prefix] && prefixes[prefix].boundaries) || {});
        if (named.length === 1) boundary = named[0];
    }

    const head = boundary ? `${prefix}:${boundary}` : prefix;
    return truncate(`${head} — ${title}`);
}
