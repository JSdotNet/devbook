# delivery-surface-backlog

The Backlog desktop app as a run surface: a run shows up in the window where its work item
already lives. This plugin is the door to it — a stdio MCP server that forwards each call to
the MCP endpoint inside the running app and hands Backlog's answer back unchanged.

A surface: where work becomes visible, and nothing else. It declares no dependency, names no
engine, and knows two things — the operation names and where Backlog listens.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `delivery-surface-backlog` with `/plugin`. Plain Node, no npm dependencies, no
listening socket of its own.

## On Copilot

The Copilot manifest carries no key for an MCP server, so a Copilot session reaches this one
through the repository's own MCP configuration — an entry in `.mcp.json` or `.vscode/mcp.json`
naming the installed plugin's path:

```json
{ "servers": { "delivery-surface-backlog": { "command": "node", "args": ["<plugin path>/mcp/delivery-surface-backlog/mcp-server.mjs"] } } }
```

Registered that way it surfaces under the bare `mcp__delivery-surface-backlog__*` spelling, the
second shape the engine's surface contract matches.

It needs the Backlog desktop app **open, with its MCP server switched on** and its Sessions
area enabled. The plugin finds it the way Backlog's own `backlog-tools` hooks do:

| Setting | Read from, first match wins |
| --- | --- |
| Port | `BACKLOG_MCP_PORT`, then `mcpServer.port` in Backlog's `settings.json`, then `5757` |
| Token | The "Backlog delivery" grant, `mcpServer.grants.delivery` in the same file, minted by the app's token broker; `BACKLOG_MCP_TOKEN` only where no grant is recorded |

`settings.json` is under `%LOCALAPPDATA%\Backlog\` on Windows, `~/Library/Application
Support/Backlog/` on macOS, and `$XDG_DATA_HOME/Backlog/` (else `~/.local/share/Backlog/`)
elsewhere. It holds no token: Backlog retired the shared `mcpServer.token`.

The broker is a named pipe only this user can open, `\\.\pipe\backlog-mcp-broker-<user>`,
`<user>` being the user name lower-cased with anything outside `[a-z0-9._-]` as `_`;
`BACKLOG_MCP_BROKER_PIPE` replaces the whole name. The plugin sends `{"grant":"<id>"}` and
reads back `{"token":…,"expiresAt":…}` or `{"error":…}` — the protocol of Backlog's
`tools/mcp/backlog-mcp-headers.mjs`, local ADR 0058 §3 there. It keeps a token until a minute
before its `expiresAt`, and on a 401 or 403 drops it and asks once more; a second refusal is
final. A grant the person has not allowed yet is refused `pending`, and the surface answers
unavailable with that reason.

**Registering Backlog's own `backlog` MCP server does not make Backlog a surface.** That
server is the tracker — work items, their status, their sessions — and it answers under a name
a caller never binds a run to. Installing this plugin is what makes Backlog a surface; removing
it is how to stop.

## What it implements

One of the three capability groups, and whatever of a second Backlog answers:

| Capability | Tools | |
|---|---|---|
| `delivery.surface.lifecycle@1` | `open_dashboard` · `start_run` · `record_prompt` · `set_run_context` · `update_stage` · `finish_run` · `list_runs` · `get_run` | yes |
| `delivery.surface.export@1` | `export_report` | only while Backlog lists it |
| `delivery.surface.render@1` | — | no |

Every answer and every refusal is Backlog's own. The plugin adds no check of its own on the
way through, so a run the app rejects is rejected in the app's words. A name outside the list —
a render operation, one of Backlog's tracker tools — is refused here and never forwarded.

`open_dashboard` brings Backlog's Sessions pane forward and answers with what the app did; it
returns no URL, because the run is in a window the user already has.

## When Backlog is not there

| Backlog is | `open_dashboard` answers | Any other operation |
|---|---|---|
| Closed, or its MCP server is off | `unavailable: true` with the reason | A tool error naming the endpoint |
| Refusing the token twice, or its broker absent or refusing the grant | `unavailable: true` with the reason | A tool error naming the endpoint |
| Running with Sessions switched off | `unavailable: true` with the reason | Backlog's own refusal |

`unavailable` at open time is how a caller knows to skip this surface and try the next one it
prefers. Backlog closing after a run has started is not that: the run already lives there, and
the error is a tooling failure the caller reports.

The tools are namespaced by whoever registered the server, so they surface as
`mcp__plugin_delivery-surface-backlog_delivery-surface-backlog__*` when installed as a plugin
and as `mcp__delivery-surface-backlog__*` from a repository's own MCP configuration.

## Why a proxy

The token is minted on demand from a pipe, not kept in the environment, and Copilot's MCP
configuration interpolates environment variables and nothing else. A stdio server that asks
the broker itself works the same on both hosts, and is built the way the other surfaces are.

Telemetry is not forwarded from here. Backlog already receives tool and token events from the
`backlog-tools` plugin's own hook.

## Developing it

`manifest.json` and `.mcpbignore` beside the server describe the `.mcpb` bundle target; the tool
list in `manifest.json` is kept by hand and mirrors `tools[]` in `mcp-server.mjs`.

```bash
node --test mcp/delivery-surface-backlog/dev/proxy-test.mjs
```

Drives the real server over stdio against a fake Backlog endpoint and a fake token broker:
connecting through the grant with no 401, the token kept until near its expiry and asked for
again after a refusal, the broker absent or refusing, the escape hatch's bearer header, the
session id and an event-stream answer, Backlog's refusals passed through, where the port and
token come from, Backlog not listening, and what is refused without asking Backlog.
