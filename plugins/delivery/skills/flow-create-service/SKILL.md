---
name: flow-create-service
description: 'Create a new service in an existing project — from an ad-hoc "we need a service for X" request or an approved service specification through service design, implementation, project wiring, testing, local run, and monitoring. Use for new services and for extracting an existing area into its own service; missing specification, responsibilities, or architecture context is derived in Stage 0 rather than being a reason to skip the flow.'
---

# Flow: Create Service in Existing Project

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the target project and repository, and a service name or a one-line description of
what it does.

Derived in Stage 0 when absent: the specification or architecture notes, responsibilities and
ownership boundaries, API or messaging contracts, dependencies, acceptance criteria and
operational expectations, and the runtime validation target.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when an approved specification exists, a full
derivation when it does not.

- Restate the service's responsibility in one or two sentences, in the user's terms.
- Derive its ownership boundaries — what it owns, what stays with existing services.
- Derive its API or messaging contracts at signature level.
- Derive at least one measurable acceptance criterion, plus the operational expectations:
  health, latency, failure behavior.
- Identify the upstream and downstream dependencies and the integration points they touch.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived scope and assumptions in the stage output, then continue to Stage 1.

Escalate instead when the work is really a module inside an existing service, or when the
service boundary is itself an open architectural question: recommend `flow-create-module` or
`flow-arc42` and ask the user.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. the `architecture` role when the boundary needs
review.

## Stage 1: Specification Intake

- Review the responsibility and boundaries recorded in Stage 0.
- Check the boundary against the documented domain model: the service maps to exactly one
  bounded context, and its contracts use that context's ubiquitous language rather than
  inventing parallel terms.
- Capture the API or messaging contracts.
- Identify the upstream and downstream dependencies, naming the integration pattern wherever
  the service talks to another context — anti-corruption layer, shared kernel, published
  language.
- Set the acceptance criteria and operational expectations.

**Agents:** the `architecture` role; the `domain` role when the service introduces, splits, or renames a
bounded context — a service wholly inside one existing context needs no domain pass. Full
domain modeling belongs to `flow-domain`; route there rather than modeling here.

## Stage 2: Implementation Planning

- Map the recorded design onto the repository structure.
- Plan service discovery and the host project's references.
- Define the configuration model — env vars, secrets, defaults.
- Define the health checks and observability signals.

**Agents:** the `architecture` role

## Stage 3: Implementation

- Create the service project in the existing solution.
- Implement its endpoints or workers and their core logic.
- Wire it into the host flow, such as the AppHost or service catalog.
- Configure the dependencies it needs — database, queue, cache.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
Validation → Personal Validation → Create Pull Request → Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow.

New functionality, so Validation runs at full depth: Playwright checks on the health
endpoints and the critical service flows, runtime monitoring active throughout, evidence
recorded.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-create-service"` and stages: Scope Discovery, Specification
  Intake, Implementation Planning, Implementation, Build & Test, Validation, Personal
  Validation, Create Pull Request, Verification, Work Item Update, Summary.
- During Scope Discovery, put the restated responsibility, the derived boundaries and
  contracts, and the acceptance criteria in the stage output, so the user can correct them.
- During Specification Intake, open/update `render_markdown` with the service contract;
  during Implementation Planning, with the design, plus `render_diagram` for any Mermaid that
  goes with it.
