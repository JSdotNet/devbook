# Delivery Surface Dashboard

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#delivery-surface-dashboard", ".devbook/arc42/adr/surfaces.md"]
```

What this context is responsible for: that a run is visible while it happens, that what it shows
was measured rather than claimed, and that uninstalling it costs a view and never a capability.

Inside the boundary: the run store, the three pages, the telemetry the hooks capture, and the
report exported at the end. It answers all three capability groups of the surface contract.

Outside it: what produced the run. This context knows nothing about flows, gates, or extension
points — it receives lifecycle calls, and whoever made them resolved its tool names by pattern
from the live tool list. It declares no dependency and names no engine.

## Run Record

```meta
type: aggregate
aliases: [run, run store, run file]
related: [".devbook/domain/delivery/domain.md#run"]
```

One run as this context holds it: stages with status and output, the prompt history, QA
scenarios with their evidence, gate decisions, telemetry, and a handoff marker. One JSON file
per run, outside the repository and keyed by worktree path — so a run survives a session restart
and never shows up in `git status`.

It is a record and not the run. Nothing here advances a run or decides anything about it; it
folds what it is told, adds what its own hooks measured, and answers questions about the result.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| One record per run, keyed by worktree; a `start_run` naming a parked run reattaches rather than opening a second | `start_run()` | `unit:node:plugins/delivery-surface-dashboard/mcp/delivery-surface-dashboard/dev/handoff-test.mjs` |
| A stage finishing twice is recorded twice | `update_stage()` | untested |
| Evidence paths resolve inside the git worktree root; anything outside is refused | `update_stage()` | untested |
| Telemetry is captured from tool events and never accepted from a caller | telemetry hook | `unit:node:plugins/delivery-surface-dashboard/mcp/delivery-surface-dashboard/dev/subagent-telemetry-test.mjs` |
| Idleness and the session title are derived on read, never stored as status | `get_run()`, `list_runs()` | `unit:node:plugins/delivery-surface-dashboard/mcp/delivery-surface-dashboard/dev/session-title-test.mjs` |
| The record holds destination kinds, never the words shown for them; the words are read from the repository's own stack-config entry on every title | `start_run()`, `update_stage()` | `unit:node:plugins/delivery-surface-dashboard/mcp/delivery-surface-dashboard/dev/session-title-integration-test.mjs` |
| The declared tool surface is exactly the contract's eleven names and nothing more | server start | untested |
| The record survives a session restart | store | `unit:node:plugins/delivery-surface-dashboard/mcp/delivery-surface-dashboard/dev/handoff-test.mjs` |

### Stage Record

```meta
type: entity
```

One stage as recorded: name, status, output, links, and how many times it finished. Identity
inside the record is the stage name, and the repeat count is what keeps a revise decision
legible — a stage that ran twice must not read as one long stage.

### QA Scenario

```meta
type: entity
```

One validation scenario with its status and the evidence it produced. It has identity because it
is reported individually and because its evidence is cited from the exported report by path.

### Evidence Path

```meta
type: value-object
```

A path to a screenshot or a recording, resolved against the git worktree root. Anything
resolving outside it is refused — a surface that will cite an arbitrary path is a surface that
will read one.

The HTML export inlines these as data URIs, so an exported report stays readable after the
worktree is gone. The Markdown one cites them, which is why the file has to stay where it was
produced.

### Telemetry

```meta
type: value-object
aliases: [tool activity, token usage, insight panel]
```

Tool calls, sub-agent use, and token usage, folded into the record by hooks running on tool
events. Nothing asks the agent to count anything, which is the entire point: a self-reported
number is an estimate wearing a measurement's clothes.

It is captured through a command hook that reads an event payload and writes a file — work a
prompt hook cannot do. On a host without command hooks the run is still tracked in full and the
panels simply have nothing to show, which is why this costs a column and not a capability group.

### Session Title

```meta
type: value-object
aliases: [session name, prefix]
related: [".devbook/arc42/adr/configuration.md"]
```

`<prefix>[:<context>] — <run title>`, computed from where the run's writes landed: a published
Artifact, one of the five devbook folders, or code, with the bounded context appended when the
winning files sit in exactly one. The record tallies kinds; the word each kind is shown as
comes from `components.delivery-surface-dashboard.sessionNaming.labels` in the repository's
stack config, where `null` means no prefix — and no rename, since an unprefixed copy of the run
title is worse than the host's own name — and `devbook` stands for all five folders. Kinds
sharing a word are tallied as one before the dominant kind is picked. `null` before anything
has been written, for the same reason.

### Handoff Marker

```meta
type: value-object
related: [".devbook/domain/delivery-surface-collector/domain.md#handoff-marker"]
```

The note a deliberately handed-off run leaves behind. It is what distinguishes a parked run from
an abandoned one — both look idle by every other signal, and only one should be reattached to.

## Viewer

```meta
type: aggregate
aliases: [page, panel, dashboard]
```

The three pages: the run timeline, the Mermaid diagram viewer, and the Markdown document viewer.
Each is served two ways from one file — inline where the host implements MCP Apps, and on a
loopback origin where it does not — with a bridge answering the page's own network calls as tool
calls so neither page learns which way it was loaded.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Navigation and view inspection are served over the plugin's own origin, never added as extra tools | page load | untested |
| One page file serves both transports | page load | untested |
| The HTTP side has no authentication, and reaching it already requires local access | server start | untested |
| A rendered view is a preview of a file that exists, never a replacement for it | render | untested |

### View

```meta
type: entity
```

One thing currently shown, with a history behind it. `push` drills into a related view and
leaves a breadcrumb the Back button walks; `replace`, the default, updates in place. The history
is what makes a drill-down steppable, so a view has identity within its viewer.

## Report Export

```meta
type: domain-service
related: [".devbook/domain/delivery-surface-dashboard/domain.md#run-record"]
```

Writes the run's report from what was recorded: prompt history, the stage table, each stage's
output and links, QA scenarios with their evidence, monitoring findings, the handoff note, and
the summary — as Markdown, or as self-contained HTML with the evidence inlined.

Invocation semantics: command-invoked, at the end of a run or long after it. It is a service
rather than behaviour on [Run Record](#run-record) because it produces an artifact outside the
record and reads across every part of it at once.

## Telemetry Capture

```meta
type: domain-service
related: [".devbook/domain/delivery-surface-dashboard/domain.md#telemetry"]
```

The hook that runs on tool events and folds tool calls, sub-agent use, and token usage into the
record, and warns when the session's context gauge crosses a threshold.

Invocation semantics: event-triggered, by the host, outside any run's control flow. It is the
one thing in this marketplace that measures a session rather than being told about it — which is
also why it is the one place this context is host-specific, structurally rather than by omission.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — surface,
> capability group, MCP server — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language).

### Idleness

```meta
type: term
date: 2026-09-08
aliases: [stalled, abandoned]
related: [".devbook/domain/delivery-surface-dashboard/domain.md#handoff-marker"]
```

A run whose session ended or that nothing has advanced for hours. It is derived on read and never
stored, because a stored idleness is indistinguishable from a stale one.

A deliberately parked run is idle by every one of those signals and is not abandoned. The handoff
marker is the only thing that separates them — and separating them is what a later `start_run`
needs in order to reattach to one and refuse the other.
