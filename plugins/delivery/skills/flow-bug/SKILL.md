---
name: flow-bug
description: 'Run bug resolution end to end — from an ad-hoc "this is broken" report or a triaged issue through reproduction, root cause analysis, TDD fix implementation (test first), verification, and local runtime validation. Missing reproduction steps, severity, or root cause context is derived in Stage 0 rather than being a reason to skip the flow.'
---

# Flow: Bug Resolution

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: a description of the broken behavior.

Derived in Stage 0 when absent: reproduction steps, incident or issue context, severity,
affected versions or environments, a root cause hypothesis, fix type, and the runtime
validation target.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when a triaged report exists, a full derivation
when it does not.

- Restate the observed versus expected behavior in one or two sentences, in the user's terms.
- Derive at least one measurable verification criterion — the condition the regression test
  must prove.
- Identify the suspected code paths and the integration points they touch.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived scope and assumptions in the stage output, then continue to Stage 1.

Escalate instead when the defect is really a missing feature, or when the fix needs a new
architectural decision or a cross-cutting redesign: recommend `flow-feature` or `flow-arc42`
and ask the user.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. the `architecture` role only when architectural
impact is suspected.

## Stage 1: Bug Intake & Reproduction

- Reproduce the bug from the steps given or derived.
- Determine severity and impact, and which versions and users it reaches.
- Record the reproduction with its logs and traces.

**Agents:** the `implement` service; the `app.start` service when reproduction needs the
application running.

## Stage 2: Root Cause Analysis

- Debug from the logs and diagnostics to the root cause in the codebase.
- Check for related bugs sharing the pattern.
- Reduce it to a minimal reproduction case, and document the findings for the fix.

**Agents:** the `implement` service

## Stage 3: Implementation

- Write the failing test that reproduces the bug first.
- Implement the minimal fix that addresses the root cause, and make the test pass.
- Add the regression tests that keep it fixed, and confirm nothing else broke.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
QA Validation → Spec Verification → Personal Validation → Create Pull Request → Documentation
Update → Work Item Update → Summary. That file defines them; change them there, for every flow.

A bug fix, so QA Validation is targeted: the `qa.run` provider re-runs the original reproduction
steps plus the regression scenario under the runtime monitor. Capture evidence only on request, or when a
failure needs it.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-bug"` and stages: Scope Discovery, Bug Intake & Reproduction,
  Root Cause Analysis, Implementation, Build & Test, QA Validation, Spec Verification, Personal
  Validation, Create Pull Request, Documentation Update, Work Item Update, Summary.
- During Scope Discovery, put the restated observed versus expected behavior, the derived
  verification criterion, and the suspected code paths in the stage output.
- During Bug Intake & Reproduction, open/update `render_markdown` with the drafted bug report.
