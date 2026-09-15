# Delivery

```meta
type: skills
related: [".devbook/domain/context-map.md#delivery"]
```

> The sixteen skills this context ships, by what each lets someone do. Each `flow-*` chapter
> names the page that draws its stages; the shared spine they all run is in [flow.md](flow.md).

## flow-code

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-code.md"]
```

Carry any change to the code from a request to a review-ready change: a feature or an incremental
change, a defect, a structure or layout refactor, a new module, service, or first runnable
increment, and the tooling, CI, scripting, and housekeeping around them. One flow, because the
opening and the close are the same for all of them; the kind is derived in the first stage and
selects the one middle stage that differs — planning for a create or a refactor, reproduction and
root cause for a defect.

A thin request is the normal case rather than a reason to refuse the run. A defect's fix has a
test in front of it; a refactor holds behaviour still on purpose.

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

## flow-spec

```meta
type: feature
related: [".devbook/domain/delivery/flow.flow-spec.md"]
```

Write or correct a devbook folder — an architecture chapter, decision record, or debt record; a
bounded context or the context map; the technology graph; design principles, tokens, and
component guidance; the AI adoption record. One flow for the five folders, because the procedure
is the same and only the role differs: the folder picks who drafts, and the repository's own
instruction file for that folder says what a chapter must look like. It runs the repository's
check and never regenerates the derived indexes, and it is the escalation target when any other
flow discovers it needs a decision.

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
