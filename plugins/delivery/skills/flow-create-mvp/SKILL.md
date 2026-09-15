---
name: flow-create-mvp
description: 'Run Minimum Viable Product (MVP) creation — from an ad-hoc product idea or an approved MVP specification through planning, implementation, testing, local run, and monitoring with agent handoffs. Use for a first runnable product increment of any size; missing scope, feature priorities, or architecture context is derived in Stage 0 rather than being a reason to skip the flow.'
---

# Flow: Create MVP

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: a project name, or a one-line description of the product idea.

Derived in Stage 0 when absent: the MVP specification or roadmap scope, the core feature list
in priority order, acceptance criteria per feature, the timeline, the runtime validation
target, and any constraints on team size or technology.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when an approved MVP scope exists, a full
derivation when it does not.

- Restate the product outcome the MVP must deliver, in one or two sentences, in the user's
  terms.
- Derive the core feature list, cut to the smallest set that makes the product usable, and
  name what is deliberately out of scope.
- Derive the priority and delivery order across those features.
- Derive at least one measurable acceptance criterion per core feature.
- Identify the target codebase or greenfield starting point, the dependencies, and the risks.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived scope and assumptions in the stage output, then continue to Stage 1.

Escalate instead when the product direction itself is the open question, or when the MVP
needs a new architectural decision or a documented target architecture first: recommend
`flow-spec` and ask the user.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. the `architecture` role when the target
architecture needs shaping.

## Stage 1: MVP Scope Intake

- Review the scope recorded in Stage 0 and its acceptance criteria.
- Establish the initial domain vocabulary — the handful of core concepts the MVP is about,
  named once here so the implementation does not invent competing terms per feature.
- Record the feature priorities and delivery order, the dependencies and risks, and the
  validation target for the implementation run.

**Agents:** the `architecture` role; the `domain` role when the MVP defines a new domain rather than
extending a documented one — vocabulary and context boundaries only, since full domain
modeling belongs to `flow-spec`.

## Stage 2: Implementation Planning

- Break the recorded MVP into implementation slices.
- Map the API contracts and data models onto the current codebase.
- Plan the integration points with external services.
- Define the local runtime validation strategy.

**Agents:** the `architecture` role

## Stage 3: Implementation

- Implement the core features test first.
- Build the API endpoints and services, and integrate the frontend where there is one.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
Validation → Personal Validation → Create Pull Request → Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow.

New functionality, so Validation runs at full depth: Playwright smoke tests over the core
user flows, runtime monitoring active throughout, evidence recorded.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-create-mvp"` and stages: Scope Discovery, MVP Scope Intake,
  Implementation Planning, Implementation, Build & Test, Validation, Personal Validation,
  Create Pull Request, Verification, Work Item Update, Summary.
- During Scope Discovery, put the restated outcome, the core feature list in priority order,
  and the acceptance criteria in the stage output.
- During MVP Scope Intake, open/update `render_markdown` with the recorded scope; during
  Implementation Planning, with the architecture, plus `render_diagram` for any Mermaid that
  goes with it.
