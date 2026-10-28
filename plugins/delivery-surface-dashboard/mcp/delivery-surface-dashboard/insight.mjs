// Tool-activity insight tracking for delivery-surface-dashboard runs.
//
// `telemetry-hook.mjs` observes the session's own tool activity (Claude Code's
// PreToolUse/PostToolUse hooks) while a run is active and buckets each call
// into broad categories (Shell, Edit, Read, QA, MCP tool, Agent tasks,
// Other). This gives every run a "time by tool" and elapsed/thinking-time
// breakdown without requiring the driving agent to self-report every
// tool call.
//
// It also records sub-agent invocations (the Task/Agent tool, whose input
// names the sub-agent type) so each run additionally records which agent(s),
// MCP server(s), and model(s) actually did the work, both overall and broken
// down per stage (attributed to whichever stage was `in_progress` when the
// call ran — see `active.json` in state.mjs). This complements the `agents[]`
// declared up front in `start_run`, which only records intent, not what
// actually ran.
//
// Caveat: tool telemetry is session-wide, not run-scoped, so any tool call
// that happens while a run's status is "in_progress" is attributed to it —
// including calls unrelated to the run if the user does other
// work in the same session concurrently.

// It additionally observes the session's context-window telemetry (the
// per-message `usage` records in the session transcript, plus the PreCompact
// hook) to answer two different questions:
//
//   1. "Which phase is the context hog?" — per-stage token *deltas*: the
//      tokens actually consumed by model calls that completed while a stage
//      was `in_progress` (see `recordTokenUsage`). A delta is used rather
//      than an absolute `currentTokens` sample at the stage boundary,
//      because compaction can reset the absolute figure mid-stage and make
//      boundary sampling meaningless.
//   2. "Am I about to get compacted mid-run?" — a run-level live
//      gauge of the latest `currentTokens` / `tokenLimit`, its component
//      breakdown, the peak observed, and how often compaction/truncation
//      has fired (see `recordContextSample` / `recordCompaction` /
//      `recordTruncation`).
//
// The same session-wide caveat below applies to these numbers too.

import { effectiveEndedAtMs } from "./idle.mjs";

const MAX_TOOL_CALLS_PER_RUN = 1000;
// Compaction/truncation events are rare compared to tool calls, but the
// arrays are still capped so a very long-running run can't grow the run
// file without bound (mirrors MAX_TOOL_CALLS_PER_RUN for run.insights).
const MAX_CONTEXT_EVENTS_PER_RUN = 100;

// Claude Code and GitHub Copilot name the same capabilities differently, so both
// vocabularies are listed: the rules stay valid whichever host produced the run file.
// Ordering matters — QA is checked before the generic MCP rule so browser/Aspire
// activity gets its own bucket in the breakdown.
// Aspire MCP tool names, current (list_*) and legacy (get_*): the server renamed these
// and a run file may hold either spelling. Plugin-provided servers arrive prefixed
// (mcp__plugin_qa_aspire__*), which the 'aspire' alternative already covers.
const ASPIRE_TOOLS = "^list_resources$|^list_structured_logs$|^list_console_logs$|^list_traces$|^list_trace_structured_logs$|^execute_resource_command$|^get_resources$|^get_resource_logs$|^get_traces$|^get_metrics$|^get_console_logs$";

const CATEGORY_RULES = [
    { category: "Shell", test: /powershell|bash|shell/i },
    { category: "Edit", test: /^edit$|^create$|^write$|^notebookedit$|^multiedit$/i },
    { category: "Read", test: /^view$|^read$|^glob$|^grep$|^webfetch$|^websearch$/i },
    {
        category: "QA (Playwright/Aspire)",
        test: new RegExp(`^browser_|playwright|aspire|${ASPIRE_TOOLS}`, "i"),
    },
    { category: "MCP tool", test: /mcpserver|mcp[_-]/i },
    { category: "Agent tasks", test: /^task$|^agent$|^skill$|^workflow$/i },
];

// The Playwright CLI runs through the shell, so its calls are told apart by command.
const PLAYWRIGHT_CLI = /(^|[\s;&|(])(npx\s+(-y\s+)?)?(playwright-cli|@playwright\/cli)\b/;

export function categorizeTool(toolName, input) {
    const name = toolName || "unknown";
    if (/powershell|bash|shell/i.test(name) && PLAYWRIGHT_CLI.test(String(input?.command ?? ""))) {
        return "QA (Playwright/Aspire)";
    }
    for (const rule of CATEGORY_RULES) {
        if (rule.test.test(name)) return rule.category;
    }
    return "Other";
}

// entry: { kind: "tool", toolName, category, durationMs, success, endedAt,
//   stageIndex, stageName, mcpServerName?, model? }
export function appendToolCall(run, entry) {
    run.insights = Array.isArray(run.insights) ? run.insights : [];
    run.insights.push({ kind: "tool", ...entry });
    if (run.insights.length > MAX_TOOL_CALLS_PER_RUN) {
        run.insights.splice(0, run.insights.length - MAX_TOOL_CALLS_PER_RUN);
    }
}

// entry: { kind: "agent", agentName, agentDisplayName, model, status:
//   "completed"|"failed", durationMs, totalTokens, totalToolCalls, endedAt,
//   stageIndex, stageName }. Recorded from subagent.completed/subagent.failed
// so the dashboard can show which custom agent(s) and model(s) actually ran
// a stage, alongside the MCP servers observed via appendToolCall.
export function appendAgentUse(run, entry) {
    run.insights = Array.isArray(run.insights) ? run.insights : [];
    run.insights.push({ kind: "agent", ...entry });
    if (run.insights.length > MAX_TOOL_CALLS_PER_RUN) {
        run.insights.splice(0, run.insights.length - MAX_TOOL_CALLS_PER_RUN);
    }
}

const TOKEN_FIELDS = ["inputTokens", "outputTokens", "reasoningTokens", "cacheReadTokens", "cacheWriteTokens"];

function emptyBucket() {
    const bucket = { modelCalls: 0 };
    for (const field of TOKEN_FIELDS) bucket[field] = 0;
    return bucket;
}

function addToBucket(bucket, entry) {
    bucket.modelCalls += 1;
    for (const field of TOKEN_FIELDS) {
        bucket[field] += Math.max(0, Number(entry[field]) || 0);
    }
}

function normalizeBucket(bucket) {
    const normalized = emptyBucket();
    if (!bucket || typeof bucket !== "object") return normalized;
    normalized.modelCalls = Math.max(0, Number(bucket.modelCalls) || 0);
    for (const field of TOKEN_FIELDS) {
        normalized[field] = Math.max(0, Number(bucket[field]) || 0);
    }
    return normalized;
}

function billableTokens(bucket) {
    // Input + output are the tokens that actually consume the context window
    // for the next call. Reasoning tokens are a subset of output tokens (they
    // are reported separately by the provider) and cache read/write counts
    // describe how the input was served, so neither is added again here —
    // both are surfaced on their own instead.
    return (Number(bucket.inputTokens) || 0) + (Number(bucket.outputTokens) || 0);
}

function uncachedTokens(bucket) {
    // `inputTokens` counts the whole prompt, most of which is usually served
    // from the prompt cache on later turns — which is why a stage total can
    // legitimately exceed the model's context window. This is the "fresh"
    // remainder: the tokens the stage actually pushed through the model on
    // top of cache reads.
    const input = Number(bucket.inputTokens) || 0;
    const cached = Number(bucket.cacheReadTokens) || 0;
    return Math.max(0, input - cached) + (Number(bucket.outputTokens) || 0);
}

// entry: { inputTokens, outputTokens, reasoningTokens, cacheReadTokens,
//   cacheWriteTokens, model, isSubAgent, stageIndex, stageName }.
//
// Sub-agent rule: usage carrying an `agentId` (Task-tool / custom-agent work)
// is folded into the parent stage total — the delegated work is still part of
// what the stage cost — but is ALSO accumulated into a separate `subAgent`
// subtotal at both run and stage level, so it stays visible that the cost came
// from delegated work rather than the main conversation.
export function recordTokenUsage(run, entry) {
    if (!entry) return;
    const usage = run.tokenUsage && typeof run.tokenUsage === "object" ? run.tokenUsage : {};
    usage.total = normalizeBucket(usage.total);
    usage.subAgent = normalizeBucket(usage.subAgent);
    usage.byStage = usage.byStage && typeof usage.byStage === "object" ? usage.byStage : {};
    usage.models = Array.isArray(usage.models) ? usage.models : [];

    addToBucket(usage.total, entry);
    if (entry.isSubAgent) addToBucket(usage.subAgent, entry);
    if (entry.model && !usage.models.includes(entry.model)) usage.models.push(entry.model);

    if (entry.stageIndex !== null && entry.stageIndex !== undefined) {
        const key = String(entry.stageIndex);
        const existing = usage.byStage[key] || {};
        const stage = {
            stageName: entry.stageName || existing.stageName || "",
            total: normalizeBucket(existing.total),
            subAgent: normalizeBucket(existing.subAgent),
        };
        addToBucket(stage.total, entry);
        if (entry.isSubAgent) addToBucket(stage.subAgent, entry);
        usage.byStage[key] = stage;
    }
    usage.updatedAt = new Date().toISOString();
    run.tokenUsage = usage;
}

// sample: { currentTokens, tokenLimit, messagesLength, conversationTokens,
//   systemTokens, toolDefinitionsTokens }. Only root-agent samples should be
// passed in: a sub-agent runs its own separate context window, so mixing its
// samples into the run gauge would make the "how close am I to compaction?"
// signal jump around meaninglessly.
export function recordContextSample(run, sample) {
    if (!sample || !Number.isFinite(Number(sample.currentTokens))) return;
    const ctx = run.context && typeof run.context === "object" ? run.context : {};
    const currentTokens = Math.max(0, Number(sample.currentTokens));
    ctx.currentTokens = currentTokens;
    if (Number.isFinite(Number(sample.tokenLimit)) && Number(sample.tokenLimit) > 0) {
        ctx.tokenLimit = Number(sample.tokenLimit);
    }
    // A prompt the model actually read is proof of a window at least that large. Trusting a
    // stated limit over an observed sample is what pins the gauge above 100% for a whole
    // run, which silently disables the pressure ladder (every threshold crosses at once on
    // the first sample, then latches). The observation wins.
    if (Number.isFinite(Number(ctx.tokenLimit)) && currentTokens > Number(ctx.tokenLimit)) {
        ctx.tokenLimit = currentTokens;
        ctx.tokenLimitInferred = true;
    }
    for (const field of ["messagesLength", "conversationTokens", "systemTokens", "toolDefinitionsTokens"]) {
        if (Number.isFinite(Number(sample[field]))) ctx[field] = Number(sample[field]);
    }
    ctx.peakTokens = Math.max(Number(ctx.peakTokens) || 0, currentTokens);
    ctx.sampledAt = new Date().toISOString();
    run.context = ctx;
}

function pushCapped(list, entry) {
    list.push(entry);
    if (list.length > MAX_CONTEXT_EVENTS_PER_RUN) {
        list.splice(0, list.length - MAX_CONTEXT_EVENTS_PER_RUN);
    }
    return list;
}

// entry: { reason, currentTokens, tokenLimit, at }
export function recordCompaction(run, entry) {
    const ctx = run.context && typeof run.context === "object" ? run.context : {};
    ctx.compactions = pushCapped(Array.isArray(ctx.compactions) ? ctx.compactions : [], {
        reason: (entry && entry.reason) || "unknown",
        currentTokens: Number.isFinite(Number(entry && entry.currentTokens)) ? Number(entry.currentTokens) : null,
        at: (entry && entry.at) || new Date().toISOString(),
    });
    run.context = ctx;
}

// entry: { preTokens, postTokens, removedTokens, tokenLimit, at }
export function recordTruncation(run, entry) {
    const ctx = run.context && typeof run.context === "object" ? run.context : {};
    ctx.truncations = pushCapped(Array.isArray(ctx.truncations) ? ctx.truncations : [], {
        preTokens: Number.isFinite(Number(entry && entry.preTokens)) ? Number(entry.preTokens) : null,
        postTokens: Number.isFinite(Number(entry && entry.postTokens)) ? Number(entry.postTokens) : null,
        removedTokens: Number.isFinite(Number(entry && entry.removedTokens)) ? Number(entry.removedTokens) : null,
        at: (entry && entry.at) || new Date().toISOString(),
    });
    run.context = ctx;
}

// Run-level context pressure thresholds.
//
// `recordContextSample` keeps a live gauge of how full the owner session's context window
// is, so the agent driving the run can escalate as that gauge fills. Prose alone leaves the
// noticing to the agent, which is exactly what gets
// missed in a long run; these thresholds let the telemetry hook say it out loud on the tool
// call that crosses one.
//
// Each threshold fires once per crossing, latched in `context.pressureNotified`. The latch
// clears when the gauge falls back below a threshold — with a hysteresis band so a sample
// oscillating on a boundary cannot re-announce — which is what lets the same run warn again
// after a compaction or a session handoff has reset its context.
const PRESSURE_HYSTERESIS_PCT = 5;

export const CONTEXT_PRESSURE_THRESHOLDS = [
    {
        pct: 60,
        level: "delegate",
        action:
            "Delegate the next heavy step -- broad exploration, a large refactor, verbose build or test output -- " +
            "to a sub-agent in the same worktree. The gauge ignores sub-agent samples, so this genuinely relieves " +
            "this session's context rather than relabelling the cost.",
    },
    {
        pct: 75,
        level: "prepare-handoff",
        action:
            "Prepare a session handoff: persist every decision that gates a later phase with set_run_context, " +
            "finish the stage in flight, and start no further heavy stage inline.",
    },
    {
        pct: 85,
        level: "hand-off",
        action:
            "Hand off now: set_run_context with handoff true and a handoffNote holding the resume invocation, " +
            "leave the stage in flight in_progress, hand the invocation to the user, and end this session so the " +
            "run continues in a fresh context instead of being compacted mid-run. The marked run is what the " +
            "next session reattaches to, so the brief it needs belongs in the handoffNote.",
    },
];

// Returns the threshold this sample just crossed, or null when the gauge is unreadable or
// nothing new was crossed. Mutates `run.context.pressureNotified`, so the caller must
// persist the run for the latch to hold.
export function evaluateContextPressure(run) {
    const ctx = run && run.context && typeof run.context === "object" ? run.context : null;
    if (!ctx) return null;
    const currentTokens = Number(ctx.currentTokens);
    const tokenLimit = Number(ctx.tokenLimit);
    if (!Number.isFinite(currentTokens) || !Number.isFinite(tokenLimit) || tokenLimit <= 0) return null;
    const pct = (currentTokens / tokenLimit) * 100;

    // Drop latches that now sit well above the gauge: the context shrank (compaction, or a
    // handoff into a fresh session continuing the same run) and those thresholds are live again.
    const notified = new Set(
        (Array.isArray(ctx.pressureNotified) ? ctx.pressureNotified : [])
            .map(Number)
            .filter((value) => Number.isFinite(value) && value <= pct + PRESSURE_HYSTERESIS_PCT),
    );

    // A sample can jump past more than one threshold at once. Announce the most urgent one
    // and latch every threshold it passed, so the milder ones do not fire afterwards.
    let crossed = null;
    for (const threshold of CONTEXT_PRESSURE_THRESHOLDS) {
        if (pct < threshold.pct) continue;
        if (!notified.has(threshold.pct)) crossed = threshold;
        notified.add(threshold.pct);
    }

    ctx.pressureNotified = [...notified].sort((a, b) => a - b);
    run.context = ctx;
    if (!crossed) return null;
    return {
        level: crossed.level,
        thresholdPct: crossed.pct,
        pct: Math.round(pct),
        currentTokens,
        tokenLimit,
        action: crossed.action,
    };
}

// Aggregates the context/token state recorded above into a shape the
// dashboard and report can render directly. Runs created before context
// tracking existed simply have no `context`/`tokenUsage` fields; this returns
// `null` for them so every caller can omit the section entirely.
export function summarizeContext(run) {
    const ctx = run && run.context && typeof run.context === "object" ? run.context : null;
    const usage = run && run.tokenUsage && typeof run.tokenUsage === "object" ? run.tokenUsage : null;
    if (!ctx && !usage) return null;

    let gauge = null;
    if (ctx && Number.isFinite(Number(ctx.currentTokens))) {
        const currentTokens = Number(ctx.currentTokens);
        const tokenLimit = Number.isFinite(Number(ctx.tokenLimit)) && Number(ctx.tokenLimit) > 0 ? Number(ctx.tokenLimit) : null;
        gauge = {
            currentTokens,
            tokenLimit,
            percent: tokenLimit ? Math.min(100, Math.round((currentTokens / tokenLimit) * 100)) : null,
            peakTokens: Number.isFinite(Number(ctx.peakTokens)) ? Number(ctx.peakTokens) : currentTokens,
            peakPercent:
                tokenLimit && Number.isFinite(Number(ctx.peakTokens))
                    ? Math.min(100, Math.round((Number(ctx.peakTokens) / tokenLimit) * 100))
                    : null,
            systemTokens: Number.isFinite(Number(ctx.systemTokens)) ? Number(ctx.systemTokens) : null,
            conversationTokens: Number.isFinite(Number(ctx.conversationTokens)) ? Number(ctx.conversationTokens) : null,
            toolDefinitionsTokens: Number.isFinite(Number(ctx.toolDefinitionsTokens)) ? Number(ctx.toolDefinitionsTokens) : null,
            messagesLength: Number.isFinite(Number(ctx.messagesLength)) ? Number(ctx.messagesLength) : null,
            sampledAt: ctx.sampledAt || null,
        };
    }

    const compactions = ctx && Array.isArray(ctx.compactions) ? ctx.compactions : [];
    const truncations = ctx && Array.isArray(ctx.truncations) ? ctx.truncations : [];
    const compactionReasons = {};
    for (const c of compactions) {
        const reason = c && c.reason ? c.reason : "unknown";
        compactionReasons[reason] = (compactionReasons[reason] || 0) + 1;
    }

    const total = normalizeBucket(usage && usage.total);
    const subAgent = normalizeBucket(usage && usage.subAgent);
    const perStage = {};
    const byStage = usage && usage.byStage && typeof usage.byStage === "object" ? usage.byStage : {};
    for (const [key, value] of Object.entries(byStage)) {
        const stageTotal = normalizeBucket(value && value.total);
        const stageSubAgent = normalizeBucket(value && value.subAgent);
        perStage[key] = {
            stageName: (value && value.stageName) || "",
            ...stageTotal,
            tokens: billableTokens(stageTotal),
            uncachedTokens: uncachedTokens(stageTotal),
            subAgent: { ...stageSubAgent, tokens: billableTokens(stageSubAgent), uncachedTokens: uncachedTokens(stageSubAgent) },
        };
    }

    const hasUsage = total.modelCalls > 0;
    if (!gauge && !hasUsage && !compactions.length && !truncations.length) return null;

    return {
        gauge,
        totals: hasUsage ? { ...total, tokens: billableTokens(total), uncachedTokens: uncachedTokens(total) } : null,
        subAgentTotals:
            hasUsage && subAgent.modelCalls > 0
                ? { ...subAgent, tokens: billableTokens(subAgent), uncachedTokens: uncachedTokens(subAgent) }
                : null,
        perStage,
        models: usage && Array.isArray(usage.models) ? usage.models.slice().sort() : [],
        compactionCount: compactions.length,
        compactionReasons,
        truncationCount: truncations.length,
        truncatedTokens: truncations.reduce((sum, t) => sum + (Number(t && t.removedTokens) || 0), 0),
    };
}

function addToSet(map, key, value) {
    if (!value) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
}

// Aggregates the raw per-call log into totals the dashboard/report can
// render directly: total calls, total measured tool time, wall-clock
// elapsed time, an estimated "thinking" remainder, time by category, and
// which agents/MCP servers/models were observed — overall and per stage.
export function summarizeInsights(run) {
    const entries = Array.isArray(run.insights) ? run.insights : [];
    // Entries persisted before this field existed have no `kind`; treat them
    // as tool calls for backward compatibility with older run files.
    const toolCalls = entries.filter((e) => e.kind !== "agent");
    const agentCalls = entries.filter((e) => e.kind === "agent");

    const byCategory = {};
    let totalToolMs = 0;
    for (const call of toolCalls) {
        const ms = Number(call.durationMs) || 0;
        byCategory[call.category] = (byCategory[call.category] || 0) + ms;
        totalToolMs += ms;
    }
    const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : null;
    // Not `Date.now()` for an in_progress run: one abandoned at a human
    // gate would otherwise report every idle hour since as elapsed run time.
    const endedAt = effectiveEndedAtMs(run);
    const elapsedMs = startedAt !== null && endedAt !== null ? Math.max(0, endedAt - startedAt) : null;
    const thinkingMs = elapsedMs !== null ? Math.max(0, elapsedMs - totalToolMs) : null;

    const agentsUsed = new Set();
    const mcpServersUsed = new Set();
    const modelsUsed = new Set();
    const perStageAgents = new Map();
    const perStageMcp = new Map();
    const perStageModels = new Map();
    const stageNames = new Map();

    for (const call of toolCalls) {
        if (call.mcpServerName) mcpServersUsed.add(call.mcpServerName);
        if (call.model) modelsUsed.add(call.model);
        if (call.stageIndex === null || call.stageIndex === undefined) continue;
        stageNames.set(call.stageIndex, call.stageName || stageNames.get(call.stageIndex));
        addToSet(perStageMcp, call.stageIndex, call.mcpServerName);
        addToSet(perStageModels, call.stageIndex, call.model);
    }
    for (const call of agentCalls) {
        const agentLabel = call.agentDisplayName || call.agentName;
        if (agentLabel) agentsUsed.add(agentLabel);
        if (call.model) modelsUsed.add(call.model);
        if (call.stageIndex === null || call.stageIndex === undefined) continue;
        stageNames.set(call.stageIndex, call.stageName || stageNames.get(call.stageIndex));
        addToSet(perStageAgents, call.stageIndex, agentLabel);
        addToSet(perStageModels, call.stageIndex, call.model);
    }

    const perStage = {};
    for (const stageIndex of stageNames.keys()) {
        perStage[stageIndex] = {
            stageName: stageNames.get(stageIndex) || "",
            agents: Array.from(perStageAgents.get(stageIndex) || []).sort(),
            mcpServers: Array.from(perStageMcp.get(stageIndex) || []).sort(),
            models: Array.from(perStageModels.get(stageIndex) || []).sort(),
        };
    }

    return {
        totalCalls: toolCalls.length,
        totalToolMs,
        elapsedMs,
        thinkingMs,
        byCategory,
        agentsUsed: Array.from(agentsUsed).sort(),
        mcpServersUsed: Array.from(mcpServersUsed).sort(),
        modelsUsed: Array.from(modelsUsed).sort(),
        perStage,
    };
}
