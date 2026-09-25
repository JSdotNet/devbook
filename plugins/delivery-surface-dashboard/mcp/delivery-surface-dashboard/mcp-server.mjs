#!/usr/bin/env node
// MCP server: delivery-surface-dashboard
//
// A run surface: where a run becomes visible, and nothing else. It implements all three
// operation groups of the surface capability — lifecycle (open_dashboard, start_run,
// record_prompt, set_run_context, update_stage, finish_run, list_runs, get_run), render
// (render_diagram, render_markdown) and export (export_report) — and knows nothing about
// what produced the runs it shows. Whichever agent calls these tools resolves them from the
// live tool list at run time; nothing here declares a dependency, and nothing is aware of
// any particular engine, skill, or workflow.
//
// A run is one JSON file with named stages carrying status, output, links, QA scenarios and
// monitoring findings. Three pages read it: the dashboard shell (render.mjs) plus the
// diagram and document viewers (views/), each served two ways —
//
//   MCP App (SEP-1865)                 plain browser
//   ui:// resource, rendered inline    page served on 127.0.0.1
//   tools/call through app-bridge.js   the page's own fetch and EventSource
//
// Everything is served on 127.0.0.1, on a port derived from the worktree so a browser tab left
// open survives a server restart (see preferredPort). There is no authentication: reaching it
// already requires local access to the machine.

import { createServer } from "node:http";
import { createReadStream, watch as fsWatch } from "node:fs";
import { stat as fsStat, readFile as fsReadFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { ensureDir, writeRun, readRun, listRuns, newRunId } from "./store.mjs";
import { renderShell } from "./render.mjs";
import { summarizeInsights, summarizeContext } from "./insight.mjs";
import { renderReportMarkdown, renderReportHtml } from "./report.mjs";
import { runsDir, stateDir, worktreeRoot, readActive, writeActive } from "./state.mjs";
import { isIdle, clearIdle, isHandoffPending, markHandoff, clearHandoff } from "./idle.mjs";
import { computeSessionTitle, loadSessionNaming } from "./session-title.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_NAME = "delivery-surface-dashboard";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

// MCP Apps (SEP-1865). A host that implements this extension renders the pages below inline
// in the conversation instead of the user opening them in a browser. Hosts that do not
// implement it ignore the resources entirely and the HTTP surface stays the way in.
const UI_EXTENSION = "io.modelcontextprotocol/ui";
const APP_MIME_TYPE = "text/html;profile=mcp-app";
const APP_RESOURCES = [
    {
        uri: "ui://delivery-surface-dashboard/dashboard.html",
        name: "Run dashboard",
        description: "Live run list, stage progress, QA results and reports for tracked runs.",
        page: "dashboard",
    },
    {
        uri: "ui://delivery-surface-dashboard/diagram.html",
        name: "Mermaid diagram viewer",
        description: "Interactive, pannable Mermaid diagram viewer.",
        page: "mermaid",
    },
    {
        uri: "ui://delivery-surface-dashboard/document.html",
        name: "Markdown document viewer",
        description: "Rendered Markdown document preview.",
        page: "markdown",
    },
];
const APP_RESOURCE_BY_URI = new Map(APP_RESOURCES.map((r) => [r.uri, r]));

const VALID_STATUSES = ["pending", "in_progress", "done", "blocked", "skipped", "cancelled"];
const VALID_SCENARIO_STATUSES = ["pass", "fail", "flaky"];
const VALID_FINDING_LEVELS = ["error", "critical", "warning", "info"];
const VALID_CHANGE_KINDS = ["new-functionality", "bug-fix", "dependency-update", "none"];
const VALID_APPROVAL_STATES = ["pending", "approved", "rejected"];
const VALID_PROMPT_KINDS = ["initial", "follow-up"];

const EVIDENCE_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".log": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};

class ToolError extends Error {}

const bus = new EventEmitter();
bus.setMaxListeners(0);

// ---------------------------------------------------------------------------
// Run store helpers
// ---------------------------------------------------------------------------

const baseDir = runsDir();

// Serializes read-modify-write access per runId so two tool calls issued back-to-back
// cannot race each other and silently drop an update. The telemetry hook is a separate
// process and writes through the same store; its updates are append-only into `insights`
// and `tokenUsage`, so the worst case is a lost telemetry sample, never a lost stage.
const runLocks = new Map();
function withRunLock(runId, fn) {
    const prev = runLocks.get(runId) || Promise.resolve();
    const run = prev.then(fn, fn);
    runLocks.set(runId, run.then(() => {}, () => {}));
    return run;
}

function summarize(run) {
    return {
        id: run.id,
        skillId: run.skillId,
        title: run.title,
        status: run.status,
        startedAt: run.startedAt,
        updatedAt: run.updatedAt,
        changeKind: run.changeKind || null,
        approval: run.approval || null,
        // Derived, not stored: an `in_progress` run nothing has advanced. Surfaced so the
        // dashboard and a resuming agent can tell a live run from one abandoned at a gate.
        idle: isIdle(run),
        idleSince: run.idleSince || null,
        // A run whose session ended deliberately, at a context threshold, waiting to be
        // continued elsewhere. It satisfies `idle` too, so consumers check this first.
        handoff: run.handoff || null,
        handoffPending: isHandoffPending(run),
    };
}

function findStageIndex(run, { stageIndex, stageName }) {
    if (typeof stageIndex === "number") return stageIndex;
    if (stageName) {
        const idx = run.stages.findIndex((s) => s.name === stageName);
        if (idx >= 0) return idx;
    }
    return -1;
}

function normalizeScenarios(scenarios) {
    if (!Array.isArray(scenarios)) return undefined;
    return scenarios.map((s) => ({
        name: String((s && s.name) || "Scenario"),
        status: VALID_SCENARIO_STATUSES.includes(s && s.status) ? s.status : "fail",
        notes: typeof (s && s.notes) === "string" ? s.notes : "",
        evidence: Array.isArray(s && s.evidence)
            ? s.evidence
                  .filter((e) => e && typeof e.path === "string" && e.path)
                  .map((e) => ({
                      type: typeof e.type === "string" && e.type ? e.type : "file",
                      path: e.path,
                      description: typeof e.description === "string" ? e.description : "",
                  }))
            : [],
    }));
}

function normalizeMonitoring(monitoring) {
    if (!monitoring || typeof monitoring !== "object") return undefined;
    return {
        summary: typeof monitoring.summary === "string" ? monitoring.summary : "",
        findings: Array.isArray(monitoring.findings)
            ? monitoring.findings.map((f) => ({
                  level: VALID_FINDING_LEVELS.includes(f && f.level) ? f.level : "info",
                  resource: typeof (f && f.resource) === "string" ? f.resource : "",
                  message: typeof (f && f.message) === "string" ? f.message : "",
                  timestamp: typeof (f && f.timestamp) === "string" ? f.timestamp : "",
              }))
            : [],
    };
}

function normalizeWorkItem(workItem) {
    if (!workItem || typeof workItem !== "object") return null;
    const issue = {};
    ["owner", "repo", "url", "title"].forEach((key) => {
        if (typeof workItem[key] === "string" && workItem[key].trim()) {
            issue[key] = workItem[key].trim();
        }
    });
    const rawNumber = workItem.number ?? workItem.issueNumber;
    const number = Number(rawNumber);
    if (Number.isInteger(number) && number > 0) issue.number = number;
    return Object.keys(issue).length ? issue : null;
}

// A host that substitutes nothing hands the token over as written; that is no id at all.
function normalizeSessionId(sessionId) {
    if (typeof sessionId !== "string") return null;
    const id = sessionId.trim();
    return id && !id.startsWith("${") ? id : null;
}

// Appends, never replaces, and never twice. Returns whether the run changed.
function addSessionId(run, sessionId) {
    const id = normalizeSessionId(sessionId);
    if (!Array.isArray(run.sessionIds)) run.sessionIds = [];
    if (!id || run.sessionIds.includes(id)) return false;
    run.sessionIds.push(id);
    return true;
}

function normalizeLinks(links) {
    if (!Array.isArray(links)) return undefined;
    return links
        .filter((link) => link && typeof link.url === "string" && link.url)
        .map((link) => ({
            label: typeof link.label === "string" && link.label ? link.label : link.url,
            url: link.url,
            description: typeof link.description === "string" ? link.description : "",
        }))
        .filter((link) => /^(https?:\/\/|\/)/i.test(link.url));
}

function normalizePromptEntry(entry, fallbackKind = "follow-up") {
    if (!entry || typeof entry !== "object") return null;
    const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
    if (!prompt) return null;
    const kind = VALID_PROMPT_KINDS.includes(entry.kind) ? entry.kind : fallbackKind;
    const createdAt =
        typeof entry.createdAt === "string" && entry.createdAt.trim()
            ? entry.createdAt.trim()
            : new Date().toISOString();
    return {
        kind,
        label:
            typeof entry.label === "string" && entry.label.trim()
                ? entry.label.trim()
                : kind === "initial"
                  ? "Initial prompt"
                  : "Follow-up prompt",
        prompt,
        createdAt,
    };
}

function normalizePromptHistory(originalPrompt, promptHistory, initialCreatedAt) {
    const prompts = [];
    const initial =
        typeof originalPrompt === "string" && originalPrompt.trim()
            ? normalizePromptEntry(
                  { kind: "initial", label: "Initial prompt", prompt: originalPrompt, createdAt: initialCreatedAt },
                  "initial"
              )
            : null;
    if (initial) prompts.push(initial);
    if (Array.isArray(promptHistory)) {
        promptHistory.forEach((entry) => {
            const normalized = normalizePromptEntry(entry);
            if (!normalized) return;
            if (normalized.kind === "initial" && prompts.some((p) => p.kind === "initial" && p.prompt === normalized.prompt)) return;
            prompts.push(normalized);
        });
    }
    return prompts;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

function evidenceContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return EVIDENCE_CONTENT_TYPES[ext] || "application/octet-stream";
}

const EVIDENCE_IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

// Evidence lives in the git worktree the agent is operating in (e.g. `.qa-evidence/...`
// or a QA provider's own `.wip/qa/<feature>/screenshots/...`), never in the dashboard's own
// state directory. Anything resolving outside that root is refused.
async function resolveEvidencePath(relPath) {
    const root = worktreeRoot();
    if (!relPath || !root) return { error: "not_available" };
    const resolved = path.resolve(root, relPath);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) return { error: "forbidden" };
    let stats;
    try {
        stats = await fsStat(resolved);
    } catch {
        return { error: "not_found" };
    }
    if (!stats.isFile()) return { error: "not_found" };
    return { resolved, size: stats.size };
}

// Reads every image evidence file referenced by a run and returns a map of evidence path
// -> `data:` URI, so a downloaded HTML report is fully self-contained. Non-image or
// unreadable evidence maps to `null` so the report shows a placeholder instead of a
// broken image.
async function collectEvidenceDataUris(run) {
    const map = {};
    for (const stage of run.stages || []) {
        for (const scenario of stage.scenarios || []) {
            for (const ev of scenario.evidence || []) {
                if (!ev || !ev.path || Object.prototype.hasOwnProperty.call(map, ev.path)) continue;
                const isImage = EVIDENCE_IMAGE_EXT.test(ev.path) || /screenshot|image/i.test(ev.type || "");
                if (!isImage) {
                    map[ev.path] = null;
                    continue;
                }
                const info = await resolveEvidencePath(ev.path);
                if (info.error) {
                    map[ev.path] = null;
                    continue;
                }
                try {
                    const bytes = await fsReadFile(info.resolved);
                    map[ev.path] = `data:${evidenceContentType(info.resolved)};base64,${bytes.toString("base64")}`;
                } catch {
                    map[ev.path] = null;
                }
            }
        }
    }
    return map;
}

// ---------------------------------------------------------------------------
// Content viewers (replacing the diagram-canvas and markdown-canvas extensions)
// ---------------------------------------------------------------------------

// One view stack per viewer, mirroring the canvas extensions' per-instance state: the
// current view plus a history the page's Back button pops.
const viewers = {
    mermaid: { currentView: null, history: [], clients: new Set() },
    markdown: { currentView: null, history: [], clients: new Set() },
};

function viewPayload(viewer) {
    const view = viewer.currentView;
    return {
        ...view,
        historyDepth: viewer.history.length,
        breadcrumbs: viewer.history.map((v) => v.title).concat(view ? [view.title] : []),
    };
}

function broadcastViewer(viewer, event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of viewer.clients) res.write(msg);
}

function setView(viewer, view, mode) {
    if (mode === "push" && viewer.currentView) viewer.history.push(viewer.currentView);
    viewer.currentView = view;
    broadcastViewer(viewer, "view", viewPayload(viewer));
}

function popView(viewer) {
    if (!viewer.history.length) return null;
    viewer.currentView = viewer.history.pop();
    broadcastViewer(viewer, "view", viewPayload(viewer));
    return viewer.currentView;
}

// --- MCP App resources ------------------------------------------------------
//
// The same three pages the HTTP server returns, with the bridge script injected ahead of
// their own. The pages are unchanged: see app-bridge.js for why.

async function appPageHtml(page) {
    const body =
        page === "dashboard"
            ? renderShell()
            : await fsReadFile(path.join(__dirname, "views", page === "mermaid" ? "mermaid.html" : "markdown.html"), "utf8");
    const bridge = await fsReadFile(path.join(__dirname, "app-bridge.js"), "utf8");
    // The HTTP origin lets the app resolve evidence images and the HTML report, which are
    // files rather than JSON. Starting the server here is what makes that origin knowable.
    const origin = await ensureHttpServer().catch(() => "");
    const preamble =
        // data-mcp-app tells the page a host supplies its theme and owns its URL.
        `<script>window.__DELIVERY_HTTP_ORIGIN__ = ${JSON.stringify(origin || "")};` +
        `document.documentElement.setAttribute("data-mcp-app", "");</script>\n` +
        `<script>\n${bridge}\n</script>\n`;
    const headIndex = body.indexOf("<head>");
    if (headIndex < 0) return preamble + body;
    return body.slice(0, headIndex + "<head>".length) + "\n" + preamble + body.slice(headIndex + "<head>".length);
}

function appResourceMeta(origin) {
    const domains = origin ? [origin.replace(/\/$/, "")] : [];
    return {
        ui: {
            csp: {
                // The dashboard's own HTTP origin serves evidence images and reports; the CDN
                // serves Mermaid for the diagram viewer.
                connectDomains: domains,
                resourceDomains: domains.concat(["https://cdn.jsdelivr.net"]),
            },
            prefersBorder: true,
        },
    };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

let httpServer = null;
let httpUrl = null;

function sendHtml(res, body) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(body);
}

async function handleRequest(req, res) {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/") {
        sendHtml(res, renderShell());
        return;
    }

    // --- dashboard API ------------------------------------------------------
    if (req.method === "GET" && pathname === "/api/runs") {
        const runs = await listRuns(baseDir);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(runs.map(summarize)));
        return;
    }

    const reportMatch = pathname.match(/^\/api\/runs\/([^/]+)\/report$/);
    if (req.method === "GET" && reportMatch) {
        const run = await readRun(baseDir, decodeURIComponent(reportMatch[1]));
        if (!run) {
            res.statusCode = 404;
            res.end("not found");
            return;
        }
        const filename = `${run.skillId}-${run.id}.md`.replace(/[^a-zA-Z0-9._-]/g, "-");
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.end(renderReportMarkdown(run));
        return;
    }

    const reportHtmlMatch = pathname.match(/^\/api\/runs\/([^/]+)\/report\.html$/);
    if (req.method === "GET" && reportHtmlMatch) {
        const run = await readRun(baseDir, decodeURIComponent(reportHtmlMatch[1]));
        if (!run) {
            res.statusCode = 404;
            res.end("not found");
            return;
        }
        const evidenceDataUris = await collectEvidenceDataUris(run);
        const filename = `${run.skillId}-${run.id}.html`.replace(/[^a-zA-Z0-9._-]/g, "-");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        if (url.searchParams.get("inline") !== "1") {
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        }
        res.end(renderReportHtml(run, evidenceDataUris));
        return;
    }

    const evidenceMatch = pathname.match(/^\/api\/runs\/([^/]+)\/evidence$/);
    if (req.method === "GET" && evidenceMatch) {
        const info = await resolveEvidencePath(url.searchParams.get("path"));
        if (info.error) {
            res.statusCode = info.error === "forbidden" ? 403 : 404;
            res.end(
                info.error === "forbidden"
                    ? "forbidden"
                    : info.error === "not_available"
                      ? "evidence not available"
                      : "evidence file not found"
            );
            return;
        }
        res.setHeader("Content-Type", evidenceContentType(info.resolved));
        res.setHeader("Content-Length", String(info.size));
        createReadStream(info.resolved).pipe(res);
        return;
    }

    const detailMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (req.method === "GET" && detailMatch) {
        const run = await readRun(baseDir, decodeURIComponent(detailMatch[1]));
        if (!run) {
            res.statusCode = 404;
            res.end("not found");
            return;
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
            JSON.stringify({
                ...run,
                idle: isIdle(run),
                insightSummary: summarizeInsights(run),
                contextSummary: summarizeContext(run),
            })
        );
        return;
    }

    if (req.method === "GET" && pathname === "/events") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        res.write("retry: 2000\n\n");
        const onUpdate = () => res.write("event: update\ndata: {}\n\n");
        bus.on("update", onUpdate);
        req.on("close", () => bus.off("update", onUpdate));
        return;
    }

    // --- content viewers ----------------------------------------------------
    for (const [name, viewer] of Object.entries(viewers)) {
        const page = name === "mermaid" ? "mermaid.html" : "markdown.html";
        if (req.method === "GET" && (pathname === `/${name}` || pathname === `/${name}/`)) {
            sendHtml(res, await fsReadFile(path.join(__dirname, "views", page), "utf8"));
            return;
        }
        if (req.method === "GET" && pathname === `/${name}/events`) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            viewer.clients.add(res);
            req.on("close", () => viewer.clients.delete(res));
            if (viewer.currentView) {
                res.write(`event: view\ndata: ${JSON.stringify(viewPayload(viewer))}\n\n`);
            }
            return;
        }
        if (req.method === "GET" && pathname === `/${name}/api/state`) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(viewPayload(viewer)));
            return;
        }
        if (req.method === "POST" && pathname === `/${name}/api/back`) {
            const prev = popView(viewer);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, view: prev }));
            return;
        }
    }

    res.statusCode = 404;
    res.end("not found");
}

// The same worktree asks for the same port every time, so a dashboard tab — a host's browser
// pane especially — keeps working after the server restarts. DELIVERY_SURFACE_DASHBOARD_PORT
// overrides it and 0 asks for an ephemeral port. A taken port falls back to an ephemeral one:
// a second server for the same worktree, or a collision with another worktree's.
function preferredPort() {
    const override = process.env.DELIVERY_SURFACE_DASHBOARD_PORT;
    if (override !== undefined && override !== "") {
        const port = Number(override);
        if (Number.isInteger(port) && port >= 0 && port <= 65535) return port;
        process.stderr.write(`delivery-surface-dashboard: ignoring DELIVERY_SURFACE_DASHBOARD_PORT=${override}
`);
    }
    const hash = createHash("sha1").update(worktreeRoot().toLowerCase()).digest();
    return 41000 + (hash.readUInt16BE(0) % 8000);
}

function listenOn(server, port) {
    return new Promise((resolve, reject) => {
        const onError = (err) => {
            server.off("listening", onListening);
            reject(err);
        };
        const onListening = () => {
            server.off("error", onError);
            resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
    });
}

// The dashboard opened on one run. Where a host shows the page in a pane, this is the link
// that lands on the work in progress rather than on the run list.
function runUrl(base, runId) {
    return runId ? `${base}?run=${encodeURIComponent(runId)}` : base;
}

// One start, however many callers race for it: resources/list and the first tool call often
// arrive together, and listening now takes more than one tick.
let httpStarting = null;
function ensureHttpServer() {
    if (!httpStarting) {
        httpStarting = startHttpServer().catch((err) => {
            httpStarting = null;
            throw err;
        });
    }
    return httpStarting;
}

async function startHttpServer() {
    await ensureDir(baseDir);
    const server = createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
            res.statusCode = 500;
            res.end(String((err && err.message) || err));
        });
    });
    const port = preferredPort();
    try {
        await listenOn(server, port);
    } catch (err) {
        if (port === 0 || !err || err.code !== "EADDRINUSE") throw err;
        await listenOn(server, 0);
    }
    httpServer = server;
    const address = httpServer.address();
    httpUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/`;
    // The telemetry hook writes run files from its own process, so the dashboard cannot
    // rely on in-process events alone to know when something changed.
    try {
        let pending = null;
        fsWatch(baseDir, () => {
            if (pending) return;
            pending = setTimeout(() => {
                pending = null;
                bus.emit("update");
            }, 150);
        });
    } catch {
        // Watching is a nicety; the page also refetches on its own interval.
    }
    return httpUrl;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

async function setActiveStage(runId, stage) {
    const active = await readActive();
    if (active.runId !== runId) return;
    await writeActive({ ...active, stage, updatedAt: new Date().toISOString() });
}

const tools = [
    {
        name: "open_dashboard",
        description:
            "Show the run dashboard. In a host that supports MCP Apps it renders inline; otherwise it starts the local dashboard server and returns URLs for the run dashboard and the diagram/document viewers. Call once per session, before start_run. Where it does not render inline, publish the returned dashboardUrl to the user as a link rather than opening it yourself.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        _meta: { ui: { resourceUri: "ui://delivery-surface-dashboard/dashboard.html" } },
        handler: async () => {
            const url = await ensureHttpServer();
            return {
                dashboardUrl: url,
                diagramUrl: `${url}mermaid`,
                documentUrl: `${url}markdown`,
                stateDir: stateDir(),
            };
        },
    },
    {
        name: "start_run",
        description:
            "Start tracking a new run. Call once at the beginning of the procedure being tracked, listing every stage up front so the dashboard can show overall progress immediately. Returns `sessionTitle` once the run has been observed writing output — on a fresh run it is null and no rename is due yet.",
        inputSchema: {
            type: "object",
            properties: {
                skillId: { type: "string", description: "Identifier of the skill or procedure this run is tracking. Used to reattach a resumed run and to name exported reports." },
                title: { type: "string", description: "Short human-readable title for this run, e.g. the feature or bug name." },
                stages: {
                    type: "array",
                    description: "Ordered list of stages for this run.",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            agents: { type: "array", items: { type: "string" } },
                        },
                        required: ["name"],
                    },
                },
                originalPrompt: { type: "string", description: "Original user prompt or request text that started this run." },
                promptHistory: {
                    type: "array",
                    description: "Optional full prompt history, including the initial prompt and any follow-up prompts already known.",
                    items: {
                        type: "object",
                        properties: {
                            kind: { type: "string", enum: VALID_PROMPT_KINDS },
                            label: { type: "string" },
                            prompt: { type: "string" },
                            createdAt: { type: "string" },
                        },
                        required: ["prompt"],
                    },
                },
                workItem: {
                    type: "object",
                    description: "Originating work item — a GitHub issue, a Jira ticket, a planning chapter. Any of url, number, title, repo. When omitted, a Work Item Update stage is hidden as not relevant.",
                },
                changeKind: {
                    type: "string",
                    enum: VALID_CHANGE_KINDS,
                    description: "Kind of change this run produces; drives Validation depth and is persisted so a resumed run keeps the same depth.",
                },
                resume: {
                    type: "boolean",
                    description: "If true (default), reattach to an existing in_progress run for the same skillId instead of starting a duplicate. Set false to force a new run.",
                },
                sessionId: {
                    type: "string",
                    description: "The host's own id for the agent session driving this run. Recorded in the run's sessionIds; a reattached run appends it beside the earlier ids rather than replacing them.",
                },
            },
            required: ["skillId", "title", "stages"],
        },
        handler: async (input) => {
            const { skillId, title, stages, originalPrompt, promptHistory, workItem, changeKind, resume, sessionId } = input;
            if (!skillId || !title || !Array.isArray(stages) || stages.length === 0) {
                throw new ToolError("skillId, title, and a non-empty stages[] are required.");
            }
            if (changeKind && !VALID_CHANGE_KINDS.includes(changeKind)) {
                throw new ToolError(`changeKind must be one of ${VALID_CHANGE_KINDS.join(", ")}`);
            }
            const dashboardUrl = await ensureHttpServer();
            if (resume !== false) {
                // An idle run is deliberately not resumable here: a run abandoned at the
                // human gate stays `in_progress`, and adopting it would
                // silently continue dead work under a stale title and stage list.
                //
                // A **handed-off** run is the exception, and the reason the marker exists: its
                // session ended on purpose at a context threshold so that a fresh session
                // could continue it, and it is idle by exactly the same signals. Refusing it
                // here would open a duplicate run for work already in flight.
                const existing = (await listRuns(baseDir)).find(
                    (r) => r.skillId === skillId && r.status === "in_progress" && (!isIdle(r) || isHandoffPending(r))
                );
                if (existing) {
                    // A handoff continues the run in a new session, so its id joins the
                    // earlier ones: which sessions drove a run is history, not a slot.
                    const sessionAdded = addSessionId(existing, sessionId);
                    // Clear both stamps before the new session does anything: while
                    // `idleSince` is set, the telemetry hook drops this session's tool calls
                    // rather than attributing them to the run.
                    if (sessionAdded || existing.idleSince || isHandoffPending(existing)) {
                        clearHandoff(existing);
                        clearIdle(existing);
                        existing.updatedAt = new Date().toISOString();
                        await writeRun(baseDir, existing);
                    }
                    await writeActive({ runId: existing.id, stage: null, updatedAt: new Date().toISOString() });
                    bus.emit("update");
                    return {
                        runId: existing.id,
                        resumed: true,
                        run: existing,
                        dashboardUrl: runUrl(dashboardUrl, existing.id),
                        sessionTitle: computeSessionTitle(existing, await loadSessionNaming(worktreeRoot())),
                    };
                }
            }
            const normalizedOriginalPrompt = typeof originalPrompt === "string" && originalPrompt.trim() ? originalPrompt.trim() : "";
            const normalizedPromptHistory = normalizePromptHistory(normalizedOriginalPrompt, promptHistory);
            const initialPrompt = normalizedPromptHistory.find((entry) => entry.kind === "initial");
            const now = new Date().toISOString();
            const run = {
                id: newRunId(),
                skillId,
                title,
                status: "in_progress",
                changeKind: changeKind || null,
                sessionIds: [],
                approval: { state: "pending", decidedAt: null, note: "" },
                originalPrompt: normalizedOriginalPrompt || (initialPrompt ? initialPrompt.prompt : ""),
                promptHistory: normalizedPromptHistory,
                phaseDoneCounts: {},
                workItem: normalizeWorkItem(workItem),
                startedAt: now,
                updatedAt: now,
                stages: stages.map((s) => ({
                    name: s.name,
                    agents: Array.isArray(s.agents) ? s.agents : [],
                    status: "pending",
                    output: "",
                    startedAt: null,
                    doneCount: 0,
                    completedAt: null,
                    updatedAt: null,
                    durationMs: null,
                })),
                summary: "",
                insights: [],
            };
            addSessionId(run, sessionId);
            await writeRun(baseDir, run);
            await writeActive({ runId: run.id, stage: null, updatedAt: now });
            bus.emit("update");
            return { runId: run.id, resumed: false, dashboardUrl: runUrl(dashboardUrl, run.id), sessionTitle: computeSessionTitle(run, await loadSessionNaming(worktreeRoot())) };
        },
    },
    {
        name: "record_prompt",
        description:
            "Append an initial or follow-up user prompt to a tracked run's prompt history so the dashboard and exported reports show the full session prompt sequence.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                prompt: { type: "string", description: "User prompt text to record." },
                kind: { type: "string", enum: VALID_PROMPT_KINDS, description: "Prompt kind. Defaults to follow-up." },
                label: { type: "string", description: "Optional display label for the prompt." },
                createdAt: { type: "string", description: "Optional ISO timestamp. Defaults to now." },
            },
            required: ["runId", "prompt"],
        },
        handler: async ({ runId, prompt, kind, label, createdAt }) => {
            const entry = normalizePromptEntry({ prompt, kind, label, createdAt }, kind || "follow-up");
            if (!entry) throw new ToolError("prompt is required.");
            let count = 0;
            await withRunLock(runId, async () => {
                const run = await readRun(baseDir, runId);
                if (!run) throw new ToolError(`No run with id ${runId}`);
                run.promptHistory = normalizePromptHistory(run.originalPrompt, run.promptHistory, run.startedAt);
                const existingInitial = run.promptHistory.find((promptEntry) => promptEntry.kind === "initial");
                if (!run.originalPrompt && existingInitial) run.originalPrompt = existingInitial.prompt;
                if (entry.kind !== "initial" || !existingInitial) run.promptHistory.push(entry);
                if (entry.kind === "initial" && !run.originalPrompt) run.originalPrompt = entry.prompt;
                run.updatedAt = new Date().toISOString();
                clearIdle(run);
                count = run.promptHistory.length;
                await writeRun(baseDir, run);
            });
            bus.emit("update");
            return { ok: true, count };
        },
    },
    {
        name: "set_run_context",
        description:
            "Persist run-level context that must survive a session resume or compaction: the change kind driving stage depth, the approval decision recorded at a human gate, and the session-handoff marker. Call with approval 'approved' only after the user explicitly approves.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                changeKind: { type: "string", enum: VALID_CHANGE_KINDS },
                approval: {
                    type: "string",
                    enum: VALID_APPROVAL_STATES,
                    description: "The decision a human gate returned. Recorded, never inferred: pass 'approved' only after the user said so.",
                },
                approvalNote: { type: "string", description: "What the user said when approving or rejecting." },
                handoff: {
                    type: "boolean",
                    description:
                        "Set true when ending this session at a context threshold so another session continues the run: start_run will reattach to it instead of opening a duplicate, and the dashboard shows it as handed off rather than abandoned. Leave the stage in flight in_progress. Not needed on resume — start_run clears the marker.",
                },
                handoffNote: {
                    type: "string",
                    description: "What the next session needs: what is finished, what is not, the paths it needs, and the exact invocation to resume with.",
                },
            },
            required: ["runId"],
        },
        handler: async ({ runId, changeKind, approval, approvalNote, handoff, handoffNote }) => {
            if (changeKind && !VALID_CHANGE_KINDS.includes(changeKind)) {
                throw new ToolError(`changeKind must be one of ${VALID_CHANGE_KINDS.join(", ")}`);
            }
            if (approval && !VALID_APPROVAL_STATES.includes(approval)) {
                throw new ToolError(`approval must be one of ${VALID_APPROVAL_STATES.join(", ")}`);
            }
            let result = null;
            await withRunLock(runId, async () => {
                const run = await readRun(baseDir, runId);
                if (!run) throw new ToolError(`No run with id ${runId}`);
                if (changeKind) run.changeKind = changeKind;
                if (approval) {
                    run.approval = {
                        state: approval,
                        decidedAt: new Date().toISOString(),
                        note: typeof approvalNote === "string" ? approvalNote : (run.approval && run.approval.note) || "",
                    };
                }
                if (handoff === true) {
                    const inFlight = run.stages.find((s) => s.status === "in_progress");
                    markHandoff(run, { note: handoffNote, stage: inFlight ? inFlight.name : null });
                } else if (handoff === false) {
                    clearHandoff(run);
                } else if (typeof handoffNote === "string" && handoffNote && run.handoff) {
                    run.handoff = { ...run.handoff, note: handoffNote };
                }
                run.updatedAt = new Date().toISOString();
                // A handoff is the one context update that must not mark the run live again:
                // clearing the stamp here would make it look advanced and defeat the marker.
                if (handoff !== true) clearIdle(run);
                await writeRun(baseDir, run);
                result = { changeKind: run.changeKind || null, approval: run.approval || null, handoff: run.handoff || null };
            });
            bus.emit("update");
            return result || { ok: true };
        },
    },
    {
        name: "update_stage",
        description:
            "Update one stage of a tracked run. Call once at its start (in_progress) and once when it ends (done/blocked/skipped) with a summary. For a gate stage: pass links to the review targets. For QA stages: pass scenarios and monitoring so results and evidence render inline. Returns the run's current `sessionTitle`, derived from where its output has landed so far; rename the session when it differs from the last name you set.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                stageIndex: { type: "number" },
                stageName: { type: "string" },
                status: { type: "string", enum: VALID_STATUSES },
                output: { type: "string", description: "What the stage did and produced." },
                appendOutput: { type: "boolean", description: "Append to existing output instead of replacing. Default false." },
                links: {
                    type: "array",
                    description: "Quick-action buttons (running app, Aspire dashboard, review target). Replaces this stage's existing links.",
                    items: {
                        type: "object",
                        properties: {
                            label: { type: "string" },
                            url: { type: "string", description: "HTTP(S) or same-origin." },
                            description: { type: "string" },
                        },
                        required: ["label", "url"],
                    },
                },
                scenarios: {
                    type: "array",
                    description: "QA scenario results. Replaces this stage's existing scenarios.",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            status: { type: "string", enum: VALID_SCENARIO_STATUSES },
                            notes: { type: "string", description: "Findings, console/network errors." },
                            evidence: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["screenshot", "video", "log", "trace", "other"] },
                                        path: { type: "string", description: "Relative to the git worktree root; outside paths are rejected." },
                                        description: { type: "string" },
                                    },
                                    required: ["path"],
                                },
                            },
                        },
                        required: ["name", "status"],
                    },
                },
                monitoring: {
                    type: "object",
                    description: "Runtime log/trace summary for this stage.",
                    properties: {
                        summary: { type: "string" },
                        findings: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    level: { type: "string", enum: VALID_FINDING_LEVELS },
                                    resource: { type: "string" },
                                    message: { type: "string" },
                                    timestamp: { type: "string" },
                                },
                                required: ["message"],
                            },
                        },
                    },
                },
            },
            required: ["runId", "status"],
        },
        handler: async (input) => {
            const { runId, stageIndex, stageName, status, output, appendOutput, links, scenarios, monitoring } = input;
            if (!VALID_STATUSES.includes(status)) {
                throw new ToolError(`status must be one of ${VALID_STATUSES.join(", ")}`);
            }
            let activeStage = undefined;
            let sessionTitle = null;
            await withRunLock(runId, async () => {
                const run = await readRun(baseDir, runId);
                if (!run) throw new ToolError(`No run with id ${runId}`);
                const idx = findStageIndex(run, { stageIndex, stageName });
                if (idx < 0 || idx >= run.stages.length) {
                    throw new ToolError("Provide a valid stageIndex or stageName.");
                }
                const stage = run.stages[idx];
                const nowIso = new Date().toISOString();
                const previousStatus = stage.status;
                stage.status = status;
                if (status === "in_progress") {
                    if (["done", "blocked", "skipped", "cancelled"].includes(previousStatus)) stage.startedAt = nowIso;
                    if (!stage.startedAt) stage.startedAt = nowIso;
                    stage.completedAt = null;
                    stage.durationMs = null;
                    activeStage = { index: idx, name: stage.name };
                } else {
                    activeStage = null;
                    if (["done", "blocked", "skipped", "cancelled"].includes(status) && stage.startedAt) {
                        stage.completedAt = nowIso;
                        const started = new Date(stage.startedAt).getTime();
                        const completed = new Date(stage.completedAt).getTime();
                        if (Number.isFinite(started) && Number.isFinite(completed)) {
                            stage.durationMs = Math.max(0, completed - started);
                        }
                    }
                }
                if (status === "done" && previousStatus !== "done") {
                    stage.doneCount = Math.max(0, Number(stage.doneCount) || 0) + 1;
                    run.phaseDoneCounts = run.phaseDoneCounts || {};
                    run.phaseDoneCounts[stage.name] = Math.max(0, Number(run.phaseDoneCounts[stage.name]) || 0) + 1;
                }
                if (typeof output === "string" && output.length > 0) {
                    stage.output = appendOutput && stage.output ? `${stage.output}\n${output}` : output;
                }
                const normalizedLinks = normalizeLinks(links);
                if (normalizedLinks) stage.links = normalizedLinks;
                const normalizedScenarios = normalizeScenarios(scenarios);
                if (normalizedScenarios) stage.scenarios = normalizedScenarios;
                const normalizedMonitoring = normalizeMonitoring(monitoring);
                if (normalizedMonitoring) stage.monitoring = normalizedMonitoring;
                stage.updatedAt = nowIso;
                run.updatedAt = nowIso;
                clearIdle(run);
                // Read inside the lock, off the same run the telemetry hook has been folding
                // write destinations into, so the name reflects everything observed up to now.
                // The naming config is read fresh each time, so an edit to it lands on the
                // next stage rather than the next run.
                sessionTitle = computeSessionTitle(run, await loadSessionNaming(worktreeRoot()));
                await writeRun(baseDir, run);
            });
            // Written outside the run lock: the telemetry hook reads this pointer to
            // attribute tool calls and token usage to the stage that is running now.
            if (activeStage !== undefined) await setActiveStage(runId, activeStage);
            bus.emit("update");
            return { ok: true, sessionTitle };
        },
    },
    {
        name: "finish_run",
        description: "Mark a run as finished (done/blocked/cancelled) and attach an overall summary shown at the end of the run detail.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                status: { type: "string", enum: ["done", "blocked", "cancelled"] },
                summary: { type: "string" },
            },
            required: ["runId", "status"],
        },
        handler: async ({ runId, status, summary }) => {
            await withRunLock(runId, async () => {
                const run = await readRun(baseDir, runId);
                if (!run) throw new ToolError(`No run with id ${runId}`);
                run.status = status;
                if (typeof summary === "string") run.summary = summary;
                run.updatedAt = new Date().toISOString();
                clearIdle(run);
                await writeRun(baseDir, run);
            });
            const active = await readActive();
            if (active.runId === runId) await writeActive({ runId: null, stage: null, updatedAt: new Date().toISOString() });
            bus.emit("update");
            return { ok: true };
        },
    },
    {
        name: "list_runs",
        description:
            "List all tracked runs (summaries only). Useful to recover the current runId after a resume or compaction. A run with idle:true is still in_progress but has been abandoned (its session ended, or nothing advanced it for hours) — close it with finish_run rather than continuing it. A run with handoffPending:true is idle too but was handed off deliberately at a context threshold: continue it with start_run for the same skillId, which reattaches, and read handoff.note for where the previous session stopped.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        handler: async () => (await listRuns(baseDir)).map(summarize),
    },
    {
        name: "get_run",
        description: "Fetch full detail (all stages, output, QA results, insight and context summaries) for one run.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                includeEvidence: {
                    type: "boolean",
                    description: "Also return QA evidence images as data URIs, for renderers that cannot fetch them over HTTP.",
                },
            },
            required: ["runId"],
        },
        handler: async ({ runId, includeEvidence }) => {
            const run = await readRun(baseDir, runId);
            if (!run) throw new ToolError(`No run with id ${runId}`);
            const detail = { ...run, insightSummary: summarizeInsights(run), contextSummary: summarizeContext(run) };
            if (includeEvidence) detail.evidenceDataUris = await collectEvidenceDataUris(run);
            return detail;
        },
    },
    {
        name: "render_diagram",
        description:
            "Render or update a Mermaid diagram in the diagram viewer. Use mode 'push' to drill into a related diagram (adds to history so the user can navigate back), or 'replace' (default) to update the current view in place. Render the same Mermaid source that was written to the file artifact; the file stays the source of truth.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Diagram title." },
                source: { type: "string", description: "Raw Mermaid diagram source, e.g. the contents of a ```mermaid fenced code block." },
                mode: { type: "string", enum: ["push", "replace"], description: "Navigation mode. Defaults to replace." },
                explanation: {
                    type: "object",
                    properties: { title: { type: "string" }, text: { type: "string" } },
                    description: "Optional explanation panel shown alongside the diagram.",
                },
            },
            required: ["source"],
        },
        _meta: { ui: { resourceUri: "ui://delivery-surface-dashboard/diagram.html" } },
        handler: async ({ title, source, mode, explanation }) => {
            const url = await ensureHttpServer();
            setView(viewers.mermaid, { title: title || "Diagram", source, explanation: explanation || null }, mode);
            return { ok: true, url: `${url}mermaid`, view: viewPayload(viewers.mermaid), historyDepth: viewers.mermaid.history.length };
        },
    },
    {
        name: "render_markdown",
        description:
            "Render or update a Markdown document in the document viewer. Render the same Markdown that was written to the file artifact; the file stays the source of truth.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Document title." },
                content: { type: "string", description: "Raw Markdown content to render." },
                mode: { type: "string", enum: ["push", "replace"], description: "Navigation mode. Defaults to replace." },
            },
            required: ["content"],
        },
        _meta: { ui: { resourceUri: "ui://delivery-surface-dashboard/document.html" } },
        handler: async ({ title, content, mode }) => {
            const url = await ensureHttpServer();
            setView(viewers.markdown, { title: title || "Document", content }, mode);
            return { ok: true, url: `${url}markdown`, view: viewPayload(viewers.markdown), historyDepth: viewers.markdown.history.length };
        },
    },
    {
        name: "export_report",
        description:
            "Write a run's report to a file and return its path. Use it to hand the user a shareable summary, or as the source for an Artifact. Format 'md' or 'html' (self-contained, with evidence images inlined).",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                format: { type: "string", enum: ["md", "html"], description: "Defaults to md." },
                outputPath: { type: "string", description: "Optional absolute or worktree-relative path to write to." },
            },
            required: ["runId"],
        },
        handler: async ({ runId, format, outputPath }) => {
            const run = await readRun(baseDir, runId);
            if (!run) throw new ToolError(`No run with id ${runId}`);
            const ext = format === "html" ? "html" : "md";
            const body = ext === "html" ? renderReportHtml(run, await collectEvidenceDataUris(run)) : renderReportMarkdown(run);
            const target = outputPath
                ? path.resolve(worktreeRoot(), outputPath)
                : path.join(stateDir(), "reports", `${run.skillId}-${run.id}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "-"));
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, body, "utf8");
            return { path: target, format: ext };
        },
    },
];

const toolsByName = new Map(tools.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// MCP stdio transport (newline-delimited JSON-RPC 2.0)
// ---------------------------------------------------------------------------

function send(message) {
    process.stdout.write(JSON.stringify(message) + "\n");
}

function respond(id, result) {
    send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message) {
    send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(msg) {
    if (!msg || msg.jsonrpc !== "2.0") return;
    const { id, method, params } = msg;
    // Notifications carry no id and expect no response.
    if (id === undefined || id === null) return;

    switch (method) {
        case "initialize": {
            const requested = params && params.protocolVersion;
            respond(id, {
                protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
                capabilities: {
                    tools: { listChanged: false },
                    resources: { listChanged: false, subscribe: false },
                    // Extensions are negotiated: a host that does not implement MCP Apps
                    // simply never reads the ui:// resources.
                    extensions: { [UI_EXTENSION]: { mimeTypes: [APP_MIME_TYPE] } },
                },
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            });
            return;
        }
        case "ping":
            respond(id, {});
            return;
        case "tools/list":
            respond(id, {
                tools: tools.map(({ name, description, inputSchema, _meta }) =>
                    _meta ? { name, description, inputSchema, _meta } : { name, description, inputSchema }
                ),
            });
            return;
        case "resources/list": {
            const origin = await ensureHttpServer().catch(() => "");
            respond(id, {
                resources: APP_RESOURCES.map(({ uri, name, description }) => ({
                    uri,
                    name,
                    description,
                    mimeType: APP_MIME_TYPE,
                    _meta: appResourceMeta(origin),
                })),
            });
            return;
        }
        case "resources/read": {
            const resource = APP_RESOURCE_BY_URI.get(params && params.uri);
            if (!resource) {
                respondError(id, -32602, `Unknown resource: ${params && params.uri}`);
                return;
            }
            const origin = await ensureHttpServer().catch(() => "");
            respond(id, {
                contents: [
                    {
                        uri: resource.uri,
                        mimeType: APP_MIME_TYPE,
                        text: await appPageHtml(resource.page),
                        _meta: appResourceMeta(origin),
                    },
                ],
            });
            return;
        }
        case "tools/call": {
            const tool = toolsByName.get(params && params.name);
            if (!tool) {
                respondError(id, -32602, `Unknown tool: ${params && params.name}`);
                return;
            }
            try {
                const result = await tool.handler((params && params.arguments) || {});
                respond(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
            } catch (err) {
                // Tool failures are reported as results with isError so the model can read
                // and correct them, per the MCP spec; only protocol faults use JSON-RPC
                // errors.
                respond(id, {
                    content: [{ type: "text", text: String((err && err.message) || err) }],
                    isError: true,
                });
            }
            return;
        }
        default:
            respondError(id, -32601, `Method not found: ${method}`);
    }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            continue;
        }
        handleMessage(msg).catch((err) => {
            process.stderr.write(`delivery-surface-dashboard: ${String((err && err.stack) || err)}\n`);
        });
    }
});
process.stdin.on("end", () => process.exit(0));
