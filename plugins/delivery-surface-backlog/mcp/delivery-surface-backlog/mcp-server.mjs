#!/usr/bin/env node
// MCP server: delivery-surface-backlog
//
// A run surface that is somebody else's application: the Backlog desktop app answers the
// lifecycle operations of the surface capability from an MCP endpoint inside its own
// process, and this server is the stdio door to it. Every call is forwarded to Backlog's
// /mcp over streamable HTTP with its bearer token, and Backlog's answer — or its refusal —
// comes back unchanged. Nothing is stored here and nothing is decided here.
//
// It lists the eight lifecycle operations, and export_report only while Backlog lists it.
// It never lists the render operations: Backlog does not render, and a name listed here
// is a promise a caller binds on.
//
// Backlog closed or never set up is one answer, given where a caller can act on it:
// open_dashboard returns `unavailable: true` instead of an error, so the caller skips this
// surface and tries the next. Any other operation that cannot reach Backlog fails as a
// tooling failure — the app closed mid-run.
//
// It knows the operation names and Backlog's endpoint, and nothing about what calls it.

import { BacklogClient, Unreachable, UpstreamError } from "./backlog-client.mjs";

const SERVER_NAME = "delivery-surface-backlog";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const LIFECYCLE = [
    "open_dashboard",
    "start_run",
    "record_prompt",
    "set_run_context",
    "update_stage",
    "finish_run",
    "list_runs",
    "get_run",
];
const EXPORT = "export_report";

const backlog = new BacklogClient();

// Backlog's own schema for a tool when it is running, a permissive one when it is not: the
// shape is Backlog's to decide and to refuse, and a guess written here would be a second
// contract drifting beside the first.
function fallbackTool(name) {
    return {
        name,
        description: `Forwarded to the Backlog desktop app's ${name}.`,
        inputSchema: { type: "object", additionalProperties: true },
    };
}

async function upstreamTools() {
    try {
        return await backlog.listTools();
    } catch {
        return null;
    }
}

async function listTools() {
    const upstream = await upstreamTools();
    const byName = new Map((upstream || []).map((tool) => [tool.name, tool]));
    const names = byName.has(EXPORT) ? [...LIFECYCLE, EXPORT] : LIFECYCLE;
    return names.map((name) => {
        const tool = byName.get(name);
        return tool ? { name, description: tool.description, inputSchema: tool.inputSchema } : fallbackTool(name);
    });
}

function unavailable(reason) {
    return {
        content: [{ type: "text", text: JSON.stringify({ unavailable: true, surface: SERVER_NAME, reason }, null, 2) }],
    };
}

async function openDashboard(args) {
    try {
        const upstream = await backlog.listTools();
        if (!upstream.some((tool) => tool.name === "open_dashboard")) {
            return unavailable("Backlog is running but lists no delivery surface — its Sessions area is switched off.");
        }
        return await backlog.callTool("open_dashboard", args);
    } catch (err) {
        if (err instanceof Unreachable) return unavailable(err.message);
        throw err;
    }
}

// ---------------------------------------------------------------------------
// MCP stdio transport (newline-delimited JSON-RPC 2.0)
// ---------------------------------------------------------------------------

function send(message) {
    process.stdout.write(JSON.stringify(message) + "\n");
}

function respond(id, result) {
    send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message, data) {
    send({ jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } });
}

async function callTool(id, name, args) {
    if (!LIFECYCLE.includes(name) && name !== EXPORT) {
        respondError(id, -32602, `Unknown tool: ${name}`);
        return;
    }
    if (name === EXPORT) {
        const upstream = await upstreamTools();
        if (!upstream || !upstream.some((tool) => tool.name === EXPORT)) {
            respondError(id, -32602, `Unknown tool: ${name} — Backlog does not answer it.`);
            return;
        }
    }
    try {
        respond(id, name === "open_dashboard" ? await openDashboard(args) : await backlog.callTool(name, args));
    } catch (err) {
        if (err instanceof UpstreamError) {
            respondError(id, err.rpc.code, err.rpc.message, err.rpc.data);
            return;
        }
        // Backlog went away mid-run: a tool failure the caller reads, per the MCP spec.
        respond(id, { content: [{ type: "text", text: String((err && err.message) || err) }], isError: true });
    }
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
            respond(id, { tools: await listTools() });
            return;
        case "tools/call":
            await callTool(id, params && params.name, (params && params.arguments) || {});
            return;
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
            process.stderr.write(`${SERVER_NAME}: ${String((err && err.stack) || err)}\n`);
        });
    }
});
process.stdin.on("end", () => process.exit(0));
