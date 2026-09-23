#!/usr/bin/env node
// MCP server: delivery-surface-collector
//
// A headless run surface: where a run becomes *recorded*, with nothing to look at. It
// implements two operation groups of the surface capability — lifecycle (open_dashboard,
// start_run, record_prompt, set_run_context, update_stage, finish_run, list_runs, get_run)
// and export (export_report) — and not the third. There is no page, no port, and no
// rendering: a scheduled or unattended run has nobody watching it, and a viewer nobody
// opens is cost without benefit.
//
// What it buys is the half that still matters with nobody watching: the run survives the
// session. Stage status, output, QA scenarios, gate decisions, and the handoff marker are
// on disk, so a resumed session picks the run up where it stopped and the report at the end
// is written from what actually happened rather than from what a transcript remembers.
//
// It knows nothing about what produced the runs it records. Whichever agent calls these
// tools resolves them from the live tool list at run time; nothing here declares a
// dependency, and nothing is aware of any particular engine, skill, or workflow.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir, writeRun, readRun, listRuns, newRunId } from "./store.mjs";
import { runsDir, stateDir, worktreeRoot, readActive, writeActive } from "./state.mjs";
import { isIdle, clearIdle, isHandoffPending, markHandoff, clearHandoff } from "./idle.mjs";
import { renderReportMarkdown } from "./report.mjs";

const SERVER_NAME = "delivery-surface-collector";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const VALID_STATUSES = ["pending", "in_progress", "done", "blocked", "skipped", "cancelled"];
const VALID_SCENARIO_STATUSES = ["pass", "fail", "flaky"];
const VALID_FINDING_LEVELS = ["error", "critical", "warning", "info"];
const VALID_CHANGE_KINDS = ["new-functionality", "bug-fix", "dependency-update", "none"];
const VALID_APPROVAL_STATES = ["pending", "approved", "rejected"];
const VALID_PROMPT_KINDS = ["initial", "follow-up"];

class ToolError extends Error {}

const baseDir = runsDir();

// Serializes read-modify-write access per runId so two tool calls issued back-to-back
// cannot race each other and silently drop an update.
const runLocks = new Map();
function withRunLock(runId, fn) {
    const prev = runLocks.get(runId) || Promise.resolve();
    const run = prev.then(fn, fn);
    runLocks.set(runId, run.then(() => {}, () => {}));
    return run;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------
//
// Everything a caller hands in is stored, so everything a caller hands in is checked here.
// A record that quietly kept a malformed scenario would be worse than no record: the report
// is read later, by someone who was not there.

function summarize(run) {
    const total = run.stages.length;
    const done = run.stages.filter((s) => ["done", "skipped"].includes(s.status)).length;
    return {
        id: run.id,
        skillId: run.skillId,
        title: run.title,
        status: run.status,
        startedAt: run.startedAt,
        updatedAt: run.updatedAt,
        changeKind: run.changeKind || null,
        approval: (run.approval && run.approval.state) || null,
        idle: isIdle(run),
        handoffPending: isHandoffPending(run),
        stageCount: total,
        stagesComplete: done,
        currentStage: (run.stages.find((s) => s.status === "in_progress") || {}).name || null,
    };
}

function findStageIndex(run, { stageIndex, stageName }) {
    if (Number.isInteger(stageIndex)) return stageIndex;
    if (typeof stageName === "string" && stageName) {
        return run.stages.findIndex((s) => s.name.toLowerCase() === stageName.toLowerCase());
    }
    return -1;
}

function normalizeScenarios(scenarios) {
    if (!Array.isArray(scenarios)) return null;
    return scenarios
        .filter((s) => s && typeof s.name === "string")
        .map((s) => ({
            name: s.name,
            status: VALID_SCENARIO_STATUSES.includes(s.status) ? s.status : "fail",
            notes: typeof s.notes === "string" ? s.notes : "",
            evidence: Array.isArray(s.evidence)
                ? s.evidence
                      .filter((e) => e && typeof e.path === "string" && e.path)
                      .map((e) => ({
                          type: typeof e.type === "string" ? e.type : "other",
                          path: e.path,
                          description: typeof e.description === "string" ? e.description : "",
                      }))
                : [],
        }));
}

function normalizeMonitoring(monitoring) {
    if (!monitoring || typeof monitoring !== "object") return null;
    return {
        summary: typeof monitoring.summary === "string" ? monitoring.summary : "",
        findings: Array.isArray(monitoring.findings)
            ? monitoring.findings
                  .filter((f) => f && typeof f.message === "string" && f.message)
                  .map((f) => ({
                      level: VALID_FINDING_LEVELS.includes(f.level) ? f.level : "info",
                      resource: typeof f.resource === "string" ? f.resource : "",
                      message: f.message,
                      timestamp: typeof f.timestamp === "string" ? f.timestamp : "",
                  }))
            : [],
    };
}

function normalizeWorkItem(workItem) {
    if (!workItem || typeof workItem !== "object") return null;
    const item = {};
    for (const key of ["url", "title", "repo", "state"]) {
        if (typeof workItem[key] === "string" && workItem[key].trim()) {
            item[key] = workItem[key].trim();
        }
    }
    const rawNumber = workItem.number ?? workItem.issueNumber;
    if (rawNumber !== undefined && rawNumber !== null && String(rawNumber).trim()) {
        item.number = String(rawNumber).trim();
    }
    return Object.keys(item).length ? item : null;
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
    if (!Array.isArray(links)) return null;
    return links
        .filter((link) => link && typeof link.label === "string" && typeof link.url === "string")
        .map((link) => ({
            label: link.label,
            url: link.url,
            description: typeof link.description === "string" ? link.description : "",
        }));
}

function normalizePromptEntry(entry, fallbackKind = "follow-up") {
    if (!entry) return null;
    const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
    if (!prompt) return null;
    const kind = VALID_PROMPT_KINDS.includes(entry.kind) ? entry.kind : fallbackKind;
    const createdAt = typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : new Date().toISOString();
    return {
        kind,
        label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : kind === "initial" ? "Initial prompt" : "Follow-up prompt",
        prompt,
        createdAt,
    };
}

function normalizePromptHistory(originalPrompt, promptHistory, initialCreatedAt) {
    const entries = Array.isArray(promptHistory)
        ? promptHistory.map((entry) => normalizePromptEntry(entry)).filter(Boolean)
        : [];
    const hasInitial = entries.some((entry) => entry.kind === "initial");
    if (!hasInitial && originalPrompt) {
        entries.unshift({
            kind: "initial",
            label: "Initial prompt",
            prompt: originalPrompt,
            createdAt: initialCreatedAt || new Date().toISOString(),
        });
    }
    return entries;
}

async function setActiveStage(runId, stage) {
    const active = await readActive();
    if (active.runId !== runId) return;
    await writeActive({ ...active, stage, updatedAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
//
// Nine names: the eight of the lifecycle group plus export_report. The two render names are
// absent on purpose — a caller resolves each capability group separately, and finds this
// one unanswered rather than finding a stub that pretends.

const tools = [
    {
        name: "open_dashboard",
        description:
            "Report where this run surface records to. It is headless: there is no page and no URL, so `dashboardUrl` is always null and there is nothing to open in a browser — say once that runs are being recorded rather than shown, and carry on. Call once per session, before start_run.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        handler: async () => {
            await ensureDir(baseDir);
            return {
                dashboardUrl: null,
                headless: true,
                stateDir: stateDir(),
                runsDir: baseDir,
                note: "Runs are recorded to disk, not rendered. Use export_report for something to read or share.",
            };
        },
    },
    {
        name: "start_run",
        description:
            "Start tracking a new run. Call once at the beginning of the procedure being tracked, listing every stage up front. Returns `sessionTitle`, which is always null here: naming a session from where its output landed needs a surface that observes writes, and this one records only what it is told.",
        inputSchema: {
            type: "object",
            properties: {
                skillId: { type: "string", description: "Identifier of the skill or procedure this run is tracking. Used to reattach a resumed run and to name exported reports." },
                title: { type: "string", description: "Short human-readable title for this run." },
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
                    description: "Originating work item — a GitHub issue, a Jira ticket, a planning chapter. Any of url, number, title, repo. When omitted, a Work Item Update stage is hidden from the report as not relevant.",
                },
                changeKind: {
                    type: "string",
                    enum: VALID_CHANGE_KINDS,
                    description: "Kind of change this run produces. Persisted so a resumed run keeps the same depth decisions.",
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
            if (resume !== false) {
                // An idle run is deliberately not resumable: a run abandoned at a human gate
                // stays `in_progress`, and adopting it would silently continue dead work
                // under a stale title and stage list.
                //
                // A **handed-off** run is the exception, and the reason the marker exists:
                // its session ended on purpose so another could continue it, and it is idle
                // by exactly the same signals. Refusing it would open a duplicate run for
                // work already in flight.
                const existing = (await listRuns(baseDir)).find(
                    (r) => r.skillId === skillId && r.status === "in_progress" && (!isIdle(r) || isHandoffPending(r))
                );
                if (existing) {
                    // A handoff continues the run in a new session, so its id joins the
                    // earlier ones: which sessions drove a run is history, not a slot.
                    const sessionAdded = addSessionId(existing, sessionId);
                    if (sessionAdded || existing.idleSince || isHandoffPending(existing)) {
                        clearHandoff(existing);
                        clearIdle(existing);
                        existing.updatedAt = new Date().toISOString();
                        await writeRun(baseDir, existing);
                    }
                    await writeActive({ runId: existing.id, stage: null, updatedAt: new Date().toISOString() });
                    return { runId: existing.id, resumed: true, run: existing, dashboardUrl: null, sessionTitle: null };
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
            };
            addSessionId(run, sessionId);
            await writeRun(baseDir, run);
            await writeActive({ runId: run.id, stage: null, updatedAt: now });
            return { runId: run.id, resumed: false, dashboardUrl: null, sessionTitle: null };
        },
    },
    {
        name: "record_prompt",
        description: "Append an initial or follow-up user prompt to a run's prompt history, so the exported report shows the full prompt sequence.",
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
                        "Set true when ending this session at a context threshold so another session continues the run: start_run reattaches to it instead of opening a duplicate. Leave the stage in flight in_progress. Not needed on resume — start_run clears the marker.",
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
            return result || { ok: true };
        },
    },
    {
        name: "update_stage",
        description:
            "Update one stage of a run. Call once at its start (in_progress) and once when it ends (done/blocked/skipped) with a summary. For a gate stage: pass links to the review targets. For QA stages: pass scenarios and monitoring so the report carries the evidence. Returns `sessionTitle`, always null here.",
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
                    description: "Review targets, running applications, dashboards. Replaces this stage's existing links.",
                    items: {
                        type: "object",
                        properties: {
                            label: { type: "string" },
                            url: { type: "string" },
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
                                        path: { type: "string", description: "Path to the evidence file, relative to the worktree root." },
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
                // The completion count increments on every transition into done, so a stage
                // repeated after a revise decision stays visible as repeated.
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
                await writeRun(baseDir, run);
            });
            if (activeStage !== undefined) await setActiveStage(runId, activeStage);
            return { ok: true, sessionTitle: null };
        },
    },
    {
        name: "finish_run",
        description: "Mark a run as finished (done/blocked/cancelled) and attach the overall summary the report ends with.",
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
            if (!["done", "blocked", "cancelled"].includes(status)) {
                throw new ToolError("status must be one of done, blocked, cancelled");
            }
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
            return { ok: true };
        },
    },
    {
        name: "list_runs",
        description:
            "List all recorded runs (summaries only). Useful to recover the current runId after a resume or compaction. A run with idle:true is still in_progress but has been abandoned — nothing has advanced it for hours; close it with finish_run rather than continuing it. A run with handoffPending:true is idle too but was handed off deliberately: continue it with start_run for the same skillId, which reattaches, and read handoff.note for where the previous session stopped.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        handler: async () => (await listRuns(baseDir)).map(summarize),
    },
    {
        name: "get_run",
        description: "Fetch full detail — all stages, output, links, QA scenarios and monitoring findings — for one run.",
        inputSchema: {
            type: "object",
            properties: { runId: { type: "string" } },
            required: ["runId"],
        },
        handler: async ({ runId }) => {
            const run = await readRun(baseDir, runId);
            if (!run) throw new ToolError(`No run with id ${runId}`);
            return { ...run, idle: isIdle(run) };
        },
    },
    {
        name: "export_report",
        description:
            "Write a run's report to a file and return its path. Markdown only: a self-contained HTML report is a rendering job, and this surface does not render. Asking for another format still writes Markdown and says so in the result rather than failing the run.",
        inputSchema: {
            type: "object",
            properties: {
                runId: { type: "string" },
                format: { type: "string", enum: ["md"], description: "Markdown. The only format this surface writes." },
                outputPath: { type: "string", description: "Optional absolute or worktree-relative path to write to." },
            },
            required: ["runId"],
        },
        handler: async ({ runId, format, outputPath }) => {
            const run = await readRun(baseDir, runId);
            if (!run) throw new ToolError(`No run with id ${runId}`);
            const target = outputPath
                ? path.resolve(worktreeRoot(), outputPath)
                : path.join(stateDir(), "reports", `${run.skillId}-${run.id}.md`.replace(/[^a-zA-Z0-9._-]/g, "-"));
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, renderReportMarkdown(run), "utf8");
            const result = { path: target, format: "md" };
            if (format && format !== "md") {
                result.requestedFormat = format;
                result.note = `This surface writes Markdown only; ${format} was not produced.`;
            }
            return result;
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
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            });
            return;
        }
        case "ping":
            respond(id, {});
            return;
        case "tools/list":
            respond(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
            return;
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
            process.stderr.write(`delivery-surface-collector: ${String((err && err.stack) || err)}\n`);
        });
    }
});
process.stdin.on("end", () => process.exit(0));
