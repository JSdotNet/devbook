// End-to-end check for session naming, driving the real MCP server over stdio and the real
// telemetry hook as a child process the way Claude Code does: start a run, feed it write tool
// calls as hook payloads, and confirm update_stage hands back the name the writes earned.
//
// The unit test covers the classification rules; this one covers the wiring between them —
// that the hook's PostToolUse payload actually reaches the run file, and that the server reads
// it back off the same run.
import { spawn, execFileSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(SERVER_DIR, ".session-title-test-state");
const WORKTREE = path.join(STATE, "worktree");
rmSync(STATE, { recursive: true, force: true });
mkdirSync(path.join(WORKTREE, ".devbook", "domain", "order-management"), { recursive: true });
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
    return new Promise((resolve) => {
        pending.set(id, resolve);
        proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
}
async function callTool(name, args) {
    const res = await rpc("tools/call", { name, arguments: args });
    const text = res.result && res.result.content && res.result.content[0] && res.result.content[0].text;
    return text ? JSON.parse(text) : res.result;
}

// One tool call as Claude Code would report it: PreToolUse to open the timer, PostToolUse to
// close it. Only PostToolUse carries the destination.
function toolCall(toolName, toolInput) {
    for (const hook_event_name of ["PreToolUse", "PostToolUse"]) {
        execFileSync("node", [path.join(SERVER_DIR, "telemetry-hook.mjs")], {
            env,
            input: JSON.stringify({
                hook_event_name,
                session_id: "s1",
                cwd: WORKTREE,
                tool_name: toolName,
                tool_input: toolInput,
            }),
            encoding: "utf8",
        });
    }
}

let failures = 0;
function check(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) failures++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected: ${expected}\n        actual:   ${actual}`}`);
}

await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } });

const started = await callTool("start_run", {
    skillId: "example-feature",
    title: "Partial shipment rounding",
    stages: [{ name: "Implement" }, { name: "Summary" }],
});
const runId = started.runId;
check("a fresh run is not named yet", started.sessionTitle, null);

// Nothing has been written, so the first stage transition still has nothing to go on.
const beforeWrites = await callTool("update_stage", { runId, stageName: "Implement", status: "in_progress" });
check("no writes, no rename", beforeWrites.sessionTitle, null);

toolCall("Read", { file_path: "src/OrderManagement/Shipment.cs" });
const afterRead = await callTool("update_stage", { runId, stageName: "Implement", status: "in_progress" });
check("reading still earns no name", afterRead.sessionTitle, null);

toolCall("Edit", { file_path: path.join(WORKTREE, "src", "OrderManagement", "Shipment.cs") });
toolCall("Edit", { file_path: "src/OrderManagement/Rounding.cs" });
const afterCode = await callTool("update_stage", { runId, stageName: "Implement", status: "done", output: "done" });
check("code writes name the run and resolve the boundary", afterCode.sessionTitle, "code:order-management — Partial shipment rounding");

// Documentation drift updates one devbook chapter — not enough to outweigh two code files.
toolCall("Edit", { file_path: ".devbook/domain/order-management/domain.md" });
const afterDrift = await callTool("update_stage", { runId, stageName: "Summary", status: "in_progress" });
check("one drift edit does not flip the prefix", afterDrift.sessionTitle, "code:order-management — Partial shipment rounding");

// Publishing an artifact does.
toolCall("Artifact", { file_path: "report.html" });
const afterArtifact = await callTool("update_stage", { runId, stageName: "Summary", status: "done", output: "done" });
check("a published artifact takes over", afterArtifact.sessionTitle, "artifact — Partial shipment rounding");

// A resumed run must come back already named, or the new session would rename to null.
await callTool("set_run_context", { runId, handoff: true, handoffNote: "paused" });
execFileSync("node", [path.join(SERVER_DIR, "telemetry-hook.mjs")], {
    env,
    input: JSON.stringify({ hook_event_name: "SessionEnd", session_id: "s1" }),
    encoding: "utf8",
});
const resumed = await callTool("start_run", {
    skillId: "example-feature",
    title: "Partial shipment rounding",
    stages: [{ name: "Implement" }, { name: "Summary" }],
});
check("the run reattached", resumed.resumed, true);
check("a resumed run is already named", resumed.sessionTitle, "artifact — Partial shipment rounding");

proc.kill();
rmSync(STATE, { recursive: true, force: true });
console.log(failures ? `\n${failures} failing` : "\nall passing");
process.exit(failures ? 1 : 0);
