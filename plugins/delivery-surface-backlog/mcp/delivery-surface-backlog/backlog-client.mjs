// The upstream half of delivery-surface-backlog: where the Backlog desktop app listens, and
// one MCP client session against it over streamable HTTP.
//
// Endpoint: http://127.0.0.1:<port>/mcp with a bearer token. BACKLOG_MCP_PORT and
// BACKLOG_MCP_TOKEN win; otherwise mcpServer.port and mcpServer.token from the app's own
// settings.json; otherwise port 5757 and no token. Backlog's backlog-tools telemetry
// forwarder reads the same three sources in the same order.

import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_PORT = 5757;
const PROTOCOL_VERSION = "2025-06-18";
const TIMEOUT_MS = 15000;

/** Where the app keeps settings.json: .NET's LocalApplicationData, then the Backlog folder. */
export function settingsPath({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
    const localData =
        platform === "win32"
            ? env.LOCALAPPDATA || path.join(home, "AppData", "Local")
            : platform === "darwin"
              ? path.join(home, "Library", "Application Support")
              : env.XDG_DATA_HOME || path.join(home, ".local", "share");
    return path.join(localData, "Backlog", "settings.json");
}

/** `{ url, token, source }` — environment, then settings.json, then the default port. */
export async function resolveEndpoint(options = {}) {
    const env = options.env || process.env;
    let port = Number(env.BACKLOG_MCP_PORT) || null;
    let token = env.BACKLOG_MCP_TOKEN || null;
    let source = port ? "environment" : null;
    if (!port || !token) {
        try {
            const mcp = JSON.parse(await readFile(settingsPath(options), "utf8")).mcpServer || {};
            if (!port && Number(mcp.port)) {
                port = Number(mcp.port);
                source = "settings";
            }
            token ||= mcp.token || null;
        } catch {
            // No settings yet: the app has never served MCP on this machine.
        }
    }
    return { url: `http://127.0.0.1:${port || DEFAULT_PORT}/mcp`, token, source: source || "default" };
}

/** Backlog is not there to answer: nothing listening, the endpoint absent, or the token refused. */
export class Unreachable extends Error {}

/** A JSON-RPC error Backlog answered with, carried through as it came. */
export class UpstreamError extends Error {
    constructor(error) {
        super(error.message);
        this.rpc = error;
    }
}

// Streamable HTTP lets the server answer a request with JSON or with an event stream; take
// the message whose id is ours from either.
function parseBody(contentType, text, id) {
    if (!text) return null;
    if (!/text\/event-stream/i.test(contentType || "")) return JSON.parse(text);
    for (const event of text.split(/\r?\n\r?\n/)) {
        const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
        if (!data) continue;
        const message = JSON.parse(data);
        if (message.id === id) return message;
    }
    return null;
}

export class BacklogClient {
    #endpoint = null;
    #sessionId = null;
    #ready = null;
    #nextId = 1;

    constructor(options = {}) {
        this.options = options;
    }

    async endpoint() {
        this.#endpoint ||= await resolveEndpoint(this.options);
        return this.#endpoint;
    }

    /** Forget the session and the endpoint, so the next call re-reads both. */
    reset() {
        this.#endpoint = null;
        this.#sessionId = null;
        this.#ready = null;
    }

    async #post(message) {
        const { url, token } = await this.endpoint();
        const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
        if (token) headers.authorization = `Bearer ${token}`;
        if (this.#sessionId) headers["mcp-session-id"] = this.#sessionId;
        if (this.#ready) headers["mcp-protocol-version"] = PROTOCOL_VERSION;
        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(message),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (err) {
            throw new Unreachable(`Backlog is not listening at ${url} (${(err.cause && err.cause.code) || err.message}).`);
        }
        const text = await response.text();
        if (response.status === 404 && this.#sessionId) return { expired: true };
        if (response.status === 401 || response.status === 403) {
            throw new Unreachable(`Backlog refused the token at ${url} (${response.status}).`);
        }
        if (response.status === 404) {
            throw new Unreachable(`Backlog answers at ${url} but serves no MCP endpoint there — its MCP server is off.`);
        }
        if (!response.ok) throw new Unreachable(`Backlog answered ${response.status} at ${url}: ${text.slice(0, 200)}`);
        return { response, text };
    }

    async #initialize() {
        const id = this.#nextId++;
        const { response, text } = await this.#post({
            jsonrpc: "2.0",
            id,
            method: "initialize",
            params: {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: {},
                clientInfo: { name: "delivery-surface-backlog", version: "0.1.0" },
            },
        });
        const message = parseBody(response.headers.get("content-type"), text, id);
        if (message && message.error) throw new UpstreamError(message.error);
        this.#sessionId = response.headers.get("mcp-session-id") || null;
        this.#ready = true;
        await this.#post({ jsonrpc: "2.0", method: "notifications/initialized" });
    }

    /** One request on the session, initializing it first; a session Backlog expired is re-made once. */
    async request(method, params) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                if (!this.#ready) await this.#initialize();
                const id = this.#nextId++;
                const answer = await this.#post({ jsonrpc: "2.0", id, method, params });
                if (answer.expired) {
                    this.#sessionId = null;
                    this.#ready = null;
                    continue;
                }
                const message = parseBody(answer.response.headers.get("content-type"), answer.text, id);
                if (!message) throw new Unreachable(`Backlog sent no answer to ${method}.`);
                if (message.error) throw new UpstreamError(message.error);
                return message.result;
            } catch (err) {
                if (err instanceof Unreachable) this.reset();
                throw err;
            }
        }
        throw new Unreachable("Backlog expired the session twice in a row.");
    }

    async listTools() {
        return (await this.request("tools/list", {})).tools || [];
    }

    callTool(name, args) {
        return this.request("tools/call", { name, arguments: args });
    }
}
