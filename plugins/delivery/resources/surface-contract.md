---
name: surface-contract
description: The contract between the delivery engine and everything a repository plugs into it — the closed set of flow extension points (services and chores), the gates mechanism, the .devbook/config.json stack config and its gitignored .devbook/config.local.json overlay, the host slots, and the surface capability a run reports and renders through.
---

# Surface Contract (Engine-Owned)

Everything outside the engine that a flow talks to is named here: the points a repository
plugs providers into, the gates it adds, the host slots it binds, and the surface a run
reports through. Read this file once, before the first `update_stage`.

Three rules hold across all of it, and they are the reason the engine stays reusable:

1. **The engine names; the repository fills.** The point set, the gate mechanism, the policy
   keys, and the surface capabilities are closed and declared here. A repository picks what
   runs at a point; it never invents a point, a policy key, or a stage.
2. **Configuration chooses among behaviour the engine already implements.** It never
   introduces new behaviour. A repository that needs a different stage sequence writes a
   repo-native `flow-*` skill, which takes precedence for the categories it covers.
3. **A lower layer never names a higher one, and the engine names no specialist.** It names
   points, roles, and capabilities; a repository names the plugin that fills one. No
   specialist, content plugin, or surface is ever modified to know about the engine, and the
   `your-*` and `repo:*` ids below are placeholders — for whatever you installed, and for a
   skill the repository writes itself. Every other id in an example names a skill that ships.

## The Stack Config

`.devbook/config.json`, repo-scope and committed. The engine owns four top-level keys
and never edits another component's. `components` belongs to each component's own install skill.

The path is a path, not a dependency: the engine reads that file whether or not the repository
adopted a single devbook folder, and `devbook` being absent costs nothing here.

```json
{
  "bindings": {
    "delivery.tracker": { "provider": "github" },
    "delivery.roles": {
      "architecture": "your-architecture-plugin",
      "qa":           "your-qa-plugin",
      "domain":       "your-domain-plugin",
      "ux":           "your-ux-plugin",
      "docs":         "your-docs-plugin",
      "product":      null,
      "security":     null
    },
    "delivery.mcp": {
      "spec":        [ "your-guidelines-server" ]
    }
  },
  "extensions": {
    "session.start": [ "devbook:devbook-check" ],
    "spec":          "your-architecture-plugin:draft-spec",
    "implement":     "your-coding-plugin:coding",
    "validate":        "your-coding-plugin:coding",
    "data.prepare":  [ { "run": "repo:seed-test-data", "on-failure": "required" } ],
    "app.start":     { "provider": "your-qa-plugin:qa", "host": "aspire" },
    "qa.run":        { "provider": "your-qa-plugin:qa" },
    "verify":        "devbook:verify-change",
    "flow.end":      [ "repo:capture-improvement" ]
  },
  "policy": {
    "qa.depth":               "targeted",
    "validate.retryBudget":     2,
    "gate.reviseBudget":      3,
    "commit.at":              "gate",
    "pr.required":            true,
    "pr.base":                "main"
  },
  "gates": [
    { "at": "spec", "when": "after", "purpose": "approval",
      "prompt": "Spec approved, or revise?", "show": "artifact", "unattended": "block" }
  ]
}
```

- **The file is optional.** Absent, every point falls back to its default provider, no extra
  gate exists, and every policy key takes the default in the table below. A malformed file is
  reported once and then ignored; it never blocks a run.
- **An unknown key is rejected, not ignored** — the same way a plugin manifest rejects an
  unknown field. Report it by name and stop, so a typo is never a silently absent setting.
- **`null` means deliberately unbound**, which is different from absent. Absent means nobody
  has decided; `null` means somebody decided no.
- **No model ever appears in this file.** Model choice is personal — see
  `flow-model-selection.md`.
- **No secrets.** The file is committed. A credential pointer belongs in the repository's
  `start` skill, and the value belongs in a secret store.
- **Validate it before trusting it.** `node tools/stack-config/check.mjs [path]` checks the
  four engine-owned keys against `resources/config.schema.json` and exits non-zero on
  the first problem. It ignores `components`, which each component validates itself, and
  rejects by name any *other* top-level key — the only two owners are the engine and a
  component, so a third name is a misspelling of one of them.
  `resources/config-template.json` is a filled-in starting point.

### The local overlay

`.devbook/config.local.json`, machine-scope and **gitignored**. Optional, absent by default,
and the answer to the one thing the committed file cannot express: a setting true of your
machine and nobody else's. Without it the only way to run QA shallower than the team does is
to edit the committed file and remember not to commit it, which is how a personal preference
becomes everyone's next merge conflict.

It carries the same four keys, validated against the same schema, and merges over the
committed file:

| Shape | Merges by |
| --- | --- |
| Object | Key by key, the overlay winning. A sibling the overlay does not name is left standing. |
| Array | Replaced whole. A chore list is an ordered whole, and half of one from each file is a run nobody wrote down. |
| `gates` | **Appended.** The overlay can add a checkpoint and has no way of spelling the removal of one. |
| `null` | A value — deliberately unbound — never a delete. |

Four things it may not say, and the checker refuses each by name:

| Refused | Because |
| --- | --- |
| `components` | A stamp is repo-scope and committed; an overlay is neither. |
| `policy.pr.required` | What the repository produces, not how one machine runs it. |
| `policy.qa.ceiling` | The ceiling is the repository's limit. `qa.depth` is your choice inside it. |
| `policy.gate.personalValidation` | The mandatory gate. Already `const` in the schema, and named here so the refusal states the invariant rather than a type error. |

That list is the whole safety story, and it is worth stating plainly: **a gitignored file must
never be able to weaken what a reviewer sees.** Everything a reader of the committed config
would conclude about the gates a run passes, the pull request it opens, and the deepest QA it
may reach stays true no matter what any overlay says. What an overlay changes is the cost and
the wiring of your own run — shallower QA, a local role binding, a different MCP server, a
zeroed retry budget, an extra checkpoint of your own.

`check.mjs` finds the overlay beside the file it is given rather than taking a second path, and
validates three times over: what the overlay may not say, whether it is well-typed alone, and
whether the merged result still validates — the third catching the pair that is only wrong
together. `resources/config.local-template.json` is a starting point.

**Gitignored is not private.** No model and no secret, the same as the committed file: an
overlay is read by every agent in your session and pasted into a bug report as readily as
anything else.

## Extension Points

The point set is closed. Every point is either a **service** — exactly one provider,
returning a result the flow acts on — or a **chore** — zero or more, in declared order,
producing side effects and a report.

| Point | Kind | When | Contract |
| --- | --- | --- | --- |
| `session.start` | chore | Once, before the first flow | Load context, check environment and tooling, warn early. Distinct from the host's own session-start hook, which is settings-level and knows nothing about flows. |
| `flow.start` | chore | After Stage 0 resolves scope | Augment the scope record with repository-specific constraints. May not redefine it. |
| `spec` | service | Specification and architecture intake | Scope and acceptance criteria → the specification the rest of the flow builds on. Unbound: the flow-runner writes it inline. The highest-value gate attaches here. |
| `implement` | service | The implementation stage | An area plus a change brief, or a `validate` failure to repair → a change set and what was tested. Unbound: the flow implements inline with generic practice and says so in the summary. |
| `validate` | service | After each `implement` pass | An area and its change set → build result, suite results, failing targets with the error lines that matter. Default provider: `phase-build-test`. |
| `data.prepare` | chore | Before `app.start` and `qa.run` | Seed data, fixtures, credentials. The most repository-specific point in the set — usually a `repo:` skill. |
| `app.start` | service | Runtime is needed | Start the application → base URLs, a health verdict, a log and trace stream. Default provider: `phase-qa-validation`. |
| `qa.run` | service | QA depth is not `skipped` | Scenarios → evidence. Default provider: `phase-qa-validation`. |
| `deliver` | service | After approval | Open the change for review and update the work item. Default provider: the `pr-lane` slot plus the bound tracker. |
| `verify` | service | After `deliver` | The specification the run built on, the governed chapters the change set touches, and the change set → one verdict per item — `aligned`, `spec-ahead`, `code-ahead`, `conflict`, `unresolved` — with the evidence that settles it and what each calls for. Report-only: it edits nothing and commits nothing. Unbound: the flow-runner reaches the verdicts itself. |
| `flow.end` | chore | Always, last | Contribute to the run summary and capture what this run learned. |

**Services decide; chores contribute.** A chore may fail, and its failure is fatal when it
declared `on-failure: "required"` — but a chore can never alter the flow's decision, rewrite
a stage's result, or stand in for a gate. Without that line an injected chore becomes an
invisible second implementation of the flow, which is the thing the engine exists to prevent.

**Declaring a provider.** A service takes one provider — a string, or an object whose
`provider` key names it and whose other keys are options that provider understands. A chore
takes an array, each entry a string or `{ "run": …, "on-failure": "required"|"advisory" }`;
`advisory` is the default and puts a failure in the summary instead of stopping the run.

A provider id is `plugin:skill`, a bare `plugin` (resolved through its role), or
`repo:<skill>` for a repo-native skill the host loads with no marketplace involved. A
provider that does not resolve degrades to the point's unbound behaviour, named once in the
run summary — never a silent skip, and never a reason to fail the run.

## Gates

A gate is the human-in-the-loop mechanism. It presents the output of the point it is attached
to and asks a question about it.

**The asymmetry is what makes gates safe: configuration may add a gate anywhere; it may never
remove one or hand one to a plugin.** Adding a human checkpoint can only make a flow more
conservative. Removing one is the only direction that can weaken it, so that direction stays
closed. Personal Validation is the mandatory instance of this pattern — one row in the table
below, not a second mechanism.

| Field | Values | Means |
| --- | --- | --- |
| `at` | any point name | The point the gate attaches to. |
| `when` | `before`, `after` | Which side of that point. |
| `purpose` | `approval`, `resource`, `cost`, `risk`, `handoff` | What kind of question this is, which decides what it must show. |
| `prompt` | free text | The question, in the user's terms. Optional; the purpose supplies a default. |
| `show` | `artifact`, `summary`, `none` | `artifact` renders the point's output through the surface — the specification itself, not a description of it. Default `summary`. |
| `unattended` | `block`, `proceed`, `skip-point` | What an unattended run does here. Default `block`. |

| Purpose | Typical placement | What it must show |
| --- | --- | --- |
| `approval` | after `spec` | The specification itself, rendered. The one most repositories should turn on. |
| `resource` | before `app.start` | Just the question — "only one runtime instance runs here, OK to start?" |
| `cost` | before `qa.run` | An estimate. A gate that cannot say what it is about to spend is not helping anyone decide. |
| `risk` | after `validate` | What the change set actually touched — migrations, auth, a public contract. |
| `handoff` | Personal Validation | The code review, the QA evidence, the running application, and what to check by hand — assembled by `skills/phase-personal-validation/SKILL.md`. |

### Three outcomes, not two

| Outcome | Effect |
| --- | --- |
| `approve` | Continue. |
| `revise` | Re-run the point the gate is attached to, carrying the human's notes as input. The flow moves backwards, deliberately. Bounded by `policy.gate.reviseBudget`; when the budget is spent the flow stops and says so rather than cycling on something nobody can settle. |
| `decline` | Stop. Mark the stage `blocked`. **Never a silent skip** — "don't start the app" must not degrade into "continue without QA". |

Attach a gate to the point you would want re-run. `{ "at": "spec", "when": "after" }` and
`{ "at": "implement", "when": "before" }` sit in the same place in the sequence, but only the
first makes `revise` mean "write the specification again".

### Unattended runs

Many runs are unattended: `delivery-schedule`'s `schedule-*` entry points fire on a cadence,
and a spawned worker session has no user turn. A gate that waits for a human would deadlock all of
them, so `unattended` defaults to `block`, and `block` means **park with a handoff brief** —
what is done, what is not, the exact resume invocation — not "wait forever". An unattended run
that parks after `spec` with the specification in its brief is strictly better than one that
implements something speculative for an hour first.

`proceed` is for a gate that only exists to inform an attended run. Reach for `skip-point`
rarely: a gate on `app.start` that skips the point silently drops QA, which is the
degradation the `decline` row exists to prevent.

## Policy

Every key is a closed enum or a number, and every key has a documented default, so an absent
key means the engine's own choice rather than undefined.

| Key | Values | Default |
| --- | --- | --- |
| `qa.depth` | `full`, `targeted`, `startup-only`, `skipped` | change-kind selection in `phase-qa-validation` |
| `qa.ceiling` | same set | `full` |
| `validate.retryBudget` | integer ≥ 0 | `2` |
| `gate.reviseBudget` | integer ≥ 0 | `3` |
| `gate.personalValidation` | `required` | `required` — the key states the fact, it cannot soften it |
| `commit.at` | `gate`, `manual` | `manual` |
| `pr.required` | boolean | `true` |
| `pr.base` | a branch name | the repository's default branch |
| `phases.updateBase` | boolean | `true` |
| `phases.verification` | boolean | `true` |
| `phases.workItemUpdate` | boolean | `true` |

`commit.at` is the one policy key that binds a stage running long before the phase that
defines it: `gate` makes Personal Validation the flow's single commit point, so **no earlier
stage commits** and every `implement` provider is briefed to leave committing to that phase.
The mechanics — one commit per handback, a new commit per revise round — are in **Personal
Validation** (`flow-phases.md`). `manual` leaves committing to the user.

`pr.base` is the one value that is neither enum nor number. The check validates its *shape* —
a well-formed git ref name, so free prose is rejected by pattern — and nothing more. Whether
that ref exists is resolved against the remote at flow time — Update Base fetches it, the
pull-request lane opens against it — because a config check that reached for the network would
fail offline, in a fresh repository with no remote, and on a base branch not yet pushed.

**QA depth resolves in one order, highest first:** `policy.qa.depth` here, then
`phase-qa-validation`'s change-kind selection. The first one present wins, and
`policy.qa.ceiling` caps the result however it was reached. The repository's `start` skill
describes the application and never sets a depth. `qa.depth` may be overlaid per machine,
`qa.ceiling` may not.

## Bindings

A role, a tracker, and a host slot are bound per repository and are **never** plugin
dependencies: one missing specialist must not demote every skill that names it.

- **Roles.** `architecture`, `qa`, `domain`, `ux`, `product`, `security`, `docs`. A skill names the
  role; `bindings["delivery.roles"]` says which plugin fills it. Every role reference states
  its fallback, so no flow is ever dead because a role is unbound — a stage reads
  *preferred: role `architecture`; fallback: inline, using the ADR template in
  `instructions/`*. A role bound to a plugin nobody has enabled is a warning naming both
  files, not a failure.
- **Tracker.** `bindings["delivery.tracker"]` names the work-item system: `github` resolves
  items to issues, `jira` to tickets in a named project, `markdown` to chapters in a folder
  the repository names, for one that plans work as Markdown. Operations: `find_item`, `read_item`,
  `create_item`, `comment`, `transition`, `link_change`. Unbound, a flow runs to its file
  artifacts and opens, comments on, and transitions nothing.
  Every operation resolves the same way, reported once when it first does: the bound tracker's
  own tooling first — an installed tracker plugin skill or MCP integration — then the host's
  CLI for that tracker. A skill names the operation and never the provider's command.
- **MCP servers.** `bindings["delivery.mcp"]` says which servers each point uses, by the id
  the repository's own MCP configuration declares — `{ "spec": ["your-guidelines-server"] }`.
  A stage resolves the servers of the point it serves from the live tool list, by pattern,
  since a host may namespace them. A server that does not answer is reported once, and the
  stage continues on the repository's own instruction files and chapters — it costs that
  stage its grounding, never the run. An absent point takes the engine default in **MCP
  Server Strategy** (`flow-execution-model.md`); `null` binds none. The engine
  names no server of its own beyond those defaults, and no server is ever a dependency;
  `resources/mcp-template.json` and `resources/mcp-vscode-template.json` declare the
  defaults in each host's shape for a repository to copy.
- **Implementation is not a role.** It owns a phase, carries a toolchain, and loops with
  validation, so it binds as the `implement` and `validate` services above rather than as an
  advisor a stage delegates a question to.

## Host Slots

A shared skill never names a host's own file. It names a slot. A slot is **bound, never
branched**: the skill reads `repo-instructions`; it does not contain an if-this-host clause.
No plugin ships bindings, so a slot resolves from what the running session offers, from
`bindings["delivery.slots"]` where a repository sets one — `repo-instructions` and
`pr-lane` only — or to the unbound default below, which
is the normal case and never a gap.

| Slot | What it resolves to | Unbound |
| --- | --- | --- |
| `repo-instructions` | The repository's root agent instruction file | Read `AGENTS.md` if present, else nothing |
| `model-override` | Where a user's personal model preferences live | Category defaults |
| `stage-delegation` | Whether sub-agents are available | Run stages inline |
| `surface` | Which surface plugin provides the capabilities below | No surface; file artifacts only |
| `pr-lane` | The pull-request CLI or API | No pull request — `deliver` produces file artifacts only |

**Behavioural divergence is a capability, not a host.** `stage-delegation` asks whether
sub-agents exist, not which host is running, so a stage declares an optional delegation hint
and the slot decides. `pr-lane` gates on the CLI being present, not on the host. That is what
keeps two hosts from re-diverging the moment one gains a feature.

## The Surface Capability

A surface is where a run becomes visible or recorded, and nothing else. It is resolved at
run time from the live tool list, is **never a dependency**, and no-ops when absent. The
capability is split by operation group, because the known implementations do not implement
the same half of it.

| Capability | Operations | dashboard | collector | canvas |
| --- | --- | --- | --- | --- |
| `delivery.surface.lifecycle@1` | `open_dashboard`, `start_run`, `record_prompt`, `set_run_context`, `update_stage`, `finish_run`, `list_runs`, `get_run` | yes | yes | no |
| `delivery.surface.render@1` | `render_diagram`, `render_markdown` | yes | no | yes |
| `delivery.surface.export@1` | `export_report` | yes | yes | no |

- **Resolve by pattern, never by literal tool name.** A plugin-provided MCP server is
  namespaced with the plugin that provides it, so the same server surfaces as
  `mcp__plugin_<plugin>_<server>__<tool>` when installed as a plugin and as
  `mcp__<server>__<tool>` when registered in a repository's own MCP configuration. The tool
  names and arguments are identical; only the prefix differs. Match against the live tool
  list. An agent that hardcodes one spelling loses every surface tool under the other.
  A surface may arrive as a host canvas instead of an MCP server — `delivery-surface-canvas` does —
  and then the same operation names are canvas actions: open the canvas once and invoke the
  action through whatever the host exposes for that. Match the operation names, not the
  transport.
- **Bind each capability independently, in a fixed priority order,** and record which
  implementation answered in the run summary: dashboard before collector before canvas.
- **No surface bound is a normal outcome.** Produce the file artifacts, say once that no
  surface is attached, and never block a stage. A rendered view is never the source of truth.
- **Surface plugins declare nothing.** No dependency, no awareness of the engine — they
  expose the tool names above. That is exactly what makes them swappable.
- **If a capability resolves but a required operation errors**, treat it as a tooling failure:
  mark the run blocked and report the tool's error text. Do not fall back to chat-only
  tracking, which loses the run state.

## Reporting Contract

With `delivery.surface.lifecycle@1` bound:

- **Open once.** Call `open_dashboard` once per session and surface it per **Surfacing the
  Surface** below; the page updates itself live, so it is opened once and left open. Then
  call `start_run` with the skill's `skillId`, the full ordered stage list (its own stages
  followed by the shared phase names for its tier), and the `changeKind` when known.
  `start_run` reattaches to an existing `in_progress` run for the same skill and returns
  `resumed: true`; continue from the first stage that is not `done` instead of restarting.
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
- **When it is `null`, do nothing.** Nothing has been written yet, so the host's own title is
  the better name.
- **Do not compose the name yourself.** The prefix is computed from observed writes;
  hand-assembling one puts a second, drifting grammar into the session list.

### Surfacing the surface

A run the user cannot see is a run they cannot steer.

1. **Inline panel.** Where the host renders the surface inline on its own, nothing further is
   needed — do not also open a browser tab.
2. **Plain link.** Otherwise, give the user the URL to open themselves.

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
