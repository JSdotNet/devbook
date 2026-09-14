# delivery-surface-collector

The run recorder for when nobody is watching: stages, decisions, and evidence on
disk, and a Markdown report at the end. No page, no port, nothing rendered.

A surface: where work becomes visible **or recorded**, and nothing else. It declares
no dependency, names no engine, and knows nothing about what produced the runs it
records.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `delivery-surface-collector` with `/plugin`. Plain Node, no npm dependencies, no
listening socket.

## What it implements

Two of the three capability groups, and deliberately not the third:

| Capability | Tools | |
|---|---|---|
| `delivery.surface.lifecycle@1` | `open_dashboard` · `start_run` · `record_prompt` · `set_run_context` · `update_stage` · `finish_run` · `list_runs` · `get_run` | yes |
| `delivery.surface.export@1` | `export_report` | yes |
| `delivery.surface.render@1` | — | no |

The render names are absent on purpose. A caller resolves each group separately, so
it finds this one unanswered and renders nowhere, rather than finding a stub that
pretends to have shown someone something.

`open_dashboard` answers with `dashboardUrl: null` and `headless: true`. There is
nothing to open in a browser: say once that runs are being recorded rather than shown,
and carry on.

The tools are namespaced by whoever registered the server, so they surface as
`mcp__plugin_delivery-surface-collector_delivery-surface-collector__*` when installed as a plugin and as
`mcp__delivery-surface-collector__*` from a repository's own MCP configuration. Match by
pattern, never by one spelling.

## Why record without showing

A scheduled run, an unattended worker, a run in a terminal nobody is looking at: the
half of a surface that still earns its keep there is the half that outlives the
session.

| Kept | Why it matters later |
|---|---|
| Stage status, output, and how many times each finished | A stage repeated after a revise decision reads as repeated, not as one long stage |
| The approval decision a human gate returned | A resumed session re-runs the gate instead of trusting a conversation it cannot read |
| QA scenarios, their status, and evidence paths | The report cites the screenshot; the screenshot stays in the worktree that produced it |
| The handoff marker and its note | The next session reattaches to the run instead of opening a duplicate beside it |

One JSON file per run, outside the repository, keyed by the worktree path — runs
survive a session restart and never show up in `git status`. Set
`DELIVERY_SURFACE_COLLECTOR_STATE_DIR` to put them somewhere else.

## What it does not record

No token counts, no per-stage cost, no context gauge. Nothing here observes a
session, so those numbers would be a column of zeroes reading as a measurement rather
than as an absence. A surface that captures telemetry reports them; this one says
nothing about them, and a caller must never write them by hand.

Idleness is the one thing it derives rather than stores: a run nothing has advanced
for hours is reported `idle: true`, so an abandoned run is closed rather than
silently continued. A deliberately handed-off run is idle by the same signals and is
marked `handoffPending`, which is exactly the difference `start_run` needs to
reattach to one and refuse the other.

## The report

`export_report` writes Markdown, and only Markdown: a self-contained HTML report with
evidence inlined is a rendering job, and rendering is the half this surface does not
answer. Asking for another format still writes Markdown and says so in the result
rather than failing the run over a file extension.

The report carries the prompt history, the stage table, each stage's output and links,
QA scenarios with their evidence paths, runtime monitoring findings, the handoff note,
and the summary.

## Developing it

```bash
node dev/collector-test.mjs
```

Drives the real server over stdio the way a host does: the declared tool surface, a
run recorded end to end, the handoff round trip a resumed session depends on, and the
report written from what was recorded.
