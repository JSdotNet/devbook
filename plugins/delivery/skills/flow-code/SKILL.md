---
name: flow-code
description: 'Run any change to a repository outside its devbook folders, end to end — a feature or an incremental change, a bug fix, a structure or layout refactor, a new module, service, or first product increment, and the tooling, CI, scripting, and housekeeping work around them. From an ad-hoc request or an approved specification through scope discovery, a middle stage the kind selects, implementation, validation, review, and personal approval. Missing scope, acceptance criteria, reproduction steps, or architecture context is derived in Stage 0 rather than being a reason to skip the flow. DO NOT USE FOR: a devbook chapter (flow-spec), a dependency move (flow-update-packages), or creating and scaffolding a repository (flow-project).'
---

# Flow: Code Change

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: a one-line description of the desired outcome — the behavior, the broken behavior,
the move, or the thing to create.

Derived in Stage 0 when absent: the kind, the change kind, acceptance or verification
criteria, impacted code paths and architecture constraints, an approved specification, story,
or change brief, reproduction steps, and the runtime validation target.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when approved inputs exist, a full derivation
when they do not.

- Restate the request in one or two sentences, in the user's terms — for a defect, observed
  versus expected behavior.
- Derive the **kind**, which selects Stage 2, and the **change kind**, which selects the
  closing tier and the Validation depth:

  | Kind | Covers | Change kind |
  |---|---|---|
  | feature | new or changed behavior, a small UI tweak | new functionality, or a change to existing behavior |
  | create | a new module, service, or first runnable product increment; carving or extracting one | new functionality |
  | refactor | folder moves, project or solution layout, test and harness placement, reference updates — behavior held still | a change to existing behavior |
  | defect | "this is broken" | a bug fix |
  | config | tooling, CI, scripting, documentation outside the devbook folders, housekeeping | a documentation/config change, or nothing to run |

- Derive at least one measurable acceptance criterion — for a defect, the condition the
  regression test must prove; for a refactor, the expected tree, updated references, and a
  green build.
- Identify the impacted code paths and the integration points they touch; for a refactor,
  every surface that encodes the old layout — solution files, references, manifests, scripts,
  CI path filters, documentation links, architecture tests.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived kind, change kind, scope, and assumptions in the stage output, then
  continue to Stage 1.

Escalate instead per **Escalation** in `resources/flow-execution-model.md`: a new
architectural decision, a new bounded context, or a cross-cutting redesign goes to `flow-spec`
first, and the user decides.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. The `architecture` role only when architectural
impact is suspected.

## Stage 1: Specification & Architecture Intake

- Review the scope recorded in Stage 0 and its criteria.
- Map the existing architecture guidance onto the impacted code paths; capture the
  implementation constraints and the affected integration points.
- For *create*: check the boundary against the documented domain model — a module spanning
  two bounded contexts, or a service mapping to more than one, is a design problem to raise
  now; capture the public interfaces or API and messaging contracts in the owning context's
  ubiquitous language, naming the integration pattern wherever the unit talks to another
  context. For an MVP, name the handful of core concepts once, so features do not invent
  competing terms.
- Define the local validation target.

**Agents:** the `architecture` role; the `domain` role when a *create* introduces, splits, or
renames a bounded context — a unit wholly inside one existing context needs no domain pass,
and full domain modeling belongs to `flow-spec`.

## Stage 2: By Kind

One middle stage, selected by the kind. *feature* and *config* skip it.

**create — Implementation Planning.** Map the recorded design onto the project structure;
define the data contracts, error handling, and — for a service — service discovery, the host
project's references, the configuration model, and the health and observability signals;
plan the integration points; break the work into incremental slices. *Agents:* the
`architecture` role.

**refactor — Refactor Planning.** List the exact moves and renames before touching a file,
the reference updates each one forces, and the sequence that lands references in the same
change set as the move. Call out generated files, case-only renames, path-sensitive tooling,
and files that must not move. *Agents:* the `architecture` role, the `implement` service.

**defect — Reproduction & Root Cause.** Reproduce from the steps given or derived; record
the reproduction with its logs and traces, and its severity and reach. Debug from the
diagnostics to the root cause, check for related defects sharing the pattern, and reduce it
to a minimal case. *Agents:* the `implement` service; the `app.start` service when
reproduction needs the application running.

## Stage 3: Implementation

- Write code to the repository's standards and patterns, test first. For a defect, the
  failing test that reproduces it comes first, then the minimal fix, then the regression
  tests that keep it fixed.
- For *create*: create the unit in the existing layout — for a service, its project, its
  endpoints or workers, its wiring into the host flow such as the AppHost, and the
  dependencies it needs.
- For *refactor*: move to the recorded layout, update every reference found in Stage 2 and
  any test or document that encodes the old structure, and leave behavior unchanged.
- Keep the change set incremental, so it stays reviewable. Document the logic a reader cannot
  infer.

**Agents:** the `implement` service

## Final Phases (Shared)

The tier in `resources/flow-phases.md` matching the change kind from Stage 0. Code-modifying
— every kind but *config*, and *config* when it changes something that runs — closes with:
Build & Test → Validation → Personal Validation → Create Pull Request → Verification → Work
Item Update → Summary. Documentation/config closes with: Personal Validation → Create Pull
Request → Work Item Update → Summary. That file defines them; change them there, for every flow.

Validation depth follows the change kind: full depth with capture for new functionality,
scenarios drawn from the acceptance criteria — a new module's or service's endpoints, an
MVP's core user flows; targeted for a bug fix, re-running the reproduction plus the
regression scenario, and for a refactor, the affected flows; `skipped` with the reason when
there is nothing to run.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-code"` and stages: Scope Discovery, Specification &
  Architecture Intake, the Stage 2 name the kind selects when it runs, Implementation, then
  the shared phase names for the tier.
- `set_run_context` with the `changeKind` as soon as Stage 0 derives it — it selects the
  closing tier and the Validation depth.
- During Scope Discovery, put the restated request, the kind, the derived criteria, and the
  impacted code paths in the stage output — Personal Validation reads them there.
- During Stage 1 and Stage 2, open/update `render_markdown` with the specification, the
  contract, the plan, or the drafted bug report, and `render_diagram` for any Mermaid that
  goes with it.
