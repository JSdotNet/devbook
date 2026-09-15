# Delivery

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#delivery", ".devbook/arc42/adr/9-the-point-set-is-closed.md"]
```

What this context is responsible for: that one unit of work reaches a review-ready change
inside one session, that a person decided it was ready, and that a repository can shape the run
without being able to weaken it.

Inside the boundary: the staged procedures, the closed set of extension points a repository
binds providers to, the human gates it may add and never remove, the four engine-owned keys of
the stack config, and the pull-request lane at the end.

Outside it: deploy, which is where "delivery" stops here; expertise, which is a role a
repository binds; visibility, which is a [surface](../delivery-surface-dashboard/domain.md)
resolved at run time; and fan-out, which is [Fleet](../fleet/domain.md)'s and is the one thing
a flow may never do.

## Run

```meta
type: aggregate
aliases: [execution, session run]
related: [".devbook/arc42/adr/31-every-run-opens-with-update-base.md"]
```

One execution of one flow over one unit of work: the stages and their results, the prompts that
produced them, the gate decisions a person returned, and where the change landed. It is the
consistency boundary because a stage result, the decision that accepted it, and the change it
produced are only meaningful together — a run that recorded an approval it cannot name a stage
for has recorded nothing.

A run owns a session and never outlives one twice: it survives a session restart because a
surface keeps it on disk, and it resumes on the stage it stopped at rather than starting again.
What it never does is split — a run across two sessions is two runs, which is why fan-out lives
in another context.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| One item per run, and never a fan-out | flow entry | untested |
| A run belongs to one session; a resumed run reattaches to the same run rather than opening a second | `start_run()` | untested |
| Every tier opens with Update Base, prepended by the runner and named by no skill | stage sequencing | untested |
| `implement` and `validate` are the only cycle, bounded by `validate.retryBudget` | `validate()` | untested |
| Personal Validation is reached before `deliver`, exactly once, and never inside it | gate evaluation | untested |
| A chore contributes side effects and a report and never rewrites a stage's result | chore invocation | untested |
| A stage repeated after a revise decision is recorded as repeated, not as one long stage | `update_stage()` | untested |
| A run whose surface is unbound still produces its file artifacts and says so once | all stages | untested |

### Stage

```meta
type: entity
aliases: [step]
```

One step of a run, with identity inside it: a name, a status, the output it produced, the links
and evidence it gathered, and how many times it finished. A stage is a prompt rather than a
program — "apply TDD", "escalate instead of continuing when the request needs a new
architectural decision" — which is why configuration can choose among stages and never define
one.

The repeat count is not bookkeeping. A stage that ran again after a revise decision reads as
two attempts rather than one long step, and that difference is what a resumed session and a
report both depend on.

### Run Context

```meta
type: value-object
```

What the run is about, set once and refined rather than accumulated: the change kind, the item
being worked, the branch, and the worktree it lives in. It is a value because nothing in it has
identity — replacing it wholesale is the only sensible update, and two runs with the same
context are still two runs.

### Stage Status

```meta
type: enum
```

Whether a stage is pending, running, finished, or blocked. Blocked is the one that carries
weight: it is what a declined gate produces, and it is never spelled as skipped, because a
skipped stage reads as a decision nobody made.

## Flow

```meta
type: aggregate
aliases: [flow skill, staged procedure]
related: [".devbook/arc42/adr/34-flows-belong-to-delivery.md"]
```

A staged procedure for one category of work, run start to finish in one session and ending at
the Personal Validation gate. Sixteen ship here, five of them one per devbook folder, and each
owns its stage order and the tier it closes through.

A flow is the unit a request is routed to, so its category is the boundary that matters: a
repository needing a different shape writes its own `flow-*`, which takes precedence for the
categories it covers, rather than configuring this one into something else.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| A flow never leaves its session | all stages | untested |
| A flow ends at Personal Validation and holds no other mandatory gate | tier close | untested |
| Configuration chooses among behaviour the engine already implements and never introduces new behaviour | config validation | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| A folder flow in a repository that has not adopted the folder stops and says so | stage 1 | untested |
| A flow shipped by a higher layer declares its own tier; the engine never assigns one | tier resolution | untested |
| A flow names an extension point and never a plugin | authoring | untested |

### Phase

```meta
type: entity
aliases: [shared step, phase skill]
```

A shared step several flows run identically — Update Base, Build & Test, QA Validation,
Personal Validation, Create Pull Request, Documentation Update, Work Item Update, Summary. It
is invoked by a flow and never directly, which is what keeps its definition in one file instead
of restated in sixteen.

### Phase Tier

```meta
type: enum
related: [".devbook/domain/delivery/domain.md#phase"]
```

Which closing phases a flow runs: the code-modifying tier, which builds, tests, validates, and
opens a pull request, or the documentation tier, which does none of the first three because
there is no runnable change to validate. `flow-fallback` has no fixed tier and resolves one
from the change kind it determined.

Session Handoff belongs to no tier. It is an interrupt rather than a step, firing at whatever
stage the run has reached when the context gauge crosses its threshold.

## Extension Point

```meta
type: aggregate
related: [".devbook/domain/plugin-authoring/domain.md#extension-point", ".devbook/arc42/adr/9-the-point-set-is-closed.md"]
```

A named place in a flow where a repository plugs a provider in. The set is closed and declared
by the engine: a repository picks what runs at a point, never what the points are, which is the
asymmetry that keeps configuration from becoming a second, undocumented flow language.

Six are services and five are chores, and the difference is authority rather than cardinality.
A service returns a result the flow acts on; a chore contributes side effects and a report and
may never change an outcome.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| The point set is closed; an unknown point is an error, not an extension | config validation | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| A service has exactly one provider | config validation | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| Chores run zero or more times, in declared order | chore invocation | untested |
| A chore may declare itself required and stop the run; it may never rewrite a result or stand in for a gate | chore invocation | untested |
| A point with no provider costs capability, never the run | provider resolution | untested |
| A bound MCP server that does not answer costs a stage its grounding, never the run | provider resolution | untested |

### Point Kind

```meta
type: enum
```

`service` or `chore`. `spec`, `implement`, `validate`, `app.start`, `qa.run`, and `deliver` are
services; `session.start`, `flow.start`, `data.prepare`, `docs.update`, and `flow.end` are
chores. Nothing is both, and no point changes kind — a chore promoted to a service would be a
provider gaining the authority to change an outcome without anybody re-reading the flow.

## Gate

```meta
type: aggregate
related: [".devbook/domain/plugin-authoring/domain.md#gate", ".devbook/arc42/adr/40-the-overlay-may-add-a-gate-and-never-remove-one.md"]
```

A human checkpoint attached to an extension point: it presents that point's output and asks a
question. Personal Validation is the mandatory instance of this pattern rather than a second
mechanism, which is why there is one gate concept and not one for configuration and one for the
engine.

The asymmetry is the whole design. Configuration may add a gate anywhere and may never remove
one or hand one to a plugin, so a repository's overlay can only ever make a flow more
conservative.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Three outcomes and only three: approve, revise, decline | gate evaluation | untested |
| Revise re-runs the gated point carrying the human's notes, bounded by the revise budget | gate evaluation | untested |
| Decline blocks the stage and is never a silent skip | gate evaluation | untested |
| Configuration may add a gate and may never remove one | config validation | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| No provider performs a gate on its own behalf | gate evaluation | untested |
| An unattended run parks at a blocking gate with a handoff brief; it never waits and never self-approves | gate evaluation | untested |

### Gate Outcome

```meta
type: enum
```

`approve`, `revise`, `decline`. There is no fourth value and no absent one: a gate that was
reached and produced nothing is a run that stopped, which is recorded as a block rather than
inferred from silence.

## Stack Config

```meta
type: aggregate
aliases: [config.json, delivery config]
related: [".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md", ".devbook/arc42/05-building-block-view.md#stack-config"]
```

`.devbook/config.json`, and specifically the four keys this context owns — `bindings`,
`extensions`, `policy`, `gates`. It is the one file a consuming repository commits for the
whole stack, and the boundary inside it is by key: every `components.<name>` stamp belongs to
that component's own install skill and is never written here.

Reading the file is not adopting devbook. The path is a path: the engine reads it with no
devbook folder present, which is the reason the file could move there at all.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| An unknown key is rejected, never ignored — a typo is an error, not a silently absent setting | `check.mjs` | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| Nobody writes another owner's key | all mutations | untested |
| The four engine keys are written by `devbook-config`'s setup and update, and by nothing else | all mutations | untested |
| `policy` is a closed set of switches | `check.mjs` | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| A machine-scope overlay may add a gate and never remove one | `check.mjs` | untested |
| Model choice takes no repository-level binding | `check.mjs` | untested |

### Binding

```meta
type: value-object
related: [".devbook/domain/plugin-authoring/domain.md#role", ".devbook/domain/plugin-authoring/domain.md#tracker"]
```

A name resolved to whatever fills it in this repository: a role to a plugin, the tracker to a
provider, an extension point to its MCP servers, a host slot to a fact about this repository. A
binding is a value — replace it and the flow resolves the new one on its next run; there is
nothing to migrate.

An explicit `null` is a binding, not an absence: it says deliberately unbound, which the
vocabulary distinguishes from a key nobody wrote.

### Policy Switch

```meta
type: value-object
```

One member of a closed set: QA depth and its ceiling, the validate retry budget, the gate revise
budget, whether the flow commits at each handback, whether a pull request is required. Closed
because an open one would be a stage definition wearing a shorter name.

## Flow Runner

```meta
type: domain-service
aliases: [runner, sequencer]
related: [".devbook/arc42/adr/30-the-handback-is-the-commit-point.md"]
```

The one agent this context ships: it sequences a flow's stages, prepends Update Base, resolves
the configuration, delegates each stage to whatever the extension points bind, tracks the run
against the surface, and enforces the gate.

Invocation semantics: command-invoked, once per run, and it holds the session for the run's
whole length. The behaviour does not belong on [Run](#run) because it coordinates a run, a
flow, the config, and providers none of them know about — and because the thing that enforces a
gate must not be a thing a provider can be.

It is also the commit point. A stage handing back is where the change set is committed when
policy says so, which keeps a run's history legible without every provider having to know it is
being recorded.

## Pull Request Lane

```meta
type: domain-service
related: [".devbook/domain/delivery/domain.md#pr-lane"]
```

Getting a finished change reviewed and merge-ready: push the branch, bring it level with its
base, fix the checks that fail, and score it against the merge-ready checklist. Raising the
pull request itself is the host's own action rather than a skill here.

Invocation semantics: command-invoked, and separately from a run — these skills are the one
part of this context routinely used on a change no flow produced. Unbound, the `deliver` service
writes file artifacts only and opens nothing.

## Run Started

```meta
type: domain-event
related: [".devbook/domain/delivery/domain.md#run", ".devbook/arc42/adr/15-three-surfaces-one-contract.md"]
```

Published when a run begins, in the `delivery.surface.lifecycle@1` language. The publisher does
not know which surface is listening, or whether any is: the tool names are resolved by pattern
from the live tool list, and nothing answering is a normal outcome.

### Payload

- `flow` — which flow is running, and the tier it resolved
- `phases` — the stage names, in order, so a surface can draw the shape before the work happens
- `changeKind` — what kind of change this is, which decides QA depth downstream
- `worktree` — the path the run is keyed by, so a resumed session finds it again
- `handoff` — present when this call is reattaching to a parked run rather than opening one

### Consumers

- **The three surfaces**, each answering the lifecycle group or not answering at all.
- **[Fleet](../fleet/domain.md)** and **[Delivery Schedule](../delivery-schedule/domain.md)**,
  which publish the same event for work no attended flow started.

### Published language rules

- **Reattach or open, never both.** A `start_run` naming a worktree with a parked run resumes
  it; opening a second beside it is the failure this field exists to prevent.
- **The phase list is a claim about shape, not a promise about outcome.** A flow that resolves
  its tier at run time reports the resolved names here and nowhere else.

## Stage Updated

```meta
type: domain-event
related: [".devbook/domain/delivery/domain.md#stage"]
```

Published whenever a stage changes status, produces output, gathers evidence, or records a gate
decision. It is the event the whole surface contract is really built around: everything a
report or a resumed session needs is a fold of these.

### Payload

- `stage`, `status` — which step, and where it now stands
- `output`, `links` — what it produced, and where the artifacts are
- `qaScenarios` — scenarios with their status and evidence paths, where a QA stage ran
- `decision` — the gate outcome, where a gate was attached to this point

### Consumers

- **The three surfaces.** The dashboard renders it live, the collector keeps it for the report
  and for a resumed session, the canvas ignores it — it answers the render group only.

### Published language rules

- **Evidence is a path into the worktree, and anything resolving outside it is refused.** A
  report cites the screenshot; the screenshot stays where it was produced.
- **A repeat is a repeat.** A stage finishing twice is recorded twice, because a revise
  decision that reads as one long stage has erased the decision.
- **Telemetry is never written by hand.** A surface that measures reports it; one that does not
  says nothing about it, and a caller filling the gap would be reporting an estimate as a
  measurement.

## Run Finished

```meta
type: domain-event
related: [".devbook/domain/delivery/domain.md#run", ".devbook/domain/delivery/domain.md#pull-request-lane"]
```

Published when a run reaches its Summary phase or stops — and a run that stopped is finished
too. The distinction between finished-and-delivered and finished-and-blocked lives in the
payload rather than in whether the event fired.

### Payload

- `outcome` — delivered, blocked at a gate, or parked with a handoff brief
- `summary` — what the run produced, in the run's own words
- `report` — where the exported report was written, when a surface answered the export group

### Consumers

- **The three surfaces**, for the report and for closing the run.
- **[Fleet](../fleet/domain.md)**, whose worker result files are written on every outcome
  including failure, because a sweep that cannot tell a crash from a slow worker cannot
  aggregate anything.

### Published language rules

- **Every outcome is published, failure included.** A run that stops silently is
  indistinguishable from one still going, which is the whole reason a parked run carries a
  marker rather than just an absence.
- **A parked run is not an abandoned one.** Both look idle; only one carries a handoff marker,
  and that difference is what a later `start_run` needs to reattach to one and refuse the
  other.

## Shared Value Objects

```meta
type: shared-value-objects
```

> Value objects used by more than one aggregate in this context.

### Gate Decision

```meta
type: value-object
related: [".devbook/domain/delivery/domain.md#gate", ".devbook/domain/delivery/domain.md#run"]
```

What a person answered at a gate, with the notes they gave: an outcome, the point it was
attached to, and the stage it belonged to. It is held by both [Run](#run) and [Gate](#gate)
because it is the one fact they must agree on, and it is a value so that recording it twice is
harmless and re-deriving it is impossible.

A resumed session re-runs the gate rather than trusting a decision it cannot see the
conversation behind — which only works because the decision is written down rather than
remembered.

### Host Slot

```meta
type: value-object
related: [".devbook/domain/plugin-authoring/domain.md#host-slot", ".devbook/arc42/05-building-block-view.md#host-slots"]
```

A name a shared asset reads instead of a host's own file: `repo-instructions`,
`model-override`, `stage-delegation`, `surface`, `pr-lane`. A slot is bound
or it takes its documented unbound default, and it is never branched on — an asset carrying an
if-this-host clause has not used a slot.

Two of the five are answered by the live session rather than by configuration, which is what
keeps the hosts from re-diverging the moment one gains what the other has. Unbound is the
resting state of the whole set.

## Shared Enums

```meta
type: shared-enums
```

> Enums used by more than one aggregate in this context.

### Change Kind

```meta
type: enum
aliases: [change category]
```

What kind of change this run is making: new functionality, a change to existing behaviour, a
defect, a dependency update, or a documentation change. It is resolved once, early, and it is
the input to two decisions that would otherwise each need their own switch — which phase tier
runs, and how deep QA validation goes.

It is a claim about the change, never about the flow that carried it: `flow-fallback` resolves
one at run time and reports it, and a flow with a fixed tier still records it because the QA
depth downstream depends on it.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — plugin,
> layer, role, tracker, surface, host slot, extension point, gate — is defined once in [Plugin
> Authoring](../plugin-authoring/domain.md#ubiquitous-language).

### Tier

```meta
type: term
date: 2026-09-08
aliases: [phase tier, closing tier]
related: [".devbook/domain/delivery/domain.md#phase-tier"]
```

Which closing phases a flow runs — code-modifying or documentation. It follows from the change
kind rather than from preference, and a flow shipped by a higher layer declares its own,
because the engine never enumerates a skill in a layer above it.

### Personal Validation

```meta
type: term
date: 2026-09-08
aliases: [the gate, approval gate]
related: [".devbook/domain/plugin-authoring/domain.md#gate", ".devbook/domain/delivery/domain.md#gate"]
```

The mandatory gate every flow ends at, and an instance of the gate pattern rather than a second
mechanism. It uses no agent and no model: it hands control back to the person and waits.

Two parts, deliberately separate. The **review handoff** is a procedure — bring the application
up, publish the links, say what to check by hand — and it repeats on every revise round, because
a revised change set is a new thing to look at. The **gate** is the decision, and it happens once
per pass. Splitting them lets the presentation be a phase skill without any of it becoming
configurable: a repository may declare gates in front of this one and may never remove it.

It is the thing [Fleet](../fleet/domain.md#park) trades away and the thing an unattended run
parks at. Wherever a run cannot reach it, something else has to guarantee that nothing merges
unread.

### PR Lane

```meta
type: term
date: 2026-09-08
aliases: [pull-request lane, delivery lane]
related: [".devbook/domain/delivery/domain.md#pull-request-lane"]
```

How a finished change is opened for review: push the branch, level it with its base, fix the
failing checks, score it against the merge-ready checklist. Raising the pull request is the
host's own action rather than a skill.

Also a [host slot](../plugin-authoring/domain.md#host-slot) of the same name, which is what the
`deliver` service reads: unbound, it writes file artifacts and opens nothing.

### Provider

```meta
type: term
date: 2026-09-08
aliases: [implementation, binding target]
related: [".devbook/domain/delivery/domain.md#extension-point", ".devbook/domain/delivery/domain.md#binding"]
```

Whatever a repository names to fill an extension point. A service has exactly one and a chore
has zero or more; a provider never performs a gate on its own behalf, and a chore's provider
never changes an outcome.

The word is deliberately not *plugin*. What fills a point may be a plugin's skill, a repo-native
skill, or nothing at all, and the point's contract is the same in every case.
