# Glossary

```meta
number: 12
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/08-crosscutting-concepts.md"]
```

The terms this repository uses with one meaning each, drawn from the ubiquitous language of its
bounded contexts. Every term is owned by exactly one building block, named on the term, and its
references point at the parts of that block the term qualifies. The vocabulary every plugin
shares — plugin, skill, layer, stamp, surface, gate, host — is [chapter 8](08-crosscutting-concepts.md)
and is not repeated here. Where a host's word for a thing differs from this repository's, the
host's word is recorded as an alias and never adopted.

## Adoption

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook.md#devbook-folder", ".devbook/arc42/08-crosscutting-concepts.md#devbook-folder"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: adopted folders, scope.

Which of the five folders a repository has taken on, and in which layout. It is partial by
design: the tooling emits scopes for the folders that exist, so a folder nobody adopted has no
index, no rule firing, and no line in a report. Adoption is the convention's own install and
never a flow's job — a folder flow in a repository that has not adopted the folder stops and
says so.

## Canvas

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-surface-canvas.md", ".devbook/arc42/building-blocks/delivery-surface-canvas.md#canvas-transport", ".devbook/tech/hosts.md#copilot-extension-sdk"]
```

Owned by [delivery-surface-canvas](building-blocks/delivery-surface-canvas.md).

Also called: panel, extension canvas.

The host panel a viewer page is registered into, and this plugin's only transport. Two are
registered: one for diagrams, one for documents. It is the reason the surface contract matches
operation names and never a transport: these two operations arrive as canvas actions rather
than as namespaced tools, and the contract is still satisfied — a surface is not required to be
an MCP server.

## Capture Plan

```meta
date: 2026-09-24
related: [".devbook/arc42/building-blocks/devbook-code-sync.md#capture-specs", ".devbook/arc42/building-blocks/devbook-code-sync.md#spec-converter"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: capture, the delta.

What `capture-specs` hands the person instead of writing a chapter: the drafts to the folder's
template, arranged as a delta against the target file — `ADDED`, `MODIFIED`, or `REMOVED` by
heading — each claim carrying the evidence behind it, and the report table. It is the markers
OpenSpec's own deltas use, so a bridge can carry a plan across without translating it. Code is
evidence, not agreement: the plan is a proposal the person carries into the folder, or does
not. Two callers carry it in before the person sees it, and the person still decides: an
unattended sweep lands it as a draft pull request, and Spec Check, binding `capture-specs` in
write mode, writes the plan's `code-ahead` entries into the chapters for Personal Validation
to approve or reject.

## Catalog

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/delivery-schedule.md#schedule", ".devbook/arc42/building-blocks/delivery-schedule.md#catalog-check"]
```

Owned by [delivery-schedule](building-blocks/delivery-schedule.md).

Also called: schedule catalog, trigger files.

The set of schedule files the plugin ships — the defaults, readable as defaults. A repository
selects from it and overrides a cadence or a `maxResolve` in its own stamp rather than by editing the file, so an
upgrade can move a shipped default without silently reverting or silently keeping somebody's
choice.

## Change

```meta
date: 2026-09-28
related: [".devbook/arc42/building-blocks/devbook.md#change", ".devbook/arc42/12-glossary.md#proposal", ".devbook/arc42/12-glossary.md#delta"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: change folder.

A proposed change to the devbook, held in `openspec/changes/<name>/` until it lands: a
proposal, one delta per file it touches, a solution, and tasks. It lands only through
`delta.mjs --apply`, once its proposal is accepted, which merges its deltas and moves the folder to `archive/`; a chapter it
touched carries its name in `change`. Not a change brief, which is what `apply-change` hands
the code, and not a pull request, which is one step of a change.

## Change Brief

```meta
date: 2026-09-24
related: [".devbook/arc42/building-blocks/devbook-code-sync.md#apply-change", ".devbook/arc42/building-blocks/devbook-code-sync.md#spec-converter"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: brief.

What `apply-change` derives from an agreed but unbuilt chapter and hands to the code-side flow:
outcomes, invariants, ubiquitous language, out of scope, acceptance checks, and exactly one
change category — new functionality, a change to existing behaviour, or a defect. It asks only
for the delta the code does not yet satisfy, and never carries an open annotation: an open
question stops the run at the gate rather than becoming a line item.

## Claim

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery.md#start-session-from-issue", ".devbook/arc42/building-blocks/delivery-schedule-entry-points.md#schedule-issue-sweep"]
```

Owned by [delivery](building-blocks/delivery.md).

Also called: pickup, in-progress.

Taking an item for this run, recorded as a label on the tracker before any code is touched —
by the pickup skills and by the issue sweep alike. The tracker is the transport because a claim
has to be legible to a person who has never heard of the plugin, and because it is what keeps
a second run, or a second sweep, from picking the same item up.

## Delta

```meta
date: 2026-09-28
related: [".devbook/arc42/building-blocks/devbook.md#change", ".devbook/arc42/12-glossary.md#change"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: devbook delta.

One file of a change, under its `devbook-delta/` at the path of the devbook file it changes,
opening with `change` and `delta` — `added`, `modified`, or `removed`. It names chapters by
heading, and under each, `ADDED`, `MODIFIED`, and `REMOVED` sections hold entries one level
deeper that the merge lands one level up. Its unit is the heading: a paragraph is changed by
replacing its section. OpenSpec's spec delta is the same idea against `specs/`, which a
devbook change does not have.

## Demo

```meta
date: 2026-10-02
related: [".devbook/arc42/adr/demos.md", ".devbook/arc42/building-blocks/devbook.md#demo", ".devbook/arc42/12-glossary.md#prototype"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: click demo, `demo.html`, `<page>.demo.html`.

The agreed, clickable picture of what a person sees in a bounded context: one self-contained
HTML file in `domain/<context>/`, built on the repository's demo template. It is the source of
truth for which screens exist, how a person moves between them, their copy, and their states.
A rule, a term, or a design token still wins where the demo disagrees. A demo is a prototype
its author carried into `domain/`, by a `flow-spec` pull request or an OpenSpec proposal, and the file itself never says so: only its
location does. It is never the running application.

## Derived Index

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook-derived.md", ".devbook/arc42/building-blocks/devbook-derived.md#refresh", ".devbook/arc42/building-blocks/devbook.md#index-generator", ".devbook/arc42/adr/checks-and-indexes.md"]
```

Owned by [devbook-derived](building-blocks/devbook-derived.md).

Also called: `_meta`, generated index, build output.

Anything under a `_meta/` folder: the graph, the reading order, the annotation index, and the
term register,
emitted deterministically so a clean `git diff` proves they are current. A session never reads
one as a source of fact and never regenerates one: two branches that each touch one chapter
both rewrite the same JSON, and the conflict is only resolvable by re-running the generator —
so the refresh belongs to automation, and the check that runs in a session writes nothing.

## Drift Verdict

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook-code-sync.md#spec-converter"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: aligned, code-ahead, spec-ahead, conflict, unresolved.

Where a chapter and its implementation stand relative to each other, in five values. `aligned`
reports and stops, `code-ahead` and `spec-ahead` say which side moves, and `conflict` and
`unresolved` both stop and ask — never guess. A verdict reached against a chapter nobody has
agreed to yet is flagged `unagreed`, which is a qualifier on one of the five and not a sixth.
A journey's run whose signature no longer matches the journey is `stale`, a qualifier on the
run rather than a verdict: it is no evidence for the requirements that point at its parts.
The verdict is what makes the two converter directions one subject rather than two; it is
established before anything leaves the run, from source and tests alone.

## Engine Key

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook-config.md", ".devbook/arc42/building-blocks/devbook-config.md#engine-configuration", ".devbook/arc42/building-blocks/delivery.md#stack-config", ".devbook/arc42/adr/configuration.md"]
```

Owned by [devbook-config](building-blocks/devbook-config.md).

Also called: bindings, phases, policy, gates, areas.

One of the top-level keys of `.devbook/config.json` that the engine owns and devbook-config
writes — the four, and the optional `areas`. Everything else in that file is a `components.<name>` stamp belonging to the component
that materialized it. The word marks the boundary rather than the file: one file, two kinds of
key, and nobody writes another owner's. The keys themselves belong to
[delivery](building-blocks/delivery.md#stack-config).

## Headless

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-surface-collector.md", ".devbook/arc42/building-blocks/delivery-surface-collector.md#report-export"]
```

Owned by [delivery-surface-collector](building-blocks/delivery-surface-collector.md).

Also called: no page, recorded rather than watched.

Recorded rather than shown: no page, no port, nothing rendered. `open_dashboard` answers with no
URL and says so once. It is a property of this implementation and never a degraded state: for a
scheduled run, an unattended worker, or a terminal nobody is looking at, headless is the correct
answer and a live page would be the wrong one.

## Idleness

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-surface-dashboard.md", ".devbook/arc42/building-blocks/delivery-surface-dashboard.md#handoff-marker"]
```

Owned by [delivery-surface-dashboard](building-blocks/delivery-surface-dashboard.md).

Also called: stalled, abandoned.

A run whose session ended or that nothing has advanced for hours. It is derived on read and
never stored, because a stored idleness is indistinguishable from a stale one. A deliberately
parked run is idle by every one of those signals and is not abandoned; the handoff marker is the
only thing that separates them, and separating them is what a later `start_run` needs in order
to reattach to one and refuse the other.

## Invariant

```meta
date: 2026-09-24
related: [".devbook/arc42/building-blocks/devbook-code-sync.md#capture-specs", ".devbook/arc42/adr/chapter-schema.md"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: `### Invariant:`, rule.

What a type guarantees, one `### Invariant: <name>` chapter per rule in the invariants subpage
of the domain page that holds its owner — `domain.invariants.md`, or
`domain.<name>.invariants.md` beside a split page — under the aggregate or domain service that
owns it. It carries an
`Enforced at:` line naming where the guarantee is made and is proved by unit tests. The word is
DDD's, not OpenSpec's, and the heading is the one a bridge has to map: OpenSpec has no
invariant.

## Park

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/delivery-schedule-entry-points.md#entry-point", ".devbook/arc42/12-glossary.md#personal-validation"]
```

Owned by [delivery-schedule](building-blocks/delivery-schedule.md).

Also called: handoff.

What an unattended run does wherever a gate would be: stop, and write a brief naming exactly
what a person has to look at — what is done, what is not, the exact invocation to resume. It is
neither approval nor failure, and the distinction matters — a parked change is finished work
waiting on a judgement, not broken work waiting on a fix. The issue sweep is the one entry point
that does not park: it moves the judgement onto a draft pull request instead, with what could
not be proved written in the body.

## Personal Validation

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-phases.md#gate", ".devbook/arc42/08-crosscutting-concepts.md#gate", ".devbook/arc42/12-glossary.md#park"]
```

Owned by [delivery](building-blocks/delivery.md).

Also called: the gate, approval gate.

The mandatory gate every flow ends at, and an instance of the gate pattern rather than a second
mechanism. It uses no agent and no model: it hands control back to the person and waits.

Two parts, deliberately separate. The **review handoff** is a procedure — bring the application
up, publish the links with any demo the change implements beside them, say what to check by
hand — and it repeats on every revise round, because a revised change set is a new thing to
look at. The **gate** is the decision, and it happens once
per pass. Splitting them lets the presentation be a phase skill without any of it becoming
configurable: a repository may declare gates in front of this one and may never remove it.

It is the thing an unattended run [parks](12-glossary.md#park) at — or, in the issue sweep,
moves onto a draft pull request. Wherever a run cannot reach it, something else has to guarantee that nothing merges
unread.

## Playthrough

```meta
date: 2026-10-22
related: [".devbook/arc42/adr/demos.md#playing-a-journey-end-to-end", ".devbook/arc42/building-blocks/devbook.md#demo", ".devbook/arc42/12-glossary.md#demo"]
```

Owned by [devbook](building-blocks/devbook.md#demo).

A [demo](#demo) walkthrough that plays a whole journey end to end, every part in the journey's
order, with each step's text copied from the part step it shows. A feature names the one its
page shows in its `playthrough` field; the tool showing the page decides when it plays, and the
repository's demo template decides how it looks.

## PR Lane

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-pr-lane.md#pull-request-lane", ".devbook/arc42/08-crosscutting-concepts.md#host-slot"]
```

Owned by [delivery](building-blocks/delivery.md).

Also called: pull-request lane, delivery lane.

How a finished change is opened for review: push the branch, level it with its base, fix the
failing checks, score it against the merge-ready checklist. Raising the pull request is the
host's own action rather than a skill. Also a [host slot](08-crosscutting-concepts.md#host-slot)
of the same name, which is what the `deliver` service reads: unbound, it writes file artifacts
and opens nothing.

## Preamble

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/delivery-schedule.md#schedule"]
```

Owned by [delivery-schedule](building-blocks/delivery-schedule.md).

Also called: unattended rules.

The unattended rules every prompt starts with, stated once in one file: park rather than pass a
gate, never merge or approve or close or delete, publish as a pull request or a labelled issue,
update what the last run left open, carry nothing personal into the repository. One file rather
than six copies, because this is the most safety-critical prose in the plugin and six copies
drift.

## Preview

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-surface-canvas.md", ".devbook/arc42/building-blocks/delivery-surface-canvas.md#stay-a-preview"]
```

Owned by [delivery-surface-canvas](building-blocks/delivery-surface-canvas.md).

Also called: live view, rendered artifact.

What every render here produces, and what none of them is allowed to stop being: a live view of
a file that already exists on disk. Rendering the same source that was written, and storing none
of it, is what keeps a surface from becoming a second answer to what a run produced. A rendered
view nobody saved is not a record of anything.

## Proposal

```meta
date: 2026-09-28
related: [".devbook/arc42/building-blocks/devbook.md#change", ".devbook/arc42/12-glossary.md#change"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: `proposal.md`.

The chapter that says why a change is made: its scope, the chapters it touches, and one
category — `feature`, `behaviour-change`, or `defect` — as a `type: change` file at
`status: proposed`. It is the one block in a change with a status, and it carries the change's
two decision rungs, `approved` and `accepted`, once for the whole change. Not a proposal in the
documentation plugin's sense, which is a standalone document.

## Prototype

```meta
date: 2026-10-02
related: [".devbook/arc42/adr/demos.md#how-prototyping-works", ".devbook/arc42/building-blocks/devbook-procedures.md#goal", ".devbook/arc42/12-glossary.md#demo"]
```

Owned by [devbook](building-blocks/devbook-procedures.md#goal).

One standalone HTML file that answers one question, in UI mode or logic mode. It needs no
change, no task, and no approval, and it is never a source of truth. It carries its question
and no stage, status, or verdict. A UI prototype becomes a [demo](#demo) when a proposal
carries it with exactly one variant. A logic prototype never does, because it is code. One
nobody takes further stays where it is, as evidence of what was tried.

## Prototyping

```meta
date: 2026-10-02
related: [".devbook/arc42/adr/demos.md#how-prototyping-works", ".devbook/arc42/building-blocks/devbook-procedures.md#goal"]
```

Owned by [devbook](building-blocks/devbook-procedures.md#goal).

Also called: `/prototype`.

The activity of writing or revising a prototype, which only the `prototype` procedure does. It
starts from a question stated in one sentence and ends with a one-line answer for whoever
asked. That answer becomes the verdict of a proposal that carries the prototype. Given a demo,
prototyping returns a revised prototype that keeps every surviving screen id and anchor.

## Provider

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-phases.md#phase", ".devbook/arc42/building-blocks/delivery.md#stack-config"]
```

Owned by [delivery](building-blocks/delivery.md).

Also called: implementation, binding target.

Whatever a repository names in a phase's entry: the `skill` it follows, the `agent` that runs
it, or a chore in its `before` or `after`. A provider never performs a gate on its own behalf,
and a chore's provider never changes an outcome. The word is deliberately not *plugin*: what
fills a phase may be a plugin's skill, a repo-native skill, or nothing at all, and the phase's
contract is the same in every case.

## Reconcile

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook.md#reconciler", ".devbook/arc42/adr/install.md"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: install, upgrade, sync.

Bringing a repository level with the installed release in one idempotent operation covering
first install, upgrade, a change of adopted folders, and an outstanding migration. *Sync* is the
word to avoid: it suggests two sides converging, and this one only ever moves the repository
toward the release, reporting what a person has customized rather than restoring it.

## Report

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook-config.md", ".devbook/arc42/building-blocks/devbook-config.md#stack-report", ".devbook/arc42/building-blocks/devbook-config.md#stack-report"]
```

Owned by [devbook-config](building-blocks/devbook-config.md).

Also called: stack report, read-only report.

The read-only model behind every answer devbook-config gives, printing the path behind each fact
and naming the files that were absent as well as the ones that were read. Naming the source is
what makes an answer checkable rather than authoritative, and it is why an empty table here reads
as *this file was not there* rather than as *there is nothing*.

## Requirement

```meta
date: 2026-09-24
related: [".devbook/arc42/building-blocks/devbook-code-sync.md#capture-specs", ".devbook/arc42/adr/chapter-schema.md"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: `### Requirement:`, promise.

A promise the product makes to someone outside the model, one `### Requirement: <name>`
chapter per rule in a bounded context's `requirements.md`, grouped under the feature it
belongs to. It states one SHALL sentence and one `#### Scenario:` per case — Given, When,
Then — and is proved by e2e tests. The heading shape is OpenSpec's; the grouping under a
feature heading is devbook's, and is what a bridge maps to OpenSpec's per-capability
`spec.md`.

## Review Pass

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook-collaboration.md", ".devbook/arc42/building-blocks/devbook-collaboration.md#review-position"]
```

Owned by [devbook-collaboration](building-blocks/devbook-collaboration.md).

Also called: review, review cycle.

One chapter's trip from a brief to a decision. What it leaves in the chapter is its open
annotation fences — any open is changes requested, none is cleared — and, at the end, a
decision rung. Nothing records the pass itself: who owes the next move lives in the pull
request or the tracker, and the chapter's `status` already says it is not settled.

## Scheduler

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/delivery-schedule.md#scheduler-resolution", ".devbook/tech/hosts.md#scheduled-routines"]
```

Owned by [delivery-schedule](building-blocks/delivery-schedule.md).

Also called: the host's scheduler.

Whatever the live session exposes that turns a name, a cron expression, and a prompt into a
session run on this machine, in a working folder. It is resolved by capability and never named,
and **absent is a normal outcome** — the operation reports it and changes nothing. A cloud
scheduler is never used to create one. The scheduler is also where everything personal lives:
the checkout's path, the approved tools, and the entry ids. Matching by name is
what makes writing any of that into the repository unnecessary.

## Stale Approval

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/devbook-collaboration.md", ".devbook/arc42/building-blocks/devbook-collaboration.md#review-queue", ".devbook/arc42/adr/chapter-schema.md#branch-true-devbook"]
```

Owned by [devbook-collaboration](building-blocks/devbook-collaboration.md).

Also called: lapsed approval.

An approval still written on a chapter whose content has moved under it. It is a reporting
concept rather than a state: nothing transitions a chapter into it, and the queue sweep is what
surfaces it, because a chapter cannot notice its own approval has expired.

**Retiring**, per [the chapter schema record](adr/chapter-schema.md#branch-true-devbook). An
approval becomes the host's state for a change proposal, keyed by the proposal's fingerprint,
so no chapter carries one to go stale. The term goes with `devbook-collaboration`.

## Sync Direction

```meta
date: 2026-10-01
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook.md#meta-block", ".devbook/arc42/adr/chapter-schema.md"]
```

Owned by [devbook](building-blocks/devbook.md).

Also called: `sync`.

Which way changes flow between a sync unit and its code: `push` from the agreed chapter to the
code, `pull` from the code to the chapter, `sync` whichever way the drift verdict points,
`report` nowhere, and `off` out of every sweep. The nearest level that sets one wins, and with
none it is `report`.

Since contract 38 no chapter carries a direction. Backlog keeps the direction map per
repository and folder, per [the chapter schema record](adr/chapter-schema.md#schedules-and-sync),
and the check reports a `sync` field left in a `meta` block as moved to tooling.

## Sync Group

```meta
date: 2026-10-01
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/adr/chapter-schema.md"]
```

Owned by [devbook](building-blocks/devbook.md).

The sync units one sweep run verifies, changes on one branch, and lands as one pull request.
Usually it is one unit; units join only when a chapter ties them — a requirement naming two
aggregates and no feature — and never through a link such as `depends-on`. A group that holds
more than 40 chapters is set aside for a person, not acted on and never split.
`units.mjs --groups` lists them.

## Sync Unit

```meta
date: 2026-10-06
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook-code-sync.md#spec-converter", ".devbook/arc42/adr/chapter-schema.md"]
```

Owned by [devbook](building-blocks/devbook.md).

What one verify pass covers and one pull request changes: an aggregate with the entities,
value objects, and enums it owns, the events it raises, its invariants, and the requirements
and terms that name it; a domain service the same way; a feature with its sub-features and
requirements; one feature flag or setting; one user or technical actor; one building block
file; one component chapter; and one shared-types unit per context for its shared value
objects and enums. `units.mjs` lists them with their chapters and files.

## Tier

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery.md#phase-tier"]
```

Owned by [delivery](building-blocks/delivery.md).

Also called: phase tier, closing tier.

Which closing phases a flow runs — code-modifying or documentation. It follows from the change
kind rather than from preference, and a flow shipped by a higher layer declares its own, because
the engine never enumerates a skill in a layer above it.

## Unanswered Group

```meta
date: 2026-09-08
related: [".devbook/arc42/building-blocks/delivery-surface-collector.md", ".devbook/arc42/adr/surfaces.md"]
```

Owned by [delivery-surface-collector](building-blocks/delivery-surface-collector.md).

Also called: absent capability, not implemented.

A capability group whose tool names this surface does not declare, so a caller resolving it
finds nothing. Deliberately distinct from a stub: an unanswered group means the caller renders
nowhere and knows it; a stub means the caller believes a person saw something. That difference
is why declaring a name you do not implement is forbidden rather than discouraged.
