// Drives the real server over stdio the way a host does, against a fake Backlog endpoint:
// forwarding with the bearer token, where the port and token come from, Backlog not
// listening, and what is refused without asking Backlog at all.
//
//   node --test dev/proxy-test.mjs

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_PORT, resolveEndpoint } from "../backlog-client.mjs";

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "mcp-server.mjs");
const LIFECYCLE = ["open_dashboard", "start_run", "record_prompt", "set_run_context", "update_stage", "finish_run", "list_runs", "get_run"];

/** A stand-in for Backlog's /mcp: records every request and answers like the app does. */
async function fakeBacklog({ tools = LIFECYCLE, sse = false, sessionId = null } = {}) {
    const requests = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const msg = JSON.parse(body);
            requests.push({ url: req.url, headers: req.headers, msg });
            if (req.url !== "/mcp") return res.writeHead(404).end();
            if (msg.id === undefined) return res.writeHead(202).end();
            let result;
            if (msg.method === "initialize") {
                result = { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "backlog", version: "1" } };
            } else if (msg.method === "tools/list") {
                result = { tools: tools.map((name) => ({ name, description: `Backlog's ${name}`, inputSchema: { type: "object", properties: { runId: { type: "string" } } } })) };
            } else if (msg.params.name === "finish_run") {
                result = { content: [{ type: "text", text: "Backlog refuses: no run with that id." }], isError: true };
            } else if (msg.params.name === "get_run") {
                const error = { code: -32602, message: "Backlog: runId is required" };
                return answer(res, { jsonrpc: "2.0", id: msg.id, error });
            } else {
                result = { content: [{ type: "text", text: JSON.stringify({ echoed: msg.params.name, arguments: msg.params.arguments }) }] };
            }
            answer(res, { jsonrpc: "2.0", id: msg.id, result });
        });
    });
    function answer(res, message) {
        const headers = { "content-type": sse ? "text/event-stream" : "application/json" };
        if (sessionId) headers["mcp-session-id"] = sessionId;
        res.writeHead(200, headers).end(sse ? `event: message\ndata: ${JSON.stringify(message)}\n\n` : JSON.stringify(message));
    }
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return { port: server.address().port, requests, close: () => new Promise((r) => server.close(r)) };
}

/** A port nothing listens on: bound once, then released. */
async function closedPort() {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    await new Promise((r) => server.close(r));
    return port;
}

/** A settings home with Backlog's settings.json in the place each platform looks. */
function settingsHome(mcpServer) {
    const home = mkdtempSync(path.join(tmpdir(), "surface-backlog-"));
    const env = { LOCALAPPDATA: path.join(home, "local"), XDG_DATA_HOME: path.join(home, "share"), HOME: home, USERPROFILE: home };
    for (const dir of [env.LOCALAPPDATA, env.XDG_DATA_HOME, path.join(home, "Library", "Application Support")]) {
        mkdirSync(path.join(dir, "Backlog"), { recursive: true });
        if (mcpServer) writeFileSync(path.join(dir, "Backlog", "settings.json"), JSON.stringify({ mcpServer }));
    }
    return env;
}

/** The server under test, spoken to over stdio. */
function proxy(env) {
    const clean = { ...process.env };
    delete clean.BACKLOG_MCP_PORT;
    delete clean.BACKLOG_MCP_TOKEN;
    const proc = spawn(process.execPath, [SERVER], { env: { ...clean, ...env }, stdio: ["pipe", "pipe", "inherit"] });
    let buffer = "";
    let nextId = 1;
    const pending = new Map();
    proc.stdout.on("data", (chunk) => {
        buffer += chunk;
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
            const msg = JSON.parse(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
            pending.get(msg.id)?.(msg);
        }
    });
    const rpc = (method, params) =>
        new Promise((resolve) => {
            const id = nextId++;
            pending.set(id, resolve);
            proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
        });
    return {
        rpc,
        call: (name, args = {}) => rpc("tools/call", { name, arguments: args }),
        stop: () => proc.kill(),
    };
}

const calls = (requests) => requests.filter((r) => r.msg.method === "tools/call");

test("forwards a lifecycle call with the bearer token and passes the answer through unchanged", async () => {
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port), BACKLOG_MCP_TOKEN: "env-token" });
    try {
        const res = await p.call("start_run", { skillId: "flow-code", stages: ["Scope"] });
        assert.deepEqual(JSON.parse(res.result.content[0].text), { echoed: "start_run", arguments: { skillId: "flow-code", stages: ["Scope"] } });
        assert.ok(backlog.requests.every((r) => r.headers.authorization === "Bearer env-token"));
        assert.deepEqual(backlog.requests.map((r) => r.msg.method), ["initialize", "notifications/initialized", "tools/call"]);
    } finally {
        p.stop();
        await backlog.close();
    }
});

test("keeps the session id Backlog hands out, and reads an event-stream answer", async () => {
    const backlog = await fakeBacklog({ sse: true, sessionId: "s-42" });
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port) });
    try {
        await p.call("update_stage", { runId: "r1" });
        const res = await p.call("list_runs");
        assert.equal(JSON.parse(res.result.content[0].text).echoed, "list_runs");
        assert.ok(calls(backlog.requests).every((r) => r.headers["mcp-session-id"] === "s-42"));
        assert.equal(backlog.requests.filter((r) => r.msg.method === "initialize").length, 1);
    } finally {
        p.stop();
        await backlog.close();
    }
});

test("Backlog's refusals come back as Backlog gave them", async () => {
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port) });
    try {
        const refused = await p.call("finish_run", { runId: "nope" });
        assert.deepEqual(refused.result, { content: [{ type: "text", text: "Backlog refuses: no run with that id." }], isError: true });
        const invalid = await p.call("get_run");
        assert.deepEqual(invalid.error, { code: -32602, message: "Backlog: runId is required" });
    } finally {
        p.stop();
        await backlog.close();
    }
});

test("the environment wins over settings.json, which wins over the default port", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "surface-backlog-"));
    const dir = path.join(home, "Backlog");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ mcpServer: { port: 6001, token: "file-token" } }));
    const opts = (env) => ({ env: { LOCALAPPDATA: home, ...env }, platform: "win32", home });

    assert.deepEqual(await resolveEndpoint(opts({})), { url: "http://127.0.0.1:6001/mcp", token: "file-token", source: "settings" });
    assert.deepEqual(await resolveEndpoint(opts({ BACKLOG_MCP_PORT: "7002", BACKLOG_MCP_TOKEN: "env-token" })), {
        url: "http://127.0.0.1:7002/mcp",
        token: "env-token",
        source: "environment",
    });
    assert.deepEqual(await resolveEndpoint(opts({ BACKLOG_MCP_TOKEN: "env-token" })), { url: "http://127.0.0.1:6001/mcp", token: "env-token", source: "settings" });
    assert.deepEqual(await resolveEndpoint({ env: { LOCALAPPDATA: path.join(home, "none") }, platform: "win32", home }), {
        url: `http://127.0.0.1:${DEFAULT_PORT}/mcp`,
        token: null,
        source: "default",
    });
});

test("reads the port and token from Backlog's settings.json when the environment is silent", async () => {
    const backlog = await fakeBacklog();
    const p = proxy(settingsHome({ port: backlog.port, token: "file-token" }));
    try {
        await p.call("record_prompt", { runId: "r1", prompt: "go" });
        assert.equal(calls(backlog.requests).length, 1);
        assert.equal(calls(backlog.requests)[0].headers.authorization, "Bearer file-token");
    } finally {
        p.stop();
        await backlog.close();
    }
});

test("Backlog not listening: open_dashboard answers unavailable, any other operation fails", async () => {
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(await closedPort()) });
    try {
        const open = await p.call("open_dashboard");
        assert.notEqual(open.result.isError, true);
        const body = JSON.parse(open.result.content[0].text);
        assert.equal(body.unavailable, true);
        assert.match(body.reason, /not listening/);

        const start = await p.call("start_run", { skillId: "flow-code" });
        assert.equal(start.result.isError, true);

        const names = (await p.rpc("tools/list")).result.tools.map((t) => t.name);
        assert.deepEqual(names, LIFECYCLE);
    } finally {
        p.stop();
    }
});

test("an operation outside the lifecycle is refused without asking Backlog", async () => {
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port) });
    try {
        for (const name of ["render_diagram", "render_markdown", "list_sessions", "export_report"]) {
            const res = await p.call(name);
            assert.equal(res.error.code, -32602, name);
        }
        assert.equal(calls(backlog.requests).length, 0);
        const names = (await p.rpc("tools/list")).result.tools.map((t) => t.name);
        assert.deepEqual(names, LIFECYCLE);
    } finally {
        p.stop();
        await backlog.close();
    }
});

test("export_report is listed and forwarded once Backlog lists it", async () => {
    const backlog = await fakeBacklog({ tools: [...LIFECYCLE, "export_report", "list_sessions"] });
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port) });
    try {
        const tools = (await p.rpc("tools/list")).result.tools;
        assert.deepEqual(tools.map((t) => t.name), [...LIFECYCLE, "export_report"]);
        assert.equal(tools[0].description, "Backlog's open_dashboard");
        const res = await p.call("export_report", { runId: "r1" });
        assert.equal(JSON.parse(res.result.content[0].text).echoed, "export_report");
    } finally {
        p.stop();
        await backlog.close();
    }
});
