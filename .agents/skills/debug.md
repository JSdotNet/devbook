---
name: debug
description: "Find the cause of an issue observed in this repository's running application — read its logs, traces, and console, reproduce it, and set a breakpoint where a log cannot say. Use when: 'why does this fail', 'debug it', a reproduction is needed, an exception or a wrong value has no obvious origin, or a flow's defect stage needs a root cause."
goal: "Name the cause of an observed issue and prove it with evidence — the log line, the trace span, or the breakpoint state that shows it — doing the debugging yourself rather than handing the person a debugger, and leaving no breakpoint, diagnostic line, or temporary setting behind in the change."
---

# Debug the Application

Go from a symptom to a cause with the evidence attached. **Edit this file** — where this
repository's logs live, which debugger reaches it, and how a reproduction is set up are yours;
the goal in the wrapper is not.

## Run it

Invoke the `start` skill and reuse the instance it reports. Reproduce the symptom once, the
narrowest way that shows it — one request, one click, one command — and note the exact time.

## Observe

<!-- Where the running app can be seen from. Replace the example rows. -->

| Signal | Where |
| --- | --- |
| Structured logs and traces | The Aspire dashboard `start` reports, or the Aspire MCP tools when the tool list has them |
| Browser console and network | The browser tool's console and request tools |
| Process output | The terminal `start` left running |

Read the window around the reproduction, not the whole log. Follow one request's trace end to
end before reading a second. Quote the line or span that points at the cause.

## Break

<!-- The debugger this repository is reached with. Replace the example. -->

When a log cannot say what a value was, set a breakpoint and read it yourself:

- Attach with the debugger tool the live tool list exposes for this stack — a DAP-based MCP
  server, or the host's own debug tool — at the file and line the trace points at, reproduce,
  and read the locals.
- No such tool in the list: add one temporary diagnostic — a log line or an assertion at that
  line — rebuild, reproduce, read it, and remove it before anything else happens. Say that
  you did.

Never ask the person to attach a debugger, set a breakpoint, or read a value for you.

## Report

The cause in one sentence; the evidence that proves it — a quoted log line with its
timestamp, a trace id and span, or the breakpoint's file, line, and the values read; the
reproduction steps; and what a fix would touch. A cause without evidence is a hypothesis, and
is reported as one.

## Never

- Leave a breakpoint file, a temporary log line, a `.env` change, or a debug flag in the
  change. `git diff` before reporting.
- Change data or configuration to make the symptom go away instead of finding why it is
  there.
- Run destructive setup to reproduce — a database reset, a volume prune. Propose it instead.
