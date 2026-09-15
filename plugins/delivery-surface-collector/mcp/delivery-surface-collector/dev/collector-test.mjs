// Integration check for the headless surface, driving the MCP server over stdio the way a
// host does: the declared tool surface, a run recorded end to end, the handoff round trip a
// resumed session depends on, and the report written from what was recorded.
//
//   node dev/collector-test.mjs

import { spawn } from "node:child_process";
import { readFileSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(SERVER_DIR, ".collector-test-state");
rmSync(STATE, { recursive: true, force: true });
mkdirSync(STATE, { recursive: true });

const proc = spawn("node", [path.join(SERVER_DIR, "mcp-server.mjs")], {
    env: { ...process.env, DELIVERY_SURFACE_COLLECTOR_STATE_DIR: STATE },
    stdio: ["pipe", "pipe", "pipe"],
});
proc.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

let buffer = "";
let nextId = 1;
const pending = new Map();
proc.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            continue;
        }
        const waiter = pending.get(msg.id);
        if (waiter) {
            pending.delete(msg.id);
            waiter(msg);
        }
    }
});

function rpc(method, params) {
    const id = nextId++;
    return new Promise((resolve) => {
        pending.set(id, resolve);
        proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
}

async function call(name, args = {}) {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.result?.content?.[0]?.text ?? "";
    if (res.result?.isError) throw new Error(text);
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

let failures = 0;
function check(label, ok, detail = "") {
    if (!ok) failures++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

try {
    const init = await rpc("initialize", { protocolVersion: "2025-06-18" });
    check("the server identifies itself", init.result.serverInfo.name === "delivery-surface-collector", init.result.serverInfo.name);

    const names = (await rpc("tools/list")).result.tools.map((t) => t.name);
    check(
        "it declares the lifecycle and export capabilities",
        names.join(",") === "open_dashboard,start_run,record_prompt,set_run_context,update_stage,finish_run,list_runs,get_run,export_report",
        names.join(", ")
    );
    check("and declares neither render tool", !names.includes("render_diagram") && !names.includes("render_markdown"));

    const open = await call("open_dashboard");
    check("open_dashboard reports headless with no URL to open", open.headless === true && open.dashboardUrl === null);
    check("it names where runs are recorded", typeof open.runsDir === "string" && open.runsDir.includes("runs"), open.runsDir);

    const run = await call("start_run", {
        skillId: "example-feature",
        title: "Export endpoint",
        stages: [{ name: "Scope" }, { name: "Implementation" }, { name: "Validation" }, { name: "Work Item Update" }, { name: "Summary" }],
        originalPrompt: "add the export endpoint",
        changeKind: "new-functionality",
    });
    check("start_run records a run", Boolean(run.runId) && run.resumed === false, run.runId);
    check("it hands back no session title, because it observes no writes", run.sessionTitle === null);

    await call("record_prompt", { runId: run.runId, prompt: "also cover the CSV case" });
    const withPrompt = await call("get_run", { runId: run.runId });
    check("a follow-up prompt joins the history", withPrompt.promptHistory.length === 2, withPrompt.promptHistory.map((p) => p.kind).join(", "));

    await call("update_stage", { runId: run.runId, stageName: "Scope", status: "in_progress" });
    await call("update_stage", { runId: run.runId, stageName: "Scope", status: "done", output: "Two endpoints, one migration." });
    await call("update_stage", { runId: run.runId, stageName: "Implementation", status: "in_progress" });
    await call("update_stage", { runId: run.runId, stageName: "Implementation", status: "done", output: "First pass." });
    await call("update_stage", { runId: run.runId, stageName: "Implementation", status: "in_progress" });
    await call("update_stage", { runId: run.runId, stageName: "Implementation", status: "done", output: "Repaired after review." });
    const repeated = await call("get_run", { runId: run.runId });
    const implementation = repeated.stages.find((s) => s.name === "Implementation");
    check("a repeated stage stays visible as repeated", implementation.doneCount === 2, `doneCount=${implementation.doneCount}`);
    check("a finished stage carries its duration", Number.isFinite(implementation.durationMs));

    await call("update_stage", {
        runId: run.runId,
        stageName: "Validation",
        status: "done",
        output: "Two scenarios.",
        scenarios: [
            { name: "exports a CSV", status: "pass", notes: "", evidence: [{ type: "screenshot", path: ".wip/qa/export.png" }] },
            { name: "rejects an empty range", status: "fail", notes: "500 instead of 400" },
        ],
        monitoring: { summary: "One unhandled exception.", findings: [{ level: "error", resource: "api", message: "NullReference in ExportController" }] },
    });
    const qa = (await call("get_run", { runId: run.runId })).stages.find((s) => s.name === "Validation");
    check("QA scenarios and their evidence are recorded", qa.scenarios.length === 2 && qa.scenarios[0].evidence[0].path === ".wip/qa/export.png");
    check("monitoring findings are recorded", qa.monitoring.findings[0].level === "error");

    const context = await call("set_run_context", { runId: run.runId, approval: "approved", approvalNote: "Ship it." });
    check("the gate decision is persisted, gate-agnostically", context.approval.state === "approved", JSON.stringify(context.approval));

    // --- the handoff round trip ---------------------------------------------
    await call("update_stage", { runId: run.runId, stageName: "Summary", status: "in_progress" });
    const handed = await call("set_run_context", { runId: run.runId, handoff: true, handoffNote: "Summary half written. Resume with the same skill." });
    check("a handoff records the stage in flight", handed.handoff.pending === true && handed.handoff.stage === "Summary", handed.handoff.stage);

    const resumed = await call("start_run", { skillId: "example-feature", title: "Export endpoint", stages: [{ name: "Scope" }] });
    check("start_run reattaches instead of duplicating", resumed.resumed === true && resumed.runId === run.runId, resumed.runId);
    const afterResume = await call("get_run", { runId: run.runId });
    check("reattach clears the pending flag but keeps the note", afterResume.handoff.pending === false && Boolean(afterResume.handoff.note));
    check("the handed-off stage is still in flight", afterResume.stages.find((s) => s.name === "Summary").status === "in_progress");
    check("the stage list survived the reattach", afterResume.stages.length === 5, `${afterResume.stages.length} stages`);
    const runs = await call("list_runs");
    check("no duplicate run was opened", runs.length === 1, `${runs.length} runs`);

    await call("finish_run", { runId: run.runId, status: "done", summary: "Endpoint shipped; one QA failure outstanding." });
    check("the run closes", (await call("list_runs"))[0].status === "done");

    // --- export --------------------------------------------------------------
    const report = await call("export_report", { runId: run.runId });
    const markdown = readFileSync(report.path, "utf8");
    check("export_report writes Markdown", report.format === "md" && markdown.startsWith("# Export endpoint"), report.path);
    check("the report carries the prompt history", markdown.includes("also cover the CSV case"));
    check("the report carries stage output", markdown.includes("Repaired after review."));
    check("the report carries QA evidence by path", markdown.includes(".wip/qa/export.png"));
    check("the report carries the monitoring finding", markdown.includes("NullReference in ExportController"));
    check("the report carries the gate decision", markdown.includes("**Approval:** approved"));
    check("the report ends with the summary", markdown.includes("Endpoint shipped"));
    check("a stage with no work item is hidden", !markdown.includes("Work Item Update"));

    const html = await call("export_report", { runId: run.runId, format: "html" });
    check("another format still writes Markdown and says so", html.format === "md" && Boolean(html.note), html.note);

    let missing = "";
    try {
        await call("get_run", { runId: "run-nope" });
    } catch (err) {
        missing = err.message;
    }
    check("an unknown run is an error, not an empty answer", /No run with id/.test(missing), missing);
} finally {
    proc.kill();
    rmSync(STATE, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall passing");
process.exit(failures ? 1 : 0);
