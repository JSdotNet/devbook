# Delivery Schedule

```meta
type: domain
related: [".devbook/domain/context-map.md#delivery-schedule", ".devbook/arc42/adr/plugin-boundaries.md"]
```

## Schedule

```meta
type: aggregate
aliases: [routine, automation, trigger, cron entry]
related: [".devbook/arc42/05-building-block-view.md#schedule-plugin"]
```

One trigger: a cadence, a target, the plugins that target needs, and a prompt self-contained
enough to run with nobody watching. It is the consistency boundary because those four are only
meaningful together — a cadence with a target the repository has not enabled is a session that
starts and immediately has nothing to run.

**A schedule is a trigger and never a procedure.** The `schedule-*` entry point is what runs;
the schedule is what asks. That separation is why every entry point is also runnable by hand,
and why a trigger can be created, disabled, and re-created without touching what it fires.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| A target is an entry point, a `fleet-*` skill, or a read-and-report skill — never a flow | `check.mjs` | untested |
| A cron expression that could fire more than hourly is rejected | `check.mjs` | untested |
| The `requires` list names the target's own plugin | `check.mjs` | untested |
| Every prompt begins with the preamble, stated once and not restated per schedule | prompt assembly | untested |
| A trigger whose target plugin the repository has not enabled is reported and skipped, never scheduled | `install()` | untested |
| Schedules are matched by name, so a second sync updates rather than duplicates | `install()` | untested |
| No placeholder the contract does not name appears in a prompt | `check.mjs` | untested |

### Cadence

```meta
type: value-object
```

When the trigger fires, as a cron expression in UTC. Hourly is the ceiling: anything that could
fire more often is rejected, because an unattended run that overlaps its own previous run has no
way to notice it is doing so.

A repository changes a cadence in its own selection rather than in the catalog, which is what
keeps the shipped catalog readable as the default rather than as somebody's current setting.

### Target

```meta
type: value-object
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

The skill a trigger fires, plus the plugins it needs to be present. Three kinds are admissible —
an entry point, a fan-out skill, a read-and-report skill — and one is not: a flow ends at a gate,
and an unattended run parks where a gate would be, so scheduling a flow schedules a park.

### Prompt

```meta
type: value-object
related: [".devbook/domain/delivery-schedule/domain.md#preamble"]
```

What the cloud session is given, assembled from the shared preamble and the schedule's own task
half. It has to be self-contained: the session starts with nothing but the repository, so
anything the prompt does not say is not available to be remembered.

## Entry Point

```meta
type: aggregate
aliases: [schedule skill, schedulable procedure]
```

A `schedule-*` skill that picks its own input, so it needs no person to hand it one — the top
open bug, every pull request waiting on a reviewer, the outdated packages, the week's changes in
the tracked repositories, the repository's own day or week, the instruction assets a model loads.
Fifteen ship here.

Picking its own input is the entire distinguishing property. A procedure that needs an argument
needs a person, and a person is exactly what an unattended run does not have.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| It selects its own input and requires no argument | authoring | untested |
| It is runnable by hand as well as on a cadence | authoring | untested |
| It never passes a gate — it parks with a handoff brief where Personal Validation would be | run | untested |
| It never merges, approves, closes, or deletes | run | untested |
| A change lands as a pull request from `schedule/<name>/<date>`; a report lands as a labelled issue | run | untested |
| A run updates what its previous run left open rather than opening a second | run | untested |

## Schedule Selection

```meta
type: aggregate
related: [".devbook/domain/plugin-authoring/domain.md#stamp", ".devbook/arc42/05-building-block-view.md#stack-config"]
```

Which schedules this repository chose and any cadence it overrode, recorded under
`components.schedule` in the stack config and written by this context's install skill alone.

The split is by who the fact belongs to. The selection and the overrides are repository facts
and are committed; the environment, the model, and the scheduler's own ids are personal and stay
in the scheduler. Matching by name is what makes writing the ids down unnecessary.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Nothing personal is written into the repository | `install()` | untested |
| The selection is written by this context's install skill and by nothing else | `install()` | untested |
| A deselected schedule is disabled rather than deleted, so re-selecting it does not duplicate | `install()` | untested |
| A schedule that would start without its skill is refused rather than created | `install()` | untested |

### Cadence Override

```meta
type: value-object
```

A repository's replacement for a catalog cadence. It is a value in the selection rather than an
edit to the catalog file, so an upgrade can move the shipped default without silently reverting
somebody's choice — or silently keeping it.

## Scheduler Resolution

```meta
type: domain-service
related: [".devbook/domain/delivery-schedule/domain.md#scheduler"]
```

Finds whatever the live session exposes that turns a name, a cron expression, a repository, and
a prompt into a scheduled session, and creates, updates, disables, reads, or fires an entry
through it.

Invocation semantics: command-invoked, by the three catalog skills. **No scheduler is a normal
outcome:** the operation reports it and stops without failing anything, the same shape a surface
takes.

It is a service rather than behaviour on [Schedule](#schedule) because it is the one place a
host capability is touched at all — everything else here is host-neutral data, and keeping the
resolution in one place is what makes that true.

## Catalog Check

```meta
type: domain-service
```

Validates the shipped catalog: a malformed entry, a cron that could fire more than hourly, a
target that is a flow or does not exist, a `requires` list omitting the target's plugin, a
placeholder the contract does not name.

Invocation semantics: command-invoked, and run before committing. It is the only thing that
enforces the rule a schedule may not target a flow, which is otherwise a sentence in a document
nobody re-reads.

## Schedule Report Published

```meta
type: domain-event
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/plugin-authoring/domain.md#tracker"]
```

Published when an unattended run has something to say: a report as an issue labelled
`schedule-report`, or a change as a pull request from a dated branch. It is the only way a run
nobody watched reaches a person, so a run that publishes nothing has, from outside, not happened.

### Payload

- `kind` — a report issue, or a pull request from `schedule/<name>/<date>`
- `schedule` — which trigger fired it, so the next run can find what this one left open
- `findings` or `changes` — what was found or what was changed, in the run's own words

### Consumers

- **The maintainer**, who reads it on the tracker rather than in a session they were not in.
- **The next run of the same schedule**, which updates what this one left open instead of
  opening a second.

### Published language rules

- **Never merge, approve, close, or delete.** Every change lands as a pull request and every
  report as a labelled issue; the run's authority ends at publishing.
- **Update, do not accumulate.** A weekly report that opens a new issue every week is a backlog
  of its own within two months.
- **Nothing personal travels.** The environment, the model, and the scheduler ids stay in the
  scheduler; nothing published here would be wrong for the next person who opens the file.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — plugin,
> layer, schedule, flow skill — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language).

### Catalog

```meta
type: term
date: 2026-09-08
aliases: [schedule catalog, trigger files]
related: [".devbook/domain/delivery-schedule/domain.md#schedule", ".devbook/domain/delivery-schedule/domain.md#catalog-check"]
```

The set of schedule files this plugin ships — the defaults, readable as defaults. A repository
selects from it and overrides a cadence in its own stamp rather than by editing the file, so an
upgrade can move a shipped default without silently reverting or silently keeping somebody's
choice.

### Preamble

```meta
type: term
date: 2026-09-08
aliases: [unattended rules]
related: [".devbook/domain/delivery-schedule/domain.md#prompt"]
```

The unattended rules every prompt starts with, stated once in one file: park rather than pass a
gate, never merge or approve or close or delete, publish as a pull request or a labelled issue,
update what the last run left open, carry nothing personal into the repository.

One file rather than six copies, because this is the most safety-critical prose in the plugin and
six copies drift.

### Scheduler

```meta
type: term
date: 2026-09-08
aliases: [the host's scheduler]
related: [".devbook/domain/delivery-schedule/domain.md#scheduler-resolution", ".devbook/tech/hosts.md#scheduled-cloud-sessions"]
```

Whatever the live session exposes that turns a name, a cron expression, a repository, and a
prompt into a scheduled session. It is resolved by capability and never named, and **absent is a
normal outcome** — the operation reports it and changes nothing.

The scheduler is also where everything personal lives: the environment, the model, and the entry
ids. Matching by name is what makes writing any of that into the repository unnecessary.
