---
name: flow-aspire-update
description: 'Run .NET Aspire upgrades with a plan-first workflow. Creates and refines an upgrade plan, performs staged updates, enables new Aspire features, and validates runtime behavior with recorded results.'
---

# Flow: Aspire Update

This flow derives its own scope: Stage 1 inventories the current Aspire stack, captures the
baseline, and sets the success criteria; Stage 2 turns that into a batched upgrade path — so
a request as small as "move us to the latest Aspire" is in scope. An approved upgrade scope
aligns those stages instead of replacing them.

Escalate only when the upgrade forces a new architectural decision, or when adopting a new
Aspire capability changes the target architecture. Recommend `flow-arc42` and ask the user.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the repository or project.

Derived in Stages 1–2 when absent: the current and target Aspire versions, the success
criteria for the upgrade and for feature adoption, the new features to adopt, and any
constraint such as preserving the local developer workflow.

## Stage 1: Upgrade Intake & Baseline

- Inventory the current Aspire stack — packages, SDK constraints, AppHost integrations.
- Capture the baseline behavior — build, tests, runtime health — before any package changes.
- Determine the upgrade scope: current and target versions, and the rollback boundaries.
- Define the success criteria for the upgrade and for feature adoption, and record them in
  the stage output before Stage 3 changes anything.

**Baseline gate:** a green baseline is required before upgrading, so post-upgrade failures
are attributable. On a red baseline, record the failing build, tests, or health checks as
pre-existing, then either fix them inside this run or agree with the user to proceed with
those items explicitly excluded from the success criteria. Never upgrade over an unrecorded
red baseline, and never decline the request over one.

**Agents:** the `implement` service

## Stage 2: Plan Refinement

- Read the release notes and breaking changes for the target versions.
- Refine the plan with risk controls, migration notes, and dependency ordering.
- Split the work into batches, low-risk first.
- Finalize which new Aspire capabilities the run adopts.

**Agents:** the `architecture` role

## Stage 3: Implementation

- Apply the package updates in the planned batches, each one reversible on its own.
- Upgrade the AppHost integrations and the service references that follow them.
- Resolve the breaking changes in configuration and wiring.

**Agents:** the `implement` service

## Stage 4: New Feature Adoption

- Enable the features chosen in Stage 2, and configure them in AppHost and the service
  projects.
- Add or update the telemetry and health setup those features require.
- Record the enabled features and their expected operational impact in the stage output.

**Agents:** the `implement` service, the `architecture` role

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
QA Validation → Personal Validation → Create Pull Request → Spec Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow.

A framework upgrade, so QA Validation covers startup health plus Playwright smoke checks on
the critical paths the upgrade and the adopted features touch, under the runtime monitor. Capture
evidence only for adopted new functionality, or when a failure needs it.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-aspire-update"` and stages: Upgrade Intake & Baseline, Plan
  Refinement, Implementation, New Feature Adoption, Build & Test, QA Validation, Personal
  Validation, Create Pull Request, Spec Verification, Work Item Update, Summary.
- During Plan Refinement, open/update `render_markdown` with the refined upgrade plan.
