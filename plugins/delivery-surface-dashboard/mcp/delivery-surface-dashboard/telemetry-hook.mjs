#!/usr/bin/env node
// Telemetry bridge: Claude Code hook events -> delivery-surface-dashboard run insights.
//
// The GitHub Copilot version of this dashboard subscribes to host session events
// (`tool.execution_start`, `tool.execution_complete`, `subagent.completed`,
// `assistant.usage`, `session.usage_info`, `session.compaction_start`,
// `session.truncation`) from inside the extension process. Claude Code exposes the
// equivalent information differently: as hook invocations, one short-lived process per
// event, plus the session transcript on disk. This script is that adapter, so the
// Insight and Context panels keep working without the driving agent having to
// self-report anything.
//
//   Copilot event              Claude Code source
//   tool.execution_start       PreToolUse hook       (records the start time)
//   tool.execution_complete    PostToolUse hook      (duration, category, MCP server)
//   subagent.completed         PostToolUse on Task   (agent name from subagent_type)
//   assistant.usage            transcript JSONL      (per-message `usage`, incl. sidechains)
//   session.usage_info         transcript JSONL      (last root message's prompt size)
//   session.compaction_start   PreCompact hook       (trigger: manual | auto)
//   (no Copilot equivalent)    SessionEnd hook       (stamps the run idle — see idle.mjs)
//   (no Copilot equivalent)    PostToolUse write     (output destination — see session-title.mjs)
//
// The adapter also runs one way outward: when a PostToolUse sample pushes the run-level
// context gauge past a threshold, the hook answers with a warning instead of staying silent
// (see `emitContextPressure`). That is the difference between the gauge being observable and
// the agent acting on it — nothing reads the gauge on the agent's behalf unless it is put in
// front of the agent.
//
// PreToolUse/PostToolUse are matched, not wildcarded. The hook is one process spawn per
// matched call, in every session the plugin is enabled in, whether or not a run is active, so
// the matcher in hooks/hooks.json keeps only the calls a run's panels are read for: shell,
// edits, Artifact publishes, sub-agents, skills, and every MCP tool including QA. It drops the
// high-frequency read-only ones (Read, Grep, Glob, WebFetch, WebSearch, TodoWrite) — the bulk
// of a session's calls and the least of its time. Consequence: `categorizeTool`'s "Read"
// bucket no longer appears in a run's time-by-tool breakdown, and the context gauge samples on
// matched calls only. Adding a tool the panels need means adding it to that matcher too — a
// tool the matcher drops reaches none of the code below.
//
// Usage: `node telemetry-hook.mjs` with the hook payload on stdin.
//
// Everything here is best-effort and must never fail a tool call: the script exits 0 on
// any error, and unparseable transcript lines are skipped rather than fatal.

import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readActive, writeActive, readTelemetry, writeTelemetry, runsDir } from "./state.mjs";
import { readRun, writeRun, withRunFileLock } from "./store.mjs";
import { isIdle, markIdle } from "./idle.mjs";
import { recordDestination } from "./session-title.mjs";
import {
    categorizeTool,
    appendToolCall,
    appendAgentUse,
    recordTokenUsage,
    recordContextSample,
    recordCompaction,
    evaluateContextPressure,
} from "./insight.mjs";

// The context window the gauge is a percentage *of*. Getting this wrong does not just
// mislabel the panel: every threshold in CONTEXT_PRESSURE_THRESHOLDS is a fraction of it, so
// a limit set too low puts the gauge over 100% on the first sample of the run, crosses and
// latches all three thresholds at once, and the delegate/handoff ladder never fires again
// when it would have mattered. A 200k default did exactly that on 1M-context models.
//
// Current Claude models are 1M-context; Haiku is the 200k exception. An explicit override is
// honored first for a session deliberately capped below its model's window.
function tokenLimitFor(model) {
    const override = Number(process.env.DELIVERY_SURFACE_DASHBOARD_TOKEN_LIMIT);
    if (Number.isFinite(override) && override > 0) return override;
    const id = typeof model === "string" ? model : "";
    if (/\[1m\]|-1m\b/i.test(id)) return 1_000_000;
    if (/haiku/i.test(id)) return 200_000;
    if (/opus|sonnet|fable|mythos/i.test(id)) return 1_000_000;
    // An unrecognized model is assumed small, so the ladder fires early rather than late.
    return 200_000;
}

function mcpServerFor(toolName) {
    const match = typeof toolName === "string" && toolName.match(/^mcp__([^_]+(?:_[^_]+)*?)__/);
    return match ? match[1] : undefined;
}

const AGENT_TOOLS = new Set(["Task", "Agent"]);

function readStdin() {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => (data += chunk));
        process.stdin.on("end", () => resolve(data));
        // A hook that is invoked with no stdin should not hang the tool call.
        setTimeout(() => resolve(data), 2000).unref?.();
    });
}

// Claude Code writes a sub-agent's messages to its own file rather than inlining them in
// the root transcript, so `isSidechain` entries never appear in the file the hook payload
// names. They live in a sibling directory keyed by session id:
//
//   <project>/<sessionId>.jsonl                      root transcript (hook payload)
//   <project>/<sessionId>/subagents/agent-*.jsonl    one file per delegated agent
//
// Reading only the payload's path is why `tokenUsage.subAgent` stayed at zero on runs that
// demonstrably delegated: delegated cost was never anywhere the hook looked.
function subAgentDirFor(transcriptPath) {
    if (!transcriptPath) return null;
    return path.join(transcriptPath.replace(/\.jsonl$/i, ""), "subagents");
}

async function listSubAgentTranscripts(transcriptPath) {
    const dir = subAgentDirFor(transcriptPath);
    if (!dir) return [];
    try {
        const names = await readdir(dir);
        return names.filter((name) => name.endsWith(".jsonl")).map((name) => path.join(dir, name));
    } catch {
        // No delegation in this session yet, or the directory is not readable.
        return [];
    }
}

// Reads one transcript file from `offset` and folds every assistant message's usage into
// the run. Returns the new offset, the last model seen, and the last prompt-size sample.
// Callers decide what those mean: only the root transcript's model labels tool calls, and
// only its samples drive the context gauge.
async function foldTranscriptFile(run, filePath, offset, { isSubAgent, stage }) {
    let size;
    try {
        size = (await stat(filePath)).size;
    } catch {
        return null;
    }
    let from = Number(offset) || 0;
    // A compaction rewrites the transcript, so an offset past the end means "start over".
    if (from > size) from = 0;
    if (from === size) return { offset: size, lastModel: null, lastSample: null };

    let text = "";
    const handle = await open(filePath, "r");
    try {
        const length = size - from;
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, from);
        text = buffer.toString("utf8");
    } finally {
        await handle.close();
    }

    // Only whole lines are consumed; a partial trailing line is left for the next run.
    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline < 0) return { offset: from, lastModel: null, lastSample: null };
    const consumed = text.slice(0, lastNewline + 1);
    let lastModel = null;
    let lastSample = null;

    for (const line of consumed.split("\n")) {
        if (!line.trim()) continue;
        let entry;
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }
        const message = entry && entry.message;
        const usage = message && message.usage;
        if (!usage || entry.type !== "assistant") continue;
        // A sub-agent file is sub-agent usage by construction; `isSidechain` is still
        // honored so an inlined sidechain entry in a root transcript is attributed
        // correctly if a host ever writes one.
        const subAgent = isSubAgent || entry.isSidechain === true;
        const model = message.model || null;
        recordTokenUsage(run, {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheReadTokens: usage.cache_read_input_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens,
            model,
            isSubAgent: subAgent,
            stageIndex: stage ? stage.index : null,
            stageName: stage ? stage.name : null,
        });
        if (!subAgent) {
            if (model) lastModel = model;
            // The prompt the model just read is the closest thing Claude Code has to
            // Copilot's `session.usage_info.currentTokens`: everything the context window
            // held for that call, cached or not.
            lastSample = {
                currentTokens:
                    (Number(usage.input_tokens) || 0) +
                    (Number(usage.cache_read_input_tokens) || 0) +
                    (Number(usage.cache_creation_input_tokens) || 0),
                tokenLimit: tokenLimitFor(model),
            };
        }
    }

    return { offset: from + Buffer.byteLength(consumed, "utf8"), lastModel, lastSample };
}

// Folds the root transcript and every sub-agent transcript belonging to it. Returns the
// updated telemetry cursors plus the last root-agent model seen, which is also used to
// label tool calls.
async function syncTranscript(run, telemetry, transcriptPath) {
    if (!transcriptPath) return telemetry;
    const active = await readActive();
    const stage = active.stage || null;
    const sameSession = telemetry.transcriptPath === transcriptPath;
    const priorOffset = sameSession ? telemetry.transcriptOffset : 0;
    const priorSubOffsets =
        sameSession && telemetry.subAgentOffsets && typeof telemetry.subAgentOffsets === "object"
            ? telemetry.subAgentOffsets
            : {};

    const root = await foldTranscriptFile(run, transcriptPath, priorOffset, { isSubAgent: false, stage });
    if (!root) return telemetry;

    // Sub-agent files are folded after the root so a delegated stage's subtotal lands on
    // the stage that is in progress now, matching how the root's own usage is attributed.
    const subAgentOffsets = {};
    for (const file of await listSubAgentTranscripts(transcriptPath)) {
        const folded = await foldTranscriptFile(run, file, priorSubOffsets[file], {
            isSubAgent: true,
            stage,
        });
        // A file that vanished keeps its old cursor rather than being re-read from zero.
        subAgentOffsets[file] = folded ? folded.offset : Number(priorSubOffsets[file]) || 0;
    }

    // Sub-agents run their own context window, so only root samples drive the gauge.
    if (root.lastSample) recordContextSample(run, root.lastSample);

    return {
        ...telemetry,
        transcriptPath,
        transcriptOffset: root.offset,
        subAgentOffsets,
        lastModel: root.lastModel || telemetry.lastModel || null,
    };
}

// Used when telemetry has nowhere to land: move the cursor to the end of the transcript
// so a run that becomes active later does not absorb the conversation that came before it.
async function skipToTranscriptEnd(sessionId, telemetry, transcriptPath) {
    if (!transcriptPath) return;
    try {
        const size = (await stat(transcriptPath)).size;
        // Sub-agent files are skipped too: a delegated agent from before the run started
        // would otherwise be folded in whole the first time the run goes active.
        const subAgentOffsets = {};
        for (const file of await listSubAgentTranscripts(transcriptPath)) {
            try {
                subAgentOffsets[file] = (await stat(file)).size;
            } catch {
                /* file vanished between listing and stat */
            }
        }
        await writeTelemetry(sessionId, {
            ...telemetry,
            transcriptPath,
            transcriptOffset: size,
            subAgentOffsets,
        });
    } catch {
        /* transcript not readable yet */
    }
}

// Announces a gauge threshold crossing on the tool call that crossed it. `systemMessage`
// surfaces it to the user; `additionalContext` puts it in front of the driving agent, which is
// the half that changes behavior. Written to stdout only when a threshold was actually
// crossed — every other invocation stays silent, as a hook on a "*" matcher must.
function emitContextPressure(pressure) {
    const limitK = Math.round(pressure.tokenLimit / 1000);
    const headline = `context ${pressure.pct}% of ${limitK}k (crossed ${pressure.thresholdPct}%)`;
    process.stdout.write(
        JSON.stringify({
            systemMessage: `delivery-surface-dashboard: ${headline}. ${pressure.action}`,
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: `Run ${headline}. ${pressure.action}`,
            },
        }),
    );
}

async function main() {
    const raw = await readStdin();
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return;
    }

    const event = payload.hook_event_name;
    const sessionId = payload.session_id || "default";
    const telemetry = await readTelemetry(sessionId);
    telemetry.pendingTools = telemetry.pendingTools && typeof telemetry.pendingTools === "object" ? telemetry.pendingTools : {};

    // PreToolUse only bookkeeps a start time; it never touches run state, so it stays
    // cheap even when no run is active.
    if (event === "PreToolUse") {
        const name = payload.tool_name || "unknown";
        const stack = Array.isArray(telemetry.pendingTools[name]) ? telemetry.pendingTools[name] : [];
        stack.push(Date.now());
        telemetry.pendingTools[name] = stack;
        await writeTelemetry(sessionId, telemetry);
        return;
    }

    const active = await readActive();
    if (!active.runId) {
        // A repository this plugin has never recorded a run in gets no state folder from a
        // hook that fires in every session on the machine: with no runs directory there is
        // nothing a later run could absorb, so leave nothing behind.
        try {
            await stat(runsDir());
        } catch {
            return;
        }
        // Nothing to attribute telemetry to. Still advance the transcript cursor so a run
        // started later does not absorb the whole earlier conversation as its first stage.
        await skipToTranscriptEnd(sessionId, telemetry, payload.transcript_path);
        return;
    }

    const baseDir = runsDir();
    const run = await readRun(baseDir, active.runId);
    if (!run) return;

    // The session that owned this run has ended, so nothing more will happen in it on its
    // own. Stamping the run idle stops its elapsed clock and keeps `start_run` from
    // adopting it; releasing the active pointer keeps a later session's tool calls from
    // landing on work that already stopped.
    if (event === "SessionEnd") {
        await withRunFileLock(baseDir, run.id, async () => {
            const fresh = (await readRun(baseDir, run.id)) || run;
            markIdle(fresh);
            await writeRun(baseDir, fresh);
        });
        await writeActive({ runId: null, stage: null, updatedAt: new Date().toISOString() });
        return;
    }

    // Backstop for a session left open at a human gate: telemetry is
    // session-wide, so unrelated later work in that session would otherwise be attributed
    // to a run nothing has touched for hours. A resumed run clears the stamp
    // through `update_stage` and attribution picks up again on its own.
    if (isIdle(run)) {
        await skipToTranscriptEnd(sessionId, telemetry, payload.transcript_path);
        return;
    }

    const stage = active.stage || null;
    let updated = telemetry;
    let pressure = null;

    if (event === "PostToolUse") {
        const name = payload.tool_name || "unknown";
        const stack = Array.isArray(telemetry.pendingTools[name]) ? telemetry.pendingTools[name] : [];
        const startedAt = stack.shift();
        telemetry.pendingTools[name] = stack;
        const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
        appendToolCall(run, {
            toolName: name,
            category: categorizeTool(name, payload.tool_input),
            durationMs,
            success: true,
            endedAt: new Date().toISOString(),
            mcpServerName: mcpServerFor(name),
            model: telemetry.lastModel || undefined,
            stageIndex: stage ? stage.index : null,
            stageName: stage ? stage.name : null,
        });
        // Where this call put its output, for the run's session title. Every write tool goes
        // through here, so the tally reflects the whole run rather than the scope a skill
        // declared for itself up front.
        await recordDestination(run, { toolName: name, input: payload.tool_input || {}, cwd: payload.cwd });
        // A Task/Agent call is the one place a hook learns which sub-agent ran, so it
        // doubles as the `subagent.completed` equivalent.
        if (AGENT_TOOLS.has(name)) {
            const input = payload.tool_input || {};
            appendAgentUse(run, {
                agentName: input.subagent_type || "subagent",
                agentDisplayName: input.subagent_type || input.description || "subagent",
                model: input.model || telemetry.lastModel || undefined,
                status: "completed",
                durationMs,
                endedAt: new Date().toISOString(),
                stageIndex: stage ? stage.index : null,
                stageName: stage ? stage.name : null,
            });
        }
        updated = await syncTranscript(run, telemetry, payload.transcript_path);
        // Ordered after the sync deliberately: the gauge is only as fresh as the usage
        // records that sync just folded in.
        pressure = evaluateContextPressure(run);
    } else if (event === "PreCompact") {
        recordCompaction(run, {
            reason: payload.trigger === "manual" ? "manual" : "threshold",
            currentTokens: run.context && run.context.currentTokens,
            at: new Date().toISOString(),
        });
        // The cursor is deliberately left alone: compaction appends to the transcript
        // rather than rewriting it, and resetting would re-count every message already
        // folded into this run. syncTranscript restarts on its own if the file shrinks
        // or the session moves to a different transcript.
        updated = telemetry;
    } else if (event === "Stop" || event === "SubagentStop" || event === "SessionStart") {
        updated = await syncTranscript(run, telemetry, payload.transcript_path);
    } else {
        return;
    }

    // The run is persisted before the warning is emitted: the latch that keeps a threshold
    // from re-announcing on every later tool call lives in the run file.
    //
    // This hook is its own process, so the server — or another hook, for a parallel tool
    // call — may have written the run while the transcript was being folded. Under the run's
    // file lock, re-read it and carry over only what this hook owns — insights, token usage,
    // the context gauge, the write destinations — so a stage the server just marked done is
    // never reverted by a stale copy. A field the hook writes and this list omits is dropped on
    // every call: the session title stayed null until destinations joined it. The fold above
    // stays outside the lock: it reads the transcript, which is slow.
    await withRunFileLock(baseDir, run.id, async () => {
        const fresh = await readRun(baseDir, run.id);
        const target = fresh || run;
        target.insights = run.insights;
        target.tokenUsage = run.tokenUsage;
        target.context = run.context;
        if (run.destinations) target.destinations = run.destinations;
        await writeRun(baseDir, target);
    });
    await writeTelemetry(sessionId, updated);
    if (pressure) emitContextPressure(pressure);
}

main().catch((err) => {
    process.stderr.write(`delivery-surface-dashboard telemetry: ${String((err && err.message) || err)}\n`);
    process.exit(0);
});
