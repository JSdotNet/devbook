---
name: surface-contract
description: The contract between the delivery engine and the surface a run reports and renders through — the three capability groups, how a delivery-surface-* server is bound and in what order, the reporting contract every flow follows, rendering content, and token insight.
---

# Surface Contract

The surface a run reports and renders through: what a surface is, how one is bound, and what
every flow tells it. The engine owns this contract and no surface ever reads it — a surface
implements the operation names below and nothing else. The stack config, the bindings, and
the host slots it refers to are `engine-contract.md` beside this file. Read this file once,
before the first `update_stage`.

## The Surface Capability

A surface is where a run becomes visible or recorded, and nothing else. It is resolved at
run time from the live tool list, is **never a dependency**, and no-ops when absent. The
capability is split by operation group, because an implementation may answer part of it.

| Capability | Operations |
| --- | --- |
| `delivery.surface.lifecycle@1` | `open_dashboard`, `start_run`, `record_prompt`, `set_run_context`, `update_stage`, `finish_run`, `list_runs`, `get_run` |
| `delivery.surface.render@1` | `render_diagram`, `render_markdown` |
| `delivery.surface.export@1` | `export_report` |

- **A surface is a server named `delivery-surface-*`.** Its tools surface as
  `mcp__plugin_<plugin>_delivery-surface-<x>__<op>` when a plugin provides it and as
  `mcp__delivery-surface-<x>__<op>` from a repository's own MCP configuration; the tool names
  and arguments are identical, only the prefix differs. Match both against the live tool
  list — an agent that hardcodes one spelling loses every surface tool under the other. The
  same operation names on a server with any other name are **not** a surface: a server is
  plugged in as a surface by being named one, and never by answering a name.
  A surface may arrive as a host canvas instead of an MCP server, and then the operation names
  are canvas actions: open the canvas once and invoke the action through whatever the host
  exposes for that. Canvas actions are matched by operation name.
- **A group is answered when its operation names are listed.** Resolve a group as absent until
  they are: a group an implementation promises is not a bound one.
- **Bind each capability group independently, in preference order,** and record which surface
  answered each in the run summary. The order is `bindings["delivery.surface"]` — a list of
  `delivery-surface-*` server names, first wins, which an overlay may set per machine. A name
  not installed is skipped, and an installed surface the list does not name comes after every
  one it does. Unset, surfaces are preferred in alphabetical order of server name, canvas
  actions last.
- **A surface that answers `unavailable` at open is skipped.** When `open_dashboard` returns
  `unavailable: true` the surface cannot serve this run — its application is closed or not set
  up. Say so once with the reason it gave, and try the next surface in preference order for
  the lifecycle group. This is decided once, at open, and never re-decided mid-run.
- **No surface bound is a normal outcome.** Produce the file artifacts, say once that no
  surface is attached, and never block a stage. A rendered view is never the source of truth.
- **Surface plugins declare nothing.** No dependency, no awareness of the engine — they
  expose the tool names above under a `delivery-surface-*` server name. That is exactly what
  makes them swappable.
- **If a capability resolves but a required operation errors**, treat it as a tooling failure:
  mark the run blocked and report the tool's error text. Do not fall back to chat-only
  tracking, which loses the run state. A surface that stops answering after the run started
  on it is this case, not the `unavailable` one.

## Reporting Contract

With `delivery.surface.lifecycle@1` bound:

- **Open once.** Call `open_dashboard` once per session and surface it per **Surfacing the
  Surface** below; the page updates itself live, so it is opened once and left open. Then
  call `start_run` with the skill's `skillId`, the full ordered stage list (its own stages
  followed by the shared phase names for its tier), the `changeKind` when known, and
  `sessionId` from the `session-id` host slot (`engine-contract.md`) when it is bound.
  `start_run` reattaches to an existing `in_progress` run for the same skill and returns
  `resumed: true`; continue from the first stage that is not `done` instead of restarting.
- **`sessionId` is optional on both sides.** It lets a surface attach the run to the session
  that drove it instead of guessing from worktree and time. A surface records it in a
  `sessionIds` array: a fresh run starts it, and a resumed run — a handoff — appends the new
  id beside the earlier ones, never replacing them and never recording one twice. A surface
  that ignores the argument stays conformant.
- **Persist gating state** with `set_run_context`: the `changeKind` as soon as it is
  determined, the `approval` decision recorded at every gate, and the resolved model.
- **Before each stage**, `update_stage` with `status: "in_progress"`; **after each stage**,
  again with `done`, `blocked`, or `skipped` and an `output` summary. The stage's completion
  count increments on every transition to `done`, so repeated passes after requested changes
  stay visible.
- **For a gate stage**, pass `links` for the started application and any review target, so the
  surface renders direct buttons instead of making the user copy commands.
- **For Validation**, also pass `scenarios` (one entry per tested scenario with
  `status: "pass"|"fail"|"flaky"`, `notes`, and optional evidence paths) and `monitoring` (the
  log and trace summary with any error findings), so evidence renders inline.
- **Keep the gate and `deliver` as separate stages.** Gate `deliver` on the approval recorded
  at Personal Validation, mark it `skipped` when there is no change set, and record all
  delivery-time changes under its stage output.
- **On a `revise` outcome**, record the decision, move the attached point's stage back to
  `in_progress`, and continue the same run through the repeated phases instead of starting a
  new one. Record `approval: "pending"` before handing back.
- **Mark Summary** `in_progress` then `done`, and call `finish_run` with the final status.

### Naming the session

`start_run` and `update_stage` return a `sessionTitle` derived from where this run's output
has actually landed, so a list of parallel sessions can be scanned by the kind of work each
one did.

- **When it is non-null and differs from the name you last set**, rename the session to it
  using whatever the host exposes for renaming the current session. Where the host exposes
  nothing, skip silently; it is a convenience, never a gate.
- **When it is `null`, do nothing.** Nothing has been written yet, or the repository chose no
  prefix for this kind of work; either way the host's own title is the better name.
- **Do not compose the name yourself.** The prefix is computed from observed writes and the
  words are the repository's configuration; hand-assembling one puts a second, drifting
  grammar into the session list.

### Surfacing the surface

A run the user cannot see is a run they cannot steer.

1. **Inline panel.** Where the host renders the surface inline on its own, nothing further is
   needed — do not also open a browser tab.
2. **Plain link.** Otherwise, give the user the URL to open themselves.
3. **No URL.** Where `open_dashboard` returns none, say once what it answered — the run is
   recorded, or it is in a window the user already has — and open nothing.

**The runner never opens a browser pane.** A pane is one host's own capability, and an
exact-match `tools` allowlist can only reach it under that host's own tool name, so
`flow-runner` carries none. A host that renders the surface inline still does; a user who
wants a pane opens the published link in one.

Publish it once — the page updates live, so re-publishing on later stages is noise. Never
block on it: the URL not reaching the user is a presentation problem, not a run problem.
Report it and continue.

## Rendering Content

`delivery.surface.render@1` is how a stage shows what it produced, and how a gate with
`show: "artifact"` presents the artifact it is asking about. It is a live preview beside the
file artifact, never a replacement for it.

- **Render a diagram** after a stage produces Mermaid output — C4, sequence, state and
  deployment diagrams; aggregate, context-map, domain-event-flow and subdomain-landscape
  diagrams; Mermaid-based wireframes and user flows. Raw SVG assets are unaffected and are not
  rendered.
- **Render a document** after a stage drafts or revises Markdown — ADRs, TDRs, arc42 sections,
  blueprints, domain model and interaction documents, design guidelines and reviews, how-tos,
  explanations, articles, proposals, and profile artifacts.
- **Render the same source the stage wrote to its file artifact.** Never regenerate or
  reinterpret it for the viewer.
- **The content plugin whose agent produced the artifact is never modified to know about a
  viewer.** That responsibility stays here, in the engine.
- **Open viewer URLs the way the surface itself is opened**, and leave them open alongside it.
  A rendered view the user never sees is no better than no view at all.
- **For a finished run**, `delivery.surface.export@1` writes the whole run — stages, output,
  evidence — to a self-contained file. Use it when the user wants something to keep or share
  rather than a live view.

## Context and Token Insight

A surface that captures telemetry reports context and token consumption automatically, from
the session's own tool calls and transcript. The flow-runner reads these; it never writes them.

- **Never invent, estimate, or hand-write token numbers** into stage output or the run
  summary. Keep stage output focused on what the stage did and produced.
- **Never read the headline input + output figure as context occupancy.** It counts the whole
  prompt, most of which is served from the prompt cache on later turns, so it can legitimately
  run to several times the model's context window. Compare stages on the **uncached** figure
  (input − cache reads + output), and read occupancy off the run-level gauge.
- **Read the uncached per-stage figure as the signal for which phase is expensive.** A stage
  whose uncached delta dwarfs the rest should be split or delegated, and is worth naming in
  the Summary as a qualitative observation.
- **Read the sub-agent subtotal the opposite way:** it is the share of a stage kept *out* of
  the owner session's context window. A heavy stage with a large subtotal is delegation
  working; a heavy stage with none ran inline and charged the whole run for it. Build & Test
  and Validation are delegated by default, so a zero subtotal on either is a finding.
- **Act on the run-level gauge before it forces compaction.** The ladder is in
  `flow-execution-model.md`: **Delegation Order** first, then **Session Handoff**
  once delegation is no longer enough. The gauge ignores sub-agent samples, so delegating
  genuinely relieves the owner session rather than relabelling the cost.
- **Attribution is session-wide.** Any model call made while a run is `in_progress` is
  attributed to that run, including unrelated work in the same session. That is the reason for
  the one-flow-per-session rule; read the numbers as an upper bound when other work happened
  alongside.
