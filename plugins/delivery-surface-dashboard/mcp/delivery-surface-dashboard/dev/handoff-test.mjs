// Integration check for the session-handoff round trip, driving the MCP server over stdio
// the way Claude Code does: start a run, hand it off, end the session through the telemetry
// hook, then start_run again and confirm it reattaches instead of opening a duplicate.
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(SERVER_DIR, ".handoff-test-state");
rmSync(STATE, { recursive: true, force: true });
mkdirSync(STATE, { recursive: true });
const env = { ...process.env, DELIVERY_SURFACE_DASHBOARD_STATE_DIR: STATE };

const proc = spawn("node", [path.join(SERVER_DIR, "mcp-server.mjs")], { env, stdio: ["pipe", "pipe", "pipe"] });
proc.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

let buf = "";
const pending = new Map();
proc.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            continue;
        }
        if (msg.id !== undefined && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
        }
    }
});

let nextId = 1;
function rpc(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
        proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
        setTimeout(() => reject(new Error(`timeout on ${method}`)), 15000);
    });
}
const call = async (name, args) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.content && res.content.find((c) => c.type === "text");
    return text ? JSON.parse(text.text) : res;
};

const checks = [];
const check = (label, ok, detail = "") => {
    checks.push(ok);
    console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

try {
    await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "handoff-test", version: "0" } });
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    const started = await call("start_run", {
        skillId: "example-feature",
        title: "Handoff round trip",
        stages: [{ name: "Implementation" }, { name: "Build & Test" }, { name: "Personal Validation" }],
        changeKind: "new-functionality",
        sessionId: "s1",
    });
    const runId = started.runId;
    check("start_run creates a run", Boolean(runId) && started.resumed !== true);
    const first = JSON.parse(readFileSync(path.join(STATE, "runs", `${runId}.json`), "utf8"));
    check("start_run records the session id", JSON.stringify(first.sessionIds) === JSON.stringify(["s1"]), JSON.stringify(first.sessionIds));

    await call("update_stage", { runId, stageName: "Implementation", status: "in_progress" });

    const handed = await call("set_run_context", {
        runId,
        handoff: true,
        handoffNote: "Export endpoint written, tests not run yet. Resume with: the same skill and title",
    });
    check("set_run_context marks the handoff", handed.handoff && handed.handoff.pending === true, JSON.stringify(handed.handoff));
    check("handoff records the stage in flight", handed.handoff && handed.handoff.stage === "Implementation", handed.handoff && handed.handoff.stage);

    // The owning session ends: this is what stamps idleSince in real use.
    execFileSync("node", [path.join(SERVER_DIR, "telemetry-hook.mjs")], {
        env,
        input: JSON.stringify({ hook_event_name: "SessionEnd", session_id: "s1" }),
        encoding: "utf8",
    });
    const afterEnd = JSON.parse(readFileSync(path.join(STATE, "runs", `${runId}.json`), "utf8"));
    check("SessionEnd stamps the run idle", Boolean(afterEnd.idleSince));
    check("the handoff marker survives SessionEnd", afterEnd.handoff && afterEnd.handoff.pending === true);

    const listed = await call("list_runs", {});
    const row = (Array.isArray(listed) ? listed : listed.runs || []).find((r) => r.id === runId);
    check("list_runs reports it as idle and handed off", row && row.idle === true && row.handoffPending === true, row && JSON.stringify({ idle: row.idle, handoffPending: row.handoffPending }));

    // The fresh session: same skillId, same stage list.
    const resumed = await call("start_run", {
        skillId: "example-feature",
        title: "Handoff round trip",
        stages: [{ name: "Implementation" }, { name: "Build & Test" }, { name: "Personal Validation" }],
        sessionId: "s2",
    });
    check("start_run reattaches instead of duplicating", resumed.resumed === true && resumed.runId === runId, `resumed=${resumed.resumed} id=${resumed.runId}`);

    const live = JSON.parse(readFileSync(path.join(STATE, "runs", `${runId}.json`), "utf8"));
    check("reattach clears the idle stamp", !live.idleSince);
    check("reattach clears the pending flag but keeps the note", live.handoff && live.handoff.pending === false && live.handoff.note.includes("tests not run yet"));
    check("the handed-off stage is still in_progress", live.stages.find((s) => s.name === "Implementation").status === "in_progress");
    check("changeKind survived the handoff", live.changeKind === "new-functionality", live.changeKind);
    check("reattach appends the new session id beside the first", JSON.stringify(live.sessionIds) === JSON.stringify(["s1", "s2"]), JSON.stringify(live.sessionIds));

    await call("start_run", { skillId: "example-feature", title: "Handoff round trip", stages: [{ name: "Implementation" }], sessionId: "s2" });
    await call("start_run", { skillId: "example-feature", title: "Handoff round trip", stages: [{ name: "Implementation" }], sessionId: "${CLAUDE_SESSION_ID}" });
    const again = JSON.parse(readFileSync(path.join(STATE, "runs", `${runId}.json`), "utf8"));
    check("a repeated or unsubstituted session id is not recorded", JSON.stringify(again.sessionIds) === JSON.stringify(["s1", "s2"]), JSON.stringify(again.sessionIds));

    const all = await call("list_runs", {});
    check("no duplicate run was created", (Array.isArray(all) ? all : all.runs || []).length === 1);

    // An abandoned run must still be refused, or the marker means nothing.
    const other = await call("start_run", { skillId: "example-bug", title: "Abandoned", stages: [{ name: "Reproduce" }] });
    const otherFile = path.join(STATE, "runs", `${other.runId}.json`);
    const abandoned = JSON.parse(readFileSync(otherFile, "utf8"));
    abandoned.idleSince = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    writeFileSync(otherFile, JSON.stringify(abandoned, null, 2), "utf8");
    const fresh = await call("start_run", { skillId: "example-bug", title: "Abandoned", stages: [{ name: "Reproduce" }] });
    check("an abandoned run is still not reattached", fresh.resumed !== true && fresh.runId !== other.runId);
} finally {
    proc.kill();
    rmSync(STATE, { recursive: true, force: true });
}

const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
