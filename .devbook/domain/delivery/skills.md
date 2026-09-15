# Delivery

```meta
type: skills
related: [".devbook/domain/context-map.md#delivery"]
```

> The twenty-six skills this context ships, by what each lets someone do. Each `flow-*` chapter
> names the page that draws its stages; the shared spine they all run is in [flow.md](flow.md).

## flow-feature

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-feature.md"]
```

Carry a feature from a request to a review-ready change: new functionality, an incremental change
to something that exists, or a small UI tweak. The default lane, and the one the other
code-modifying flows are variations of.

A thin request is the normal case rather than a reason to refuse the run.

## flow-bug

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-bug.md"]
```

Take a defect from "this is broken" to a fix that has a test behind it: reproduce it, find the
cause, fix it test-first, and verify. Missing reproduction steps, severity, or root cause are
derived rather than demanded.

## flow-structure

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-structure.md"]
```

Move what already works without changing what it does — folder moves, project and solution layout,
test and harness placement, and every reference that has to follow. Behaviour is held still on
purpose, so the diff stays reviewable as a move.

## flow-create-module

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-create-module.md"]
```

Add a module to an existing project, or carve an existing area into one. Both end with a boundary
somebody agreed, which is where the work actually is.

## flow-create-service

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-create-service.md"]
```

Add a service to an existing project, or extract an existing area into one. Same shape as the
module flow, plus a process boundary — wiring, configuration, and how it starts are part of the
plan rather than of the implementation.

## flow-create-mvp

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-create-mvp.md"]
```

Get to a first runnable increment of a product. What makes it an MVP is that it runs, not that it
is small, so the flow is the same for a weekend prototype and a first release.

## flow-update-packages

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-update-packages.md"]
```

Move dependencies forward and prove the result still builds and starts — NuGet, npm, SDKs, and
tools — with the security question asked before the build rather than after it.

## flow-aspire-update

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-aspire-update.md"]
```

Upgrade a .NET Aspire stack plan-first: record the baseline, agree the staging while backing out is
still cheap, then upgrade, and decide separately what the new version makes possible.

## flow-project

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-project.md"]
```

Scaffold a development project into a repository that already exists and is governed: the
repository's own configuration, CI, tooling, dependencies, and a structure that builds.

## flow-repo

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-repo.md"]
```

Create and govern a repository before there is a project in it — README, MCP configuration,
instructions, branch protection, templates, governance. Creating the repository itself stays
manual.

## flow-arc42

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-arc42.md"]
```

Write or correct an architecture chapter, a decision record, or a debt record. One flow for all
three, because they are one shape with three templates — and the escalation target when any other
flow discovers it needs a decision.

## flow-domain

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-domain.md"]
```

Write or correct a bounded context: its model, its features or skills, its dependencies, and its
language. It runs the repository's own check and never regenerates the derived indexes.

## flow-tech

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-tech.md"]
```

Write or correct the technology graph — what is used, at what version, and how settled it is —
grounded in package inventories where one exists and in repository analysis where none does.

## flow-design

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-design.md"]
```

Write or correct design principles, tokens, and component guidance, each traced to an
authoritative source. Wireframes, user flows, and UI review are a specialist's work, not this
flow's.

## flow-ai

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-ai.md"]
```

Record how the team works with AI, stage by stage. It records a way of working and never instructs
one, and an adoption rating is never derived from something being installed.

## flow-fallback

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-fallback.md"]
```

The lane for a category no other flow covers. Its first stage will send you away when a dedicated
flow exists: it is a last resort, never an escape hatch from a matching flow whose preconditions
are inconvenient.

## phase-build-test

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#phase"]
```

Build every project and run the unit and end-to-end suites, failing fast on the first red result.
Invoked by a flow and never directly, so its definition lives in one file rather than restated in
sixteen.

## phase-validation

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#phase", ".devbook/domain/delivery/domain.md#change-kind"]
```

Validate the running application, at a depth the change kind decides: a browser pass with captured
evidence for new functionality, targeted verification for a change to existing behaviour,
startup-only for a dependency update, and skipped where there is no runnable application.

### Record the Depth Honestly

```meta
type: sub-feature
```

A shallower depth is reported as the depth it was, never as validation that did not happen. This
is the one guarantee that makes the other three depths usable at all.

### Capture Evidence Without a QA Plugin

```meta
type: sub-feature
related: [".devbook/arc42/adr/46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md"]
```

The evidence rules are the engine's own contract, so they hold with no QA plugin, no `qa.run`
binding, and no capture skill. Capture resolves to the repository's `capture` skill, then the
provider's, then this phase driving it directly; a missing piece changes who captures, never
whether capture happens.

## phase-personal-validation

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#phase", ".devbook/domain/delivery/domain.md#personal-validation"]
```

Hand the run back to a person to look at: bring the application up, publish the review links as
clickable URLs, say what to check by hand, and present the code and QA reviews. It runs again on
every revise round, because a revised change set is a new thing to look at.

### Present, Never Decide

```meta
type: sub-feature
related: [".devbook/domain/delivery/domain.md#gate"]
```

The phase produces the review; the approve / revise / decline decision after it belongs to the
flow-runner. Nothing in the handoff can approve, skip, or soften that gate — which is what lets
the presentation be a shared phase skill while the gate itself stays out of a repository's reach.

### No Agent and No Model

```meta
type: sub-feature
```

It runs inline in the session the person is reading, because a subagent has no user turn to hand
back to and a link nobody can click is not a handback. Starting the application is the phase's own
job: a list of commands for the person to run is a failed handback rather than a shortcut.

## push-branch

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#pull-request-lane"]
```

Push the current branch and set its upstream, and stop there. No pull request — this is the step
for getting commits onto the remote so CI runs.

## update-pr-branch

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#pull-request-lane"]
```

Bring a pull request branch level with its base, resolve the conflicts, re-validate, and push. For
a branch that is behind, or that a required up-to-date check is blocking.

## fix-pr-checks

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#pull-request-lane"]
```

Read a failing job's logs, reproduce locally, classify the failure, fix it, and push until the
checks go green.

## pr-merge-ready

```meta
type: feature
related: [".devbook/domain/delivery/domain.md#pull-request-lane"]
```

Score one pull request against the merge-ready checklist and clear its blockers, using the other
three lane skills as its tools. One pull request per pass.

## start-session-from-issue

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#tracker"]
```

Start this session's work from one tracker item: fetch what matches a filter, select one, claim it,
route it to the flow its type calls for, and run that flow here. One item per run, with a person
present — which is what separates it from the fan-out lane.

## sre-alerts-to-work-items

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#tracker"]
```

Turn active Azure Monitor alerts into tracked work items, so an incident becomes something the
rest of this context already knows how to carry. Azure is the alert source; where the item lands
is the tracker binding's answer, not this skill's.

## install

```meta
type: feature
related: [".devbook/arc42/adr/46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md"]
```

Write the two procedures the engine names but cannot author — `start`, how this repository's
application comes up, and `capture`, how evidence of the feature being built is taken — into the
repository as one editable copy with a pointer wrapper per host, and record what landed.

### Hand the Procedure Over

```meta
type: sub-feature
```

Editing the installed copy is the intended path, not drift. Once its hash matches no release it is
the repository's: reported on every later reconcile, never overwritten. The wrappers stay managed,
so the name and description a phase matches on keep refreshing while the procedure does not.
