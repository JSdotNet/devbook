# Plugin Authoring

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#plugin-authoring"]
```

What this context is responsible for: that an asset written once loads correctly in every host
that reads it, and that a plugin can be installed on its own.

Inside the boundary: the folder shape of a plugin, the two manifests, the frontmatter each host
requires, the marketplace listing, and the vocabulary in [domain.md](domain.md#ubiquitous-language).

Outside it: how a host resolves or ranks what it loaded, and anything the assets themselves are
used to build. A plugin that orchestrates .NET delivery work says nothing here about .NET.

**This is the one context here that is not a plugin.** Every other context in
[the map](../context-map.md) is one plugin folder, and this is the language all of them are
written in — a [shared kernel](../context-map.md#plugin-authoring) rather than a supplier. What
that means in practice: a change to the plugin folder shape, the manifest pair, the layer order,
the stamp, or a migration is a change to nine contexts at once, so the kernel stays small on
purpose and a term earns a place in it only by being true of every plugin.

A term that is true of one plugin lives in that plugin's own `domain.md` instead, with a
`related` link back to whatever kernel term it refines.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The kernel vocabulary, and the whole of this context: a term belongs here only when it is true
> of every plugin. Where one plugin refines a kernel term into its own vocabulary, the refinement
> lives in that plugin's context and points back here — [Schedule](#schedule) is a kind of trigger
> here and four parts in [Delivery Schedule](../delivery-schedule/domain.md#ubiquitous-language);
> [Flow Skill](#flow-skill) names a scope against its neighbours where
> [Delivery](../delivery/domain.md#flow) says what one is made of. Where a host uses a different
> word for the same thing, the host's word is recorded as an alias rather than adopted.

### Marketplace

```meta
type: term
related: [".devbook/arc42/adr/1-marketplace-named-jsdotnet.md"]
```

A repository that offers plugins for installation, identified by the `name` in
`.claude-plugin/marketplace.json`. That name is the local primary key: a host keys its
registry, its cache, and every `plugin@marketplace` reference by it, so two marketplaces one
user has added may not share a name. This repository's marketplace is `jsdotnet-devbook`.

### Plugin

```meta
type: term
related: [".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/domain/plugin-authoring/domain.md#layer"]
```

One folder under `plugins/`, holding assets that belong together, installable on its own and
listed once in the marketplace. It may declare a hard dependency on a plugin in a lower layer,
which the host enforces and which makes an illegal combination unreachable; it must never
depend on a role, a tracker, or a surface — those are bound per repository or resolved from the
live tool list, and a missing one must cost capability, not loading.

### Host

```meta
type: term
aliases: [client]
```

A tool that loads a plugin's assets: Claude Code or GitHub Copilot. Hosts read the same files
and ignore the keys they do not recognise, which is why an asset has one authored copy.

### Agent

```meta
type: term
```

A named persona with its own tool allowlist, as `agents/<role>.agent.md`. Copilot calls it a
custom agent, Claude a subagent. Delegation targets live in the body prose, because only one of
the two hosts reads a `handoffs` key.

### Skill

```meta
type: term
```

A procedure a host loads on demand, as `skills/<name>/SKILL.md`. Its `description` is the
trigger — the sentence a host matches a request against — not a summary of its contents.

### Plugin Rule

```meta
type: term
```

A scoped rule set, as `rules/<name>.md`, with the paths it governs declared beside it in
`rules/rules.json`. Named for the file it becomes: a plugin's `rules/` folder and the
`.agents/rules/` an install writes hold the same names, so a rule referencing a sibling resolves in
both. Every plugin rule is delivered: no host applies one from inside a plugin, so it reaches a
session only where the plugin's install skill has written it into a repository, with each host's
wrapper beside it. Shared text an asset reads by path is a [contract](#contract), not a rule.

### Contract

```meta
type: term
```

Reference an asset points at by path, as `resources/<name>.md`, carrying `name` and
`description` and no scope of its own — the surface contract, the schedule catalog contract,
the issue sweep state contract. It is loaded by the explicit reference and by nothing else, so
a contract no skill or agent names is unreachable. It takes the rule budget, because it is the
same kind of prose, and it stays over that budget by kind. Distinct from a
[plugin rule](#plugin-rule), which exists to be installed somewhere else.

### Hook

```meta
type: term
```

A host-executed action bound to a session event. The two hosts disagree on what a session-start
hook may be, so the event, not the intent, decides the form it takes.

### Devbook Folder

```meta
type: term
date: 2026-09-07
related: [".devbook/arc42/adr/35-the-word-knowledge-is-retired.md", ".devbook/arc42/adr/78-one-layout-under-devbook.md"]
```

One of the five folders the `devbook` convention governs — `arc42`, `domain`, `tech`, `design`,
`ai` — holding addressed Markdown **chapters**, each carrying a fenced `meta` block, at
`.devbook/<name>/`. A repository adopts any subset; there is one layout.

The convention's own name is the only noun for these; there is no common-noun synonym, because
a convention that has a name does not need one. What `_meta/graph.json` derives from their
`meta` blocks is the **reference graph**.

### Flow Skill

```meta
type: term
date: 2026-09-02
related: [".devbook/ai/02-deliver.md#flow-skills"]
```

A staged procedure for one category of work, run start to finish inside one session, ending at
the personal validation gate. `flow-<category>`, one per category.

Four neighbours share the vocabulary and are not interchangeable with it:

| Prefix | Scope |
| --- | --- |
| `flow-` | One session, delegating to subagents. Never to another session. |
| `fleet-` | Fan-out across sessions and worktrees. This one is orchestration. |
| `phase-` | A shared step inside a flow — build and test, QA validation, personal validation. Never invoked directly. |
| `schedule-` | Work that runs with nobody watching: an entry point that picks its own input, and the three skills that put its trigger in the host's scheduler. |

A prefix marks a procedure's scope against its neighbours, so a plugin whose skills all share
one scope needs none: `devbook-config` holds `setup`, `update`, `ask`, and `adoption` bare,
and the plugin name carries what a prefix would have.

Each prefix names one scope and no prefix names two, which is why none of them is called after
*orchestration* — the word covers fan-out and single-session staging at once, and survives here
only as the English description of what `fleet-` does. `delivery` holds four `flow-*` — one
for the code and one for the five devbook folders, since
[flows belong to delivery](../../arc42/adr/34-flows-belong-to-delivery.md) —
and three `phase-*`, `delivery-schedule` holds thirteen `schedule-*` beside a bare `install`, and
`fleet` holds three
`fleet-*`.

A plugin takes its subsystem's stem; the things inside it are named for what they are. So
`delivery`, `delivery-surface-dashboard`, and `delivery-surface-collector` are packages of one
subsystem while `flow-code` and `phase-build-test` are the procedures inside them — which is
why a surface is `delivery-surface-dashboard` and never `flow-dashboard`. A surface that answers
a contract other surfaces answer carries the contract word after the stem and the
implementation after that, so the three are read as one kind from the marketplace list alone;
see [the decision](../../arc42/adr/33-surfaces-carry-the-surface-word.md).
A surface interchangeable with nothing does not — see
[the decision](../../arc42/adr/36-devbooks-canvas-carries-no-surface-word.md).
`fleet` is its own stem, not a package inside `delivery`, because fan-out is a different
subsystem.

### Fleet Skill

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#flow-skill", ".devbook/arc42/adr/22-fan-out-is-its-own-plugin.md"]
```

A procedure that turns one queue into work across several sessions, each in its own worktree —
`fleet-<what it sweeps>`. It is the exception a [flow](#flow-skill) is forbidden from being: a
flow owns a run, a gate, and a user turn, none of which survives a session boundary, so
fan-out is a different subsystem rather than a bigger flow.

Three words carry the whole shape. A **sweep** triages a queue, claims what it picks, and
dispatches. A **worker** is one spawned session resolving one item. A worker **parks** when its
change cannot prove itself — committed, left in its worktree, with a brief naming what a human
has to look at — and opens a pull request only when it can.

A fleet skill owns no run and holds no gate. `fleet-resolve-issue` trades Personal Validation
for a narrower guarantee, not for nothing: the pull request is the review surface, and a change
that cannot demonstrate itself never reaches one.

### Schedule

```meta
type: term
date: 2026-09-07
aliases: [routine, automation]
related: [".devbook/domain/plugin-authoring/domain.md#flow-skill", ".devbook/arc42/05-building-block-view.md#schedule-plugin", ".devbook/arc42/adr/26-the-unattended-lane-is-its-own-plugin.md"]
```

A trigger that fires a procedure the stack already ships, in a cloud session that starts with
nothing but the repository: a cadence, a target skill, the plugins that skill needs, and a
prompt self-contained enough to run it with nobody watching. A schedule is a trigger and never
a procedure — the `schedule-*` entry point is what runs; the schedule is what asks.

Both hosts ship the capability under their own name: **Routines** in Claude Code,
**Automations** in the GitHub Copilot app. Neither word is adopted, because adopting one would
name a host; *schedule* is the term and both are aliases of it.

Four words carry the shape. An **entry point** is a `schedule-*` skill that picks its own
input, so it needs no person to hand it one. The **catalog** is the set of schedule files a
plugin ships. The **preamble** is the unattended rules every prompt starts with, stated once.
The **scheduler** is whatever the live session exposes that turns a name, a cron expression, a
repository, and a prompt into a scheduled session — resolved by capability, and absent as a
normal outcome.

A schedule names an entry point, a `fleet-*` skill, or a read-and-report skill, never a
[flow](#flow-skill): a flow ends at a gate, and an unattended run parks where a gate would be.

### Extension Point

```meta
type: term
date: 2026-09-03
related: [".devbook/arc42/adr/9-the-point-set-is-closed.md"]
```

A named place in a flow where a repository plugs a provider in. The set is closed and declared
by the engine: a repository picks what runs at a point, never what the points are.

A point is one of two kinds, and the difference is authority, not cardinality:

| Kind | Cardinality | Returns | May change the outcome |
| --- | --- | --- | --- |
| Service | Exactly one provider | A result the flow acts on | Yes — that is the point |
| Chore | Zero or more, in declared order | Side effects and a report | Never |

`spec`, `implement`, `validate`, `app.start`, `qa.run`, `verify`, and `deliver` are services.
`session.start`, `flow.start`, `data.prepare`, and `flow.end` are chores. A
chore may declare itself required and stop the run when it fails; it still may not rewrite a
stage's result or stand in for a gate.

### Gate

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#extension-point"]
```

A human checkpoint attached to an extension point. It presents that point's output and asks a
question with three answers: *approve* continues, *revise* re-runs the point carrying the
human's notes, and *decline* blocks the stage — never a silent skip.

Configuration may add a gate anywhere and may never remove one or hand one to a plugin, which
is the asymmetry that makes gates safe: adding a checkpoint can only make a flow more
conservative. Personal Validation is the mandatory instance of the same pattern, not a second
mechanism. An unattended run parks at a blocking gate with a handoff brief; it never waits, and
it never self-approves.

### Surface

```meta
type: term
date: 2026-09-03
related: [".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/adr/2-one-folder-per-plugin.md", ".devbook/domain/plugin-authoring/domain.md#mcp-server"]
```

Where work becomes visible or recorded, and nothing else. A dashboard, a canvas, and a headless
collector are three implementations of one capability, split by operation group — lifecycle,
render, export — because they do not implement the same half of it.

A surface is never a dependency in either direction: the thing being rendered knows no surface
exists, and the surface knows nothing about what produced its input. Whichever tool opens it
resolves it at runtime, by pattern, from the live tool list. **Absence is a normal outcome:**
the run produces its file artifacts, says so once, and continues — it costs a view, never a
capability.

Three ship here. `delivery-surface-dashboard` answers all three groups, `delivery-surface-canvas`
render only, and `delivery-surface-collector` lifecycle and export only. Each declares exactly
the tool names its groups name and nothing more, which is what makes one substitutable for
another. See
[the decision](../../arc42/adr/15-three-surfaces-one-contract.md).

A surface is not required to be an MCP server. `delivery-surface-canvas` is a Copilot canvas and
nothing else, so its two operations arrive as canvas actions rather than namespaced tools —
which is why the contract matches operation names and never a transport. See
[the decision](../../arc42/adr/18-delivery-surface-canvas-ships-the-canvas-only.md).

The fourth, `devbook-graph`, ships in `devbook` beside the checker whose modules it
imports, renders the reference graph `_meta/graph.json` produces, and opens a single chapter
beside its parsed `meta` block in a second canvas, `devbook-chapter`. It answers no operation
group and substitutes for nothing, which is why it takes devbook's stem and the thing it
draws rather than the surface word — see
[the decision](../../arc42/adr/36-devbooks-canvas-carries-no-surface-word.md).
It is packaged inside the `devbook` plugin folder rather than alone, and imports that plugin's
generator modules by relative path — no host resolves the two together, so this is a source
coupling to undo, not a dependency to declare. See
[the decision](../../arc42/adr/5-devbook-still-ships-the-graph-canvas.md).

### Host Slot

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#host", ".devbook/arc42/05-building-block-view.md#host-slots"]
```

A name a shared asset reads instead of a host's own file: `repo-instructions`,
`model-override`, `stage-delegation`, `surface`, `pr-lane`. A slot is
bound, never branched — an asset that carries an if-this-host clause has not used a slot.

Behavioural divergence binds as a capability rather than as a host: `stage-delegation` asks
whether subagents exist and `pr-lane` whether the CLI is present, so neither re-diverges the
moment one host gains a feature.

The set is closed and every slot has a documented unbound behaviour, so unbound is a resting
state rather than a gap. No plugin binds a slot: a repository sets one under
`bindings["delivery.slots"]`, the live session answers it, or the default stands.

### Role

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#agent"]
```

A specialist a flow consults by name — `architecture`, `qa`, `domain`, `ux`, `product`,
`docs`, `security` — bound to a plugin per repository and never a dependency, because one
missing advisor must not demote every skill that names it. Every role reference states its
fallback, so no flow is dead because a role is unbound. An explicit `null` means deliberately
unbound, which is not the same as absent.

No provider for any of them ships in this marketplace; see
[Roles and Services](../../arc42/05-building-block-view.md#roles-and-services). `product` and
`security` are `null`.

The key is not the plugin's name, and a plugin whose name matches a key matches it by
coincidence. A specialist filling a role also holds no flow control — no sequencing, no gate,
no session spawning, no delegation — because all four belong to whatever consults it. See
[the decision](../../arc42/adr/19-a-role-plugin-holds-no-flow-control.md).

Implementation is not a role. It owns a phase, carries a toolchain, and loops with
validation, so it binds as the `implement` and `validate` services instead.

### Tracker

```meta
type: term
date: 2026-09-03
```

The work-item system a repository tracks work in — GitHub issues, Jira tickets, or Markdown
chapters — bound per repository behind one set of operations. It is a binding and not a
dependency for the same reason a role is: no repository should end up with Jira installed
because it enabled the flows.

### Stamp

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#migration", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/adr/56-payload-only-components-carry-no-contract-version.md"]
```

A component's entry under `components` in `.devbook/config.json`, recording what that plugin
put in the repository: the plugin version it is on, and every file copied in or marker-fenced
section written with the hash it had when it landed. A component whose install rewrites content
the repository authored carries three fields more — the contract version, which features it
adopted, and the [migration](#migration) ledger — and `devbook` is
[the only one](../../arc42/adr/56-payload-only-components-carry-no-contract-version.md). One
that writes no files stamps its own selection in place of the file map. The same file's other
top-level keys are the engine's — see
[Stack Config](../../arc42/05-building-block-view.md#stack-config).

It records what the *repository* has taken on, never who installed what — that is per-user and
would make the file wrong the moment a second person opened it. A plugin that materializes
anything ships one `<component>-install` that writes its own entry and one `<component>-check`
that reads it, and neither touches another component's.

### Migration

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#stamp"]
```

One breaking change to a plugin's contract, shipped as a folder — `migrations/<contractVersion>-<slug>/` —
holding a `MIGRATION.md` and an idempotent `migrate.mjs` whose `--check` exits non-zero while
work remains. The id is immutable once released: a shipped migration is never rewritten, only
followed by a new one.

Presence in a repository's ledger decides whether a migration runs, never a comparison of
version numbers, which is what makes re-running one safe. A prose migration note is not a
migration — it does not run, so it becomes an unbounded manual chore in every consuming
repository.
Which changes owe one is decided once, in `AGENTS.md` under *When a change ships a migration*.

### MCP Server

```meta
type: term
related: [".devbook/tech/shared.md#model-context-protocol", ".devbook/arc42/adr/32-an-mcp-server-is-bound-per-point.md"]
```

A tool server a plugin ships and declares in its manifest. Its tools are namespaced by
whichever plugin provides it, so an allowlist that names the server must carry both the
plugin-namespaced and the bare spelling.

The engine requires none. A repository declares its servers in its own MCP configuration and
binds them per extension point under `bindings["delivery.mcp"]`; a bound server is resolved
from the live tool list the way a surface is, and one that does not answer costs a stage its
grounding, never the run. See
[the decision](../../arc42/adr/32-an-mcp-server-is-bound-per-point.md).

### Layer

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#plugin", ".devbook/arc42/adr/2-one-folder-per-plugin.md"]
```

A plugin's position in the dependency order, and the only thing that decides which other
plugins it may name. A lower layer never names a higher one.

| Layer | Depends on | Example |
| --- | --- | --- |
| L0 foundation | Nothing. Works with only itself installed | `devbook` |
| L1 extension | One foundation | `devbook-derived`, `devbook-collaboration` |
| L2b bridge | Two stacks at once, deliberately | none |
| L3 surface | Neither direction. Reads generated files | none — `devbook-graph` ships inside `devbook`, see record 5 |

The layer is not a field in any manifest — it is what the `dependencies` array says, read as a
sentence. A surface is not a layer in the dependency sense at all: it is resolved from the live
tool list and no-ops when absent, so nothing may declare one.

### Extension Namespace

```meta
type: term
date: 2026-09-03
related: [".devbook/domain/plugin-authoring/domain.md#layer", ".devbook/arc42/adr/8-comments-are-findings-until-the-fence-lands.md"]
```

The seam a higher layer stores state through without a release of the layer beneath it: a
reserved key the lower layer carries through untouched, unvalidated, and namespaced by whoever
owns it. In `devbook` it is `ext.<plugin>.<key>` in a chapter's `meta` block.

Two rules, and they are the whole value. The owner never adds a field of its own to the schema
beneath it, because that would trade one fact for a contract bump and a migration in every
consuming repository. Nobody reads another plugin's keys as if they were schema — an opaque
namespace two plugins interpret is no longer opaque.

An extension namespace is inert on its own: uninstall the owner and the keys stay parseable,
render as they always did, and mean nothing to anyone. That is what makes the seam safe to
reserve before anything needs it. It is reserved and unused: the first extension to store
state through it, `devbook-collaboration`, moved that state into devbook's schema instead,
because the fields mirrored ones devbook already owned
([record 75](../../arc42/adr/75-review-state-is-three-fields-in-devbooks-schema.md)).
