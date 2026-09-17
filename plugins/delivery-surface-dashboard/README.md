# delivery-surface-dashboard

The live dashboard a run is watched in — stages, output, QA evidence, and the report
at the end.

A surface: where work becomes visible, and nothing else. It declares no dependency,
names no engine, and knows nothing about what produced the runs it shows. Whichever
tool drives a run resolves these tool names from the live tool list at run time, so
installing this plugin is what makes runs visible and uninstalling it costs a view,
never a capability.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `delivery-surface-dashboard` with `/plugin`. Nothing else is required: the server
is plain Node with no npm dependencies, and it starts on the first tool call.

## What it implements

The three surface capability groups, all of them:

| Capability | Tools |
|---|---|
| `delivery.surface.lifecycle@1` | `open_dashboard` · `start_run` · `record_prompt` · `set_run_context` · `update_stage` · `finish_run` · `list_runs` · `get_run` |
| `delivery.surface.render@1` | `render_diagram` · `render_markdown` |
| `delivery.surface.export@1` | `export_report` |

Those eleven names are the whole tool surface. Viewer navigation, view inspection, and
anything else the pages need is served over the plugin's own HTTP origin rather than
added as a twelfth tool — a surface that declares more than the contract stops being
swappable for one that declares exactly it.

The tools are namespaced by whoever registered the server, so they surface as
`mcp__plugin_delivery-surface-dashboard_delivery-surface-dashboard__*` when installed as a plugin and as
`mcp__delivery-surface-dashboard__*` from a repository's own MCP configuration. Match by pattern,
never by one spelling.

## The three pages

| Page | Shows |
|---|---|
| Dashboard | The run list, each run's stages with status and output, QA scenarios with their evidence inline, the tool-activity and context panels, and a downloadable report |
| Diagram viewer | Mermaid source rendered live, pannable, with a history so a drill-down can be stepped back |
| Document viewer | Markdown rendered live |

Each is served two ways from the same file. A host that implements MCP Apps
(SEP-1865) reads it as a `ui://` resource and renders it inline in the conversation;
every other host opens it on `127.0.0.1` at an ephemeral port. `app-bridge.js` is what
makes one page work in both — it answers the page's own `fetch` and `EventSource` calls
with tool calls, so neither page learns which way it was loaded.

There is no authentication on the HTTP side: reaching it already requires local access
to the machine.

## What it records

One JSON file per run, outside the repository, keyed by the worktree path — a run
survives a session restart and never shows up in `git status`. Set
`DELIVERY_SURFACE_DASHBOARD_STATE_DIR` to put it somewhere else.

A run carries its stages with status, output, links, QA scenarios, and monitoring
findings; its prompt history; the change kind and the approval decision a human gate
recorded; and a handoff marker. Two derived things are never stored as status:
**idleness** — a run whose session ended or that nothing has advanced for hours — and
the **session title**, computed from where the run's output has actually landed so
that a list of parallel sessions can be read at a glance.

Telemetry is captured by hooks rather than self-reported: `telemetry-hook.mjs` runs on
tool events and folds tool calls, sub-agent use, and token usage into the run. That is
what fills the Insight and Context panels, and what lets the hook warn when the session's
context gauge crosses a threshold. Nothing about it asks the agent to count anything.

Only `hooks/hooks.json` is authored, and there is no root `hooks.json` beside it. A hook
that has to read an event payload and write a file is a command hook; the other host's
hooks are prompts, and a prompt cannot measure anything. On a host without command hooks
the run is still tracked in full — the panels simply have nothing to show.

## Naming the session

`start_run` and `update_stage` return a `sessionTitle` — `<prefix>[:<context>] — <run title>`
— derived from where the run's writes landed: `artifact` for a published Artifact, one of
`domain`, `arc42`, `tech`, `design`, `ai` for a devbook folder, `code` for anything else, and
`:<context>` when the winning files sit in exactly one declared bounded context. The runner
sets it as the session's name, per the surface contract's *Naming the session*.

The words are the repository's to choose, in its own entry of `.devbook/config.json`:

```json
"components": {
  "delivery-surface-dashboard": {
    "sessionNaming": {
      "labels": { "artifact": "Artifact", "devbook": "devbook", "code": null }
    }
  }
}
```

`labels` maps a kind to the word shown for it. The keys are `artifact`, `code`, the five
folder kinds, and `devbook`, which stands for all five at once — a folder's own key wins over
it. `null` means that kind carries no prefix: a run it dominates is not renamed, and the host's
own name stands. Kinds sharing a label are tallied as one before the dominant kind is picked,
so under one `devbook` word a run that wrote two chapters and two source files is a devbook
run. Nothing else is configurable. An unknown key or a bad value is reported on stderr and
takes the default rather than silently applying, and the file is re-read on every stage, so an
edit lands on the next stage rather than the next run. The entry is hand-edited: this plugin
materializes nothing and ships no install skill, so nothing else writes it — see
`.devbook/arc42/adr/configuration.md`.

## Evidence

QA evidence paths are resolved against the git worktree root and anything resolving
outside it is refused. The HTML export inlines evidence images as `data:` URIs, so an
exported report stays readable after the worktree is gone.

## Developing it

```bash
node dev/session-title-test.mjs
node dev/handoff-test.mjs
node dev/subagent-telemetry-test.mjs
node dev/session-title-integration-test.mjs
```

The last three drive the real server over stdio and the real telemetry hook as a child
process, the way a host does. `dev/test-host.mjs` is a minimal MCP Apps host for working
on the pages without one.
