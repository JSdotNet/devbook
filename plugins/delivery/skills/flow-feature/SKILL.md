---
name: flow-feature
description: 'Run feature work end to end — from an ad-hoc request or an approved specification through implementation, validation, review, and personal approval. Use for new features, incremental changes to existing features, and small UI tweaks; missing scope, acceptance criteria, or architecture context is derived in Stage 0 rather than being a reason to skip the flow.'
---

# Flow: Feature Development

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: a feature name, or a one-line description of the desired behavior.

Derived in Stage 0 when absent: acceptance criteria, impacted code paths and architecture
constraints, an approved specification or story, parent epic, target milestone, and the
runtime validation target.

## Stage 0: Scope Discovery

Run this stage first, always — a quick intake when approved inputs exist, a full derivation
when they do not.

- Restate the requested behavior in one or two sentences, in the user's terms.
- Derive at least one measurable acceptance criterion; add more only where the request is
  genuinely multi-part.
- Identify the impacted code paths and the integration points they touch.
- Identify the governing instructions — the repository instructions bound to the
  `repo-instructions` slot, any matching `**/*.instructions.md`, and relevant guidelines or
  ADRs from the checked-in chapters and any MCP server bound to `spec`.
- Record the derived scope and assumptions in the stage output, then continue to Stage 1.

Escalate instead when the request needs a new architectural decision, a new bounded context,
or a cross-cutting redesign: recommend `flow-arc42` and ask the user.

**Agents:** the flow-runner owns the decision half; the identification bullets go to a
read-only search sub-agent per **Splitting Scope Discovery** in
`resources/flow-execution-model.md`. the `architecture` role only when architectural
impact is suspected.

## Stage 1: Specification & Architecture Intake

- Review the scope recorded in Stage 0 and its acceptance criteria.
- Map the existing architecture guidance onto the impacted code paths.
- Capture the implementation constraints and the affected integration points.
- Define the local validation target for the approved change.

**Agents:** the `architecture` role

## Stage 2: Implementation

- Write code to the repository's standards and patterns, test first.
- Document the logic a reader cannot infer.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
QA Validation → Personal Validation → Create Pull Request → Spec Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow.

New functionality, so QA Validation runs at full depth: Playwright scenarios drawn from the
acceptance criteria, runtime monitoring active throughout, evidence recorded.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-feature"` and stages: Scope Discovery, Specification &
  Architecture Intake, Implementation, Build & Test, QA Validation, Personal Validation, Create
  Pull Request, Spec Verification, Work Item Update, Summary.
- During Scope Discovery, put the restated behavior, the derived acceptance criteria, and the
  impacted code paths in the stage output — Personal Validation reads them there.
- During Specification & Architecture Intake, optionally open/update `render_markdown` or
  `render_diagram` with the specification or architecture artifacts.
