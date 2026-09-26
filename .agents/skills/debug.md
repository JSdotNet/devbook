---
name: debug
description: "Find the cause of an issue observed in this repository's running application — read its logs, traces, and console, reproduce it, and set a breakpoint where a log cannot say. Use when: 'why does this fail', 'debug it', a reproduction is needed, an exception or a wrong value has no obvious origin, or a flow's defect stage needs a root cause."
goal: "Name the cause of an observed issue and prove it with evidence — the log line, the trace span, or the breakpoint state that shows it — doing the debugging yourself rather than handing the person a debugger, and leaving no breakpoint, diagnostic line, or temporary setting behind in the change."
---

# Debug the Marketplace

What runs here is Node: the checker, the devbook-meta generator, a hook's command, an MCP
server over stdio. Each can be run alone, outside a host, and that is always the first move —
a cause reproduced without Claude Code in the loop is one whose evidence nobody has to take on
trust.

## Reproduce it alone

| Symptom in | Run it as |
| --- | --- |
| `check-assets` | `node tools/check-assets.mjs` — every message names its file; read that file first |
| `build.mjs --check` | The same with `--scope <folder>`; `--print` emits the parsed documents as JSON, so a wrong value is read rather than guessed. Narrow further with `--root .wip/try/<slug>` over a minimal copy |
| A hook | Its command from `hooks/hooks.json`, with `CLAUDE_PLUGIN_ROOT=plugins/<p>` and `CLAUDE_PROJECT_DIR` set to the repository it misbehaves in, the event payload on stdin |
| An MCP server | The `command` and `args` from `mcpServers`, driven over stdio: `initialize`, `notifications/initialized`, then `tools/list` or the failing `tools/call`, one JSON-RPC message per line |
| A skill or agent | Not code. Read what it loads by path and check each path resolves; the cause is almost always a pointer to nothing or two files that disagree |

Reproduce once, the narrowest way that shows it, and note the exact command.

## Inside the host

When it only fails under Claude Code, take the host's own log: `claude -p --plugin-dir
plugins/<p> --debug-file .wip/evidence/<branch>/<NN>-debug.log "<prompt>"`, narrowed with
`--debug hooks` or `--debug mcp`. Read the window around the failure, not the whole file.

## Where a log cannot say

No debugger tool is in reach here. Add one temporary `console.error` at the line the output
points at — stderr, so an MCP server's stdout protocol stays clean — rerun, read it, and remove
it before anything else happens. Say that you did.

Never ask the person to attach a debugger, set a breakpoint, or read a value for you.

## Report

The cause in one sentence; the evidence — the checker message, the `--print` value, the
JSON-RPC response, or the diagnostic's output, each captured through `capture` and cited by
path; the reproduction command; and what a fix would touch. A cause without evidence is a
hypothesis, and is reported as one.

## Never

- Leave a diagnostic line, a `.wip/` file, or a settings change in the change. `git diff`
  before reporting.
- Regenerate or hand-edit a `_meta/` folder to make a check pass; the source Markdown is what
  is wrong.
- Weaken a check in `tools/check-assets.mjs` to make a symptom go away.
