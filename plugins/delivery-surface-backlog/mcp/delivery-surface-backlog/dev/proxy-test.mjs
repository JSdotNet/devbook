// Drives the real server over stdio the way a host does, against a fake Backlog endpoint and
// a fake token broker: forwarding with the grant's bearer token, the token kept until near its
// expiry and asked for again after a refusal, where the port and token come from, Backlog not
// listening, and what is refused without asking Backlog at all.
//
//   node --test dev/proxy-test.mjs

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createSocketServer } from "node:net";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_PORT, TOKEN_MARGIN_MS, brokerPipeName, brokerPipePath, resolveEndpoint } from "../backlog-client.mjs";

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "mcp-server.mjs");
const LIFECYCLE = ["open_dashboard", "start_run", "record_prompt", "set_run_context", "update_stage", "finish_run", "list_runs", "get_run"];

/**
 * A stand-in for Backlog's /mcp: records every request and answers like the app does. With
 * `accept`, a request whose bearer token is not in it is answered 401, as the app does once
 * the shared token is retired.
 */
async function fakeBacklog({ tools = LIFECYCLE, sse = false, sessionId = null, accept = null } = {}) {
    const requests = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const msg = JSON.parse(body);
            const refused = accept !== null && !accept.includes((req.headers.authorization || "").replace(/^Bearer /, ""));
            requests.push({ url: req.url, headers: req.headers, msg, status: refused ? 401 : 200 });
            if (refused) return res.writeHead(401).end();
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

/**
 * A stand-in for the app's token broker on a pipe of its own: answers each {"grant"} line with
 * the next of `tokens` — a token string, or a reply object as it stands — and records the asks.
 */
async function fakeBroker(tokens, { expiresInMs = 15 * 60000 } = {}) {
    const name = `surface-backlog-test-${process.pid}-${Math.random().toString(36).slice(2)}`;
    const asks = [];
    const server = createSocketServer((socket) => {
        let received = "";
        socket.setEncoding("utf8");
        socket.on("data", (chunk) => {
            received += chunk;
            if (!received.includes("\n")) return;
            asks.push(JSON.parse(received.slice(0, received.indexOf("\n"))));
            const next = tokens[Math.min(asks.length - 1, tokens.length - 1)];
            const reply = typeof next === "string" ? { token: next, expiresAt: new Date(Date.now() + expiresInMs).toISOString() } : next;
            socket.end(JSON.stringify(reply) + "\n");
        });
    });
    await new Promise((resolve) => server.listen(brokerPipePath(name), resolve));
    return { name, asks, close: () => new Promise((r) => server.close(r)) };
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
    delete clean.BACKLOG_MCP_BROKER_PIPE;
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

test("connects through the delivery grant: the broker's token, no 401, one ask for many calls", async () => {
    const broker = await fakeBroker(["minted-1"]);
    const backlog = await fakeBacklog({ accept: ["minted-1"] });
    // A retired shared token left in the environment is never sent while a grant is recorded.
    const env = { ...settingsHome({ port: backlog.port, grants: { delivery: "g_delivery" } }), BACKLOG_MCP_BROKER_PIPE: broker.name, BACKLOG_MCP_TOKEN: "retired" };
    const p = proxy(env);
    try {
        const open = await p.call("open_dashboard");
        assert.notEqual(JSON.parse(open.result.content[0].text).unavailable, true);
        await p.call("start_run", { skillId: "flow-code" });
        await p.call("update_stage", { runId: "r1" });
        assert.deepEqual(broker.asks, [{ grant: "g_delivery" }]);
        assert.ok(backlog.requests.every((r) => r.status === 200 && r.headers.authorization === "Bearer minted-1"));
        assert.equal(calls(backlog.requests).length, 3);
    } finally {
        p.stop();
        await backlog.close();
        await broker.close();
    }
});

test("a 401 drops the minted token and asks the broker once more", async () => {
    const broker = await fakeBroker(["stale", "fresh"]);
    const backlog = await fakeBacklog({ accept: ["fresh"] });
    const p = proxy({ ...settingsHome({ port: backlog.port, grants: { delivery: "g_delivery" } }), BACKLOG_MCP_BROKER_PIPE: broker.name });
    try {
        const res = await p.call("list_runs");
        assert.equal(JSON.parse(res.result.content[0].text).echoed, "list_runs");
        assert.equal(broker.asks.length, 2);
        assert.deepEqual(backlog.requests.map((r) => r.status), [401, 200, 200, 200]);
    } finally {
        p.stop();
        await backlog.close();
        await broker.close();
    }
});

test("a second refusal is final: the surface answers unavailable", async () => {
    const broker = await fakeBroker(["stale"]);
    const backlog = await fakeBacklog({ accept: ["never"] });
    const p = proxy({ ...settingsHome({ port: backlog.port, grants: { delivery: "g_delivery" } }), BACKLOG_MCP_BROKER_PIPE: broker.name });
    try {
        const body = JSON.parse((await p.call("open_dashboard")).result.content[0].text);
        assert.equal(body.unavailable, true);
        assert.match(body.reason, /refused the token .*\(401\)/);
        assert.equal(broker.asks.length, 2);
        assert.equal(backlog.requests.length, 2);
    } finally {
        p.stop();
        await backlog.close();
        await broker.close();
    }
});

test("a token inside the margin before its expiresAt is minted again", async () => {
    const broker = await fakeBroker(["near-expiry"], { expiresInMs: TOKEN_MARGIN_MS / 2 });
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome({ port: backlog.port, grants: { delivery: "g_delivery" } }), BACKLOG_MCP_BROKER_PIPE: broker.name });
    try {
        await p.call("list_runs");
        // initialize, notifications/initialized, tools/call: each finds the token about to lapse.
        assert.equal(broker.asks.length, backlog.requests.length);
        assert.equal(broker.asks.length, 3);
    } finally {
        p.stop();
        await backlog.close();
        await broker.close();
    }
});

test("a grant with the broker absent or refusing answers unavailable with the broker's reason", async () => {
    const backlog = await fakeBacklog();
    const settings = settingsHome({ port: backlog.port, grants: { delivery: "g_delivery" } });
    const absent = proxy({ ...settings, BACKLOG_MCP_BROKER_PIPE: `surface-backlog-absent-${process.pid}` });
    const broker = await fakeBroker([{ error: "pending" }]);
    const refusing = proxy({ ...settings, BACKLOG_MCP_BROKER_PIPE: broker.name });
    try {
        const none = JSON.parse((await absent.call("open_dashboard")).result.content[0].text);
        assert.equal(none.unavailable, true);
        assert.match(none.reason, /token broker is not running/);
        const pending = JSON.parse((await refusing.call("open_dashboard")).result.content[0].text);
        assert.equal(pending.unavailable, true);
        assert.match(pending.reason, /refused grant g_delivery: pending/);
        assert.equal(backlog.requests.length, 0);
    } finally {
        absent.stop();
        refusing.stop();
        await backlog.close();
        await broker.close();
    }
});

test("the broker's pipe name is Backlog's: lower-cased, anything outside [a-z0-9._-] as _", () => {
    assert.equal(brokerPipeName({ env: {}, username: "Job Schepers" }), "backlog-mcp-broker-job_schepers");
    assert.equal(brokerPipeName({ env: { BACKLOG_MCP_BROKER_PIPE: "custom" }, username: "x" }), "custom");
    assert.equal(brokerPipePath("backlog-mcp-broker-job", "win32"), "\\\\.\\pipe\\backlog-mcp-broker-job");
});

test("without a grant, BACKLOG_MCP_TOKEN is the bearer token and passes the answer through unchanged", async () => {
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port), BACKLOG_MCP_TOKEN: "env-token" });
    try {
        const res = await p.call("start_run", { skillId: "flow-code", stages: ["Scope"] });
        // The one argument the proxy adds: a title Backlog wants and the contract never sends.
        assert.deepEqual(JSON.parse(res.result.content[0].text), { echoed: "start_run", arguments: { skillId: "flow-code", stages: ["Scope"], title: "flow-code" } });
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

test("forwards update_stage's scenario evidence unchanged", async () => {
    const backlog = await fakeBacklog();
    const p = proxy({ ...settingsHome(null), BACKLOG_MCP_PORT: String(backlog.port) });
    try {
        const evidence = [
            { stem: "checkout", part: "pay-by-card", outcome: "passed", runAt: "2026-10-08T09:00:00.000Z" },
            { stem: "checkout", part: "declined-card", outcome: "failed", runAt: "2026-10-08T09:00:00.000Z" },
            { stem: "checkout", part: "refund", outcome: "not-run", runAt: "2026-10-08T09:00:00.000Z" },
        ];
        const args = { runId: "r1", stageIndex: 6, status: "done", output: "Three parts.", evidence };
        const res = await p.call("update_stage", args);
        assert.deepEqual(JSON.parse(res.result.content[0].text), { echoed: "update_stage", arguments: args });
        assert.deepEqual(calls(backlog.requests)[0].msg.params.arguments, args);
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

test("the port: environment, then settings.json, then the default; the grant wins over BACKLOG_MCP_TOKEN", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "surface-backlog-"));
    const write = (folder, mcpServer) => {
        mkdirSync(path.join(home, folder, "Backlog"), { recursive: true });
        writeFileSync(path.join(home, folder, "Backlog", "settings.json"), JSON.stringify({ mcpServer }));
    };
    // The retired mcpServer.token is never read, even where an old settings.json still has it.
    write("granted", { port: 6001, token: "retired", grants: { delivery: "g_delivery" } });
    write("ungranted", { port: 6001, token: "retired" });
    const opts = (folder, env) => ({ env: { LOCALAPPDATA: path.join(home, folder), ...env }, platform: "win32", home });

    assert.deepEqual(await resolveEndpoint(opts("granted", {})), { url: "http://127.0.0.1:6001/mcp", grant: "g_delivery", token: null, source: "settings" });
    assert.deepEqual(await resolveEndpoint(opts("granted", { BACKLOG_MCP_PORT: "7002", BACKLOG_MCP_TOKEN: "env-token" })), {
        url: "http://127.0.0.1:7002/mcp",
        grant: "g_delivery",
        token: null,
        source: "environment",
    });
    assert.deepEqual(await resolveEndpoint(opts("ungranted", {})), { url: "http://127.0.0.1:6001/mcp", grant: null, token: null, source: "settings" });
    assert.deepEqual(await resolveEndpoint(opts("ungranted", { BACKLOG_MCP_TOKEN: "env-token" })), {
        url: "http://127.0.0.1:6001/mcp",
        grant: null,
        token: "env-token",
        source: "settings",
    });
    assert.deepEqual(await resolveEndpoint(opts("none", {})), { url: `http://127.0.0.1:${DEFAULT_PORT}/mcp`, grant: null, token: null, source: "default" });
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
