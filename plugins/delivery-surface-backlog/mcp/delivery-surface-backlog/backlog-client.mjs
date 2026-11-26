// The upstream half of delivery-surface-backlog: where the Backlog desktop app listens, and
// one MCP client session against it over streamable HTTP.
//
// Endpoint: http://127.0.0.1:<port>/mcp with a bearer token. The port is BACKLOG_MCP_PORT,
// else mcpServer.port in the app's own settings.json, else 5757.
//
// The token belongs to the "Backlog delivery" grant the app records in settings.json as
// mcpServer.grants.delivery (Backlog local ADR 0058 §3). The app's token broker mints it: a
// named pipe only this user can open, \\.\pipe\backlog-mcp-broker-<user> (<user> lower-cased,
// anything outside [a-z0-9._-] as "_"; BACKLOG_MCP_BROKER_PIPE replaces the whole name). One
// JSON line goes out, {"grant":"<id>"}, and one comes back, {"token":…,"expiresAt":…} or
// {"error":…}. A token is kept until shortly before its expiresAt, and a 401 or 403 drops it
// and asks the broker once more. BACKLOG_MCP_TOKEN is used only where no grant is recorded —
// the dev or CI escape hatch for a machine with no app. This is the order Backlog's own
// tools/mcp/backlog-mcp-headers.mjs keeps.

import { readFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

export const DEFAULT_PORT = 5757;
const PROTOCOL_VERSION = "2025-06-18";
const TIMEOUT_MS = 15000;
const BROKER_TIMEOUT_MS = 5000;
/** How long before its expiresAt a minted token is asked for again. */
export const TOKEN_MARGIN_MS = 60000;

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

/**
 * `{ url, grant, token, source }` — the port from the environment, then settings.json, then
 * the default; the delivery grant from settings.json; and BACKLOG_MCP_TOKEN only when no grant
 * is recorded. `source` says where the port came from.
 */
export async function resolveEndpoint(options = {}) {
    const env = options.env || process.env;
    let port = Number(env.BACKLOG_MCP_PORT) || null;
    let source = port ? "environment" : null;
    let grant = null;
    try {
        const mcp = JSON.parse(await readFile(settingsPath(options), "utf8")).mcpServer || {};
        if (!port && Number(mcp.port)) {
            port = Number(mcp.port);
            source = "settings";
        }
        grant = (mcp.grants && mcp.grants.delivery) || null;
    } catch {
        // No settings yet: the app has never served MCP on this machine.
    }
    const token = grant ? null : env.BACKLOG_MCP_TOKEN || null;
    return { url: `http://127.0.0.1:${port || DEFAULT_PORT}/mcp`, grant, token, source: source || "default" };
}

/** The broker's pipe name, without the platform prefix — the name Backlog's McpTokenBroker.PipeNameFor gives. */
export function brokerPipeName({ env = process.env, username = os.userInfo().username } = {}) {
    if (env.BACKLOG_MCP_BROKER_PIPE) return env.BACKLOG_MCP_BROKER_PIPE;
    return `backlog-mcp-broker-${username.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
}

/** Where a .NET named pipe of that name lives: \\.\pipe\ on Windows, a CoreFxPipe_ socket elsewhere. */
export function brokerPipePath(name, platform = process.platform) {
    return platform === "win32" ? `\\\\.\\pipe\\${name}` : path.join(os.tmpdir(), `CoreFxPipe_${name}`);
}

/** Backlog is not there to answer: nothing listening, the endpoint absent, or the token refused. */
export class Unreachable extends Error {}

/**
 * Asks the broker at `pipe` for a token for `grant`: resolves to `{ token, expiresAt }`, with
 * `expiresAt` in epoch milliseconds or null when the broker named none. Rejects with an
 * Unreachable that says why: no broker, a refusal, an answer that is not one, or none in time.
 */
export function requestGrantToken(grant, pipe, { timeoutMs = BROKER_TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
        const socket = net.connect(pipe);
        let received = "";
        let settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            if (error) reject(new Unreachable(`${error} (pipe ${pipe})`));
            else resolve(value);
        };
        const timer = setTimeout(() => finish("The Backlog token broker did not answer in time."), timeoutMs);
        socket.setEncoding("utf8");
        socket.on("connect", () => socket.write(JSON.stringify({ grant }) + "\n"));
        socket.on("data", (chunk) => {
            received += chunk;
            const newline = received.indexOf("\n");
            if (newline < 0) return;
            let reply;
            try {
                reply = JSON.parse(received.slice(0, newline));
            } catch {
                return finish("The Backlog token broker answered with something that is not JSON.");
            }
            if (reply && typeof reply.token === "string" && reply.token) {
                const expiresAt = Date.parse(reply.expiresAt);
                return finish(null, { token: reply.token, expiresAt: Number.isNaN(expiresAt) ? null : expiresAt });
            }
            finish(`The Backlog token broker refused grant ${grant}: ${(reply && reply.error) || "no token in its reply"}.`);
        });
        socket.on("error", (err) =>
            finish(
                err.code === "ENOENT"
                    ? "The Backlog token broker is not running: start the Backlog desktop app."
                    : `Could not reach the Backlog token broker: ${err.message}`,
            ),
        );
        socket.on("close", () => finish("The Backlog token broker closed the connection without a reply."));
    });
}

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
    #minted = null;
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

    /** Forget the session, the endpoint, and the minted token, so the next call re-reads all three. */
    reset() {
        this.#endpoint = null;
        this.#minted = null;
        this.#sessionId = null;
        this.#ready = null;
    }

    /** The bearer token for this request: the grant's, minted afresh near its expiry, else the escape hatch's. */
    async #token({ url, grant, token }) {
        if (!grant) return token;
        const now = (this.options.now || Date.now)();
        if (!this.#minted || (this.#minted.expiresAt !== null && this.#minted.expiresAt - TOKEN_MARGIN_MS <= now)) {
            const pipe = brokerPipePath(brokerPipeName(this.options), this.options.platform);
            try {
                this.#minted = await requestGrantToken(grant, pipe);
            } catch (err) {
                throw new Unreachable(`Backlog at ${url} has no token for grant ${grant}: ${err.message}`);
            }
        }
        return this.#minted.token;
    }

    async #post(message) {
        const endpoint = await this.endpoint();
        const { url } = endpoint;
        for (let attempt = 0; ; attempt++) {
            const token = await this.#token(endpoint);
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
            if (response.status === 401 || response.status === 403) {
                // A minted token Backlog no longer takes — expired early, or the grant re-issued — is
                // dropped and asked for once more; a second refusal, or the escape hatch's, is final.
                if (endpoint.grant && attempt === 0) {
                    this.#minted = null;
                    continue;
                }
                throw new Unreachable(`Backlog refused the token at ${url} (${response.status}).`);
            }
            return this.#answer(response, text, url);
        }
    }

    #answer(response, text, url) {
        if (response.status === 404 && this.#sessionId) return { expired: true };
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
