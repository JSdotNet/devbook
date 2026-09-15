// Integration check for sub-agent token attribution, driving the telemetry hook the way
// Claude Code does: a payload on stdin, a run on disk, and transcripts in the layout the
// host actually writes.
//
// This exists because the failure it guards was silent for 65 recorded runs. Claude Code
// does not inline a sub-agent's messages into the root transcript — it writes them to a
// sibling directory keyed by session id:
//
//   <project>/<sessionId>.jsonl                   root transcript (named by the hook payload)
//   <project>/<sessionId>/subagents/agent-*.jsonl one file per delegated agent
//
// The hook read only the payload's path, so `isSidechain` entries were never anywhere it
// looked, `tokenUsage.subAgent` stayed at zero on runs that demonstrably delegated, and the
// one number that shows whether delegation is working always read "no delegation".
//
//   node dev/subagent-telemetry-test.mjs

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(SERVER_DIR, ".subagent-telemetry-test-state");
const WORK = path.join(SERVER_DIR, ".subagent-telemetry-test-transcripts");
rmSync(STATE, { recursive: true, force: true });
rmSync(WORK, { recursive: true, force: true });
mkdirSync(path.join(STATE, "runs"), { recursive: true });
mkdirSync(path.join(WORK, "sess", "subagents"), { recursive: true });

const ROOT_TRANSCRIPT = path.join(WORK, "sess.jsonl");
const SUB_A = path.join(WORK, "sess", "subagents", "agent-aaa.jsonl");
const SUB_B = path.join(WORK, "sess", "subagents", "agent-bbb.jsonl");
const RUN_ID = "run-subagent-test";
const RUN_FILE = path.join(STATE, "runs", `${RUN_ID}.json`);

const assistant = ({ model, out, cacheRead, cacheWrite = 0, input = 1, sidechain = false }) =>
    JSON.stringify({
        ...(sidechain ? { isSidechain: true } : {}),
        type: "assistant",
        message: {
            model,
            usage: {
                input_tokens: input,
                output_tokens: out,
                cache_read_input_tokens: cacheRead,
                cache_creation_input_tokens: cacheWrite,
            },
        },
    }) + "\n";

writeFileSync(
    RUN_FILE,
    JSON.stringify(
        {
            id: RUN_ID,
            skillId: "example-feature",
            title: "Sub-agent telemetry",
            status: "in_progress",
            stages: [{ name: "Validation", status: "in_progress" }],
            insights: [],
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        null,
        2,
    ),
    "utf8",
);
writeFileSync(
    path.join(STATE, "active.json"),
    JSON.stringify({ runId: RUN_ID, stage: { index: 0, name: "Validation" } }),
    "utf8",
);

// The owner session: two turns on the session model, at a realistic prompt size.
writeFileSync(
    ROOT_TRANSCRIPT,
    assistant({ model: "claude-opus-5", out: 100, cacheRead: 50_000, cacheWrite: 200 }) +
        assistant({ model: "claude-opus-5", out: 120, cacheRead: 60_000, cacheWrite: 300 }),
    "utf8",
);
// A delegated QA agent on the category model, in its own file.
writeFileSync(
    SUB_A,
    assistant({ model: "claude-sonnet-5", out: 500, cacheRead: 9_000, cacheWrite: 40, sidechain: true }) +
        assistant({ model: "claude-sonnet-5", out: 700, cacheRead: 11_000, cacheWrite: 60, sidechain: true }),
    "utf8",
);

// One short-lived process per hook event, exactly as Claude Code invokes it.
function runHook(event) {
    return spawnSync(process.execPath, [path.join(SERVER_DIR, "telemetry-hook.mjs")], {
        env: { ...process.env, DELIVERY_SURFACE_DASHBOARD_STATE_DIR: STATE },
        input: JSON.stringify({ session_id: "sess", hook_event_name: event, transcript_path: ROOT_TRANSCRIPT }),
        encoding: "utf8",
    });
}

const readRun = () => JSON.parse(readFileSync(RUN_FILE, "utf8"));

const checks = [];
const check = (label, ok, detail = "") => {
    checks.push(ok);
    console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

try {
    runHook("SubagentStop");
    let run = readRun();
    let usage = run.tokenUsage;

    check("root turns are counted", usage.total.modelCalls === 4, `modelCalls=${usage.total.modelCalls}`);
    check(
        "sub-agent turns are counted at all (the regression)",
        usage.subAgent.modelCalls === 2,
        `subAgent.modelCalls=${usage.subAgent.modelCalls}`,
    );
    check(
        "sub-agent output is attributed, not just its call count",
        usage.subAgent.outputTokens === 1200,
        `outputTokens=${usage.subAgent.outputTokens}`,
    );
    check(
        "the delegated model is visible on the run",
        usage.models.includes("claude-sonnet-5"),
        usage.models.join(","),
    );
    check(
        "the in-flight stage carries the sub-agent subtotal",
        usage.byStage["0"] && usage.byStage["0"].subAgent.modelCalls === 2,
        JSON.stringify(usage.byStage["0"] && usage.byStage["0"].subAgent.modelCalls),
    );

    // The gauge must stay a measure of the OWNER session: a sub-agent has its own window,
    // so its prompt size must never move the number that drives handoff.
    check(
        "the context gauge ignores sub-agent samples",
        run.context.currentTokens === 60_301,
        `currentTokens=${run.context.currentTokens}`,
    );

    // Re-running with nothing new must not double-count: cursors are per file.
    runHook("Stop");
    usage = readRun().tokenUsage;
    check(
        "a second sync does not double-count",
        usage.total.modelCalls === 4 && usage.subAgent.modelCalls === 2,
        `total=${usage.total.modelCalls} sub=${usage.subAgent.modelCalls}`,
    );

    // A growing sub-agent file and a newly spawned second agent must both be picked up.
    appendFileSync(SUB_A, assistant({ model: "claude-sonnet-5", out: 9, cacheRead: 1_000, sidechain: true }), "utf8");
    writeFileSync(SUB_B, assistant({ model: "claude-haiku-4-5", out: 20, cacheRead: 2_000, sidechain: true }), "utf8");
    runHook("SubagentStop");
    usage = readRun().tokenUsage;
    check(
        "an appended sub-agent turn is picked up incrementally",
        usage.subAgent.modelCalls === 4,
        `subAgent.modelCalls=${usage.subAgent.modelCalls}`,
    );
    check(
        "a second sub-agent file is discovered",
        usage.models.includes("claude-haiku-4-5"),
        usage.models.join(","),
    );

    // A run that goes active later must not absorb delegation that predates it.
    rmSync(path.join(STATE, "telemetry"), { recursive: true, force: true });
    writeFileSync(path.join(STATE, "active.json"), JSON.stringify({ runId: null, stage: null }), "utf8");
    runHook("SessionStart");
    const telemetry = JSON.parse(
        readFileSync(path.join(STATE, "telemetry", "sess.json"), "utf8"),
    );
    const skipped = Object.keys(telemetry.subAgentOffsets || {});
    check(
        "skip-to-end also skips sub-agent transcripts",
        skipped.length === 2 && skipped.every((f) => telemetry.subAgentOffsets[f] > 0),
        `${skipped.length} cursors`,
    );
} finally {
    rmSync(STATE, { recursive: true, force: true });
    rmSync(WORK, { recursive: true, force: true });
}

const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
