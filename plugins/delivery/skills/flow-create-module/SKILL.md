---
name: flow-create-module
description: 'Create a new module in an existing project — from an ad-hoc "we need a module for X" request or an approved module specification through planning, implementation, testing, local run, and monitoring. Use for new modules and for carving an existing area into a module; missing specification, boundaries, or architecture context is derived in Stage 0 rather than being a reason to skip the flow.'
---

# Flow: Create Module

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the target project, and a module name or a one-line description of what it does.

Derived in Stage 0 when absent: the specification or design notes, purpose and boundaries,
public interfaces and consumers, dependencies, acceptance criteria, and the runtime
validation target.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when an approved specification exists, a full
derivation when it does not.

- Restate the module's purpose in one or two sentences, in the user's terms.
- Derive its boundaries — what belongs inside, what stays outside — and its public
  interfaces and expected consumers.
- Derive at least one measurable acceptance criterion.
- Identify its dependencies on existing modules or services and the integration points they
  touch.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived scope and assumptions in the stage output, then continue to Stage 1.

Escalate instead when the module is really a separate deployable service, or needs a new
architectural decision, a new bounded context, or a cross-cutting redesign: recommend
`flow-create-service` or `flow-arc42` and ask the user.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. the `architecture` role only when architectural
impact is suspected.

## Stage 1: Specification Intake

- Review the purpose and boundaries recorded in Stage 0.
- Check the boundary against the documented domain model. A module spanning two bounded
  contexts is a design problem to raise now, not after the code exists.
- Capture the public interfaces and consumers in the owning context's ubiquitous language.
- Capture the acceptance criteria, non-functional requirements, and integration risks.

**Agents:** the `architecture` role; the `domain` role when the module introduces or crosses a bounded
context — a module inside one existing context needs no domain pass.

## Stage 2: Implementation Planning

- Map the recorded design onto the existing project structure.
- Define the data contracts and the error handling behavior.
- Plan the integration points with existing modules and services.
- Break the work into an incremental delivery checklist.

**Agents:** the `architecture` role

## Stage 3: Implementation

- Create the module in the existing project layout, following its patterns.
- Implement the core functionality, then the dependency wiring and configuration.
- Keep the change set incremental, so it stays reviewable.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
QA Validation → Spec Verification → Personal Validation → Create Pull Request → Documentation
Update → Work Item Update → Summary. That file defines them; change them there, for every flow.

New functionality, so QA Validation runs at full depth: Playwright checks on the new module's
endpoints and flows, runtime monitoring active throughout, evidence recorded.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-create-module"` and stages: Scope Discovery, Specification
  Intake, Implementation Planning, Implementation, Build & Test, QA Validation, Spec
  Verification, Personal Validation, Create Pull Request, Documentation Update, Work Item
  Update, Summary.
- During Scope Discovery, put the restated purpose, the derived boundaries and public
  interfaces, and the acceptance criteria in the stage output.
- During Specification Intake, open/update `render_markdown` with the acceptance criteria;
  during Implementation Planning, with the module design, plus `render_diagram` for any
  Mermaid that goes with it.
