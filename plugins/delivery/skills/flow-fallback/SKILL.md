---
name: flow-fallback
description: 'Generic flow entrypoint, for task categories with no dedicated flow-* skill — or when the skill that does match targets fundamentally different work. Routes the task to the closest specialist agent, runs a minimal plan-execute-review workflow, and closes through the shared phase tier matching the change kind.'
---

# Flow: Fallback

The minimal flow for a task no dedicated `flow-*` skill covers: a routing decision, a short
plan, execution by the closest specialist agent, then the shared closing phases for the tier
the change belongs to. It keeps the flow-first policy intact without inventing a specialized
workflow.

**Unmet preconditions are not "inapplicable."** When a dedicated skill matches the category
but its stated preconditions do not hold — no approved specification, no acceptance criteria,
no architecture sign-off — invoke that skill anyway and derive the missing inputs inside it,
per the `flow-feature`/`flow-bug` exception in
`resources/flow-execution-model.md`. Reach for this fallback only when no
skill covers the category, or when the matched skill targets fundamentally different work.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. Perform a step directly, and say
so, when its specialist agent is not installed.

## Input Expectations

- Task description and desired outcome.
- Task category — testing, tooling, CI, scripting, repository housekeeping — so the closest
  specialist agent can be selected.
- Confirmation that no `flow-*` skill covers the category, plugin-provided or repo-native, or
  a stated reason the matched skill targets fundamentally different work.

## Stage 1: Routing Check

- Confirm no dedicated `flow-*` skill matches the category, plugin-provided or repo-native.
- Stop and invoke the matching skill instead when one matches with unmet preconditions.
- Select the closest specialist agent: the `implement` service for implementation,
  the `architecture` role for architecture-adjacent work, the `docs` role for
  documentation, the `qa` role for test and validation work.
- Determine the change kind — code-modifying or documentation/config — since it selects the
  closing tier and the stage list passed to `start_run`.

**Agents:** the `flow-runner` agent, for the routing decision only

## Stage 2: Plan

- Restate the task goal and scope in one or two sentences.
- Identify the files likely touched and the instruction files governing them — the
  `repo-instructions` slot and any `**/*.instructions.md`.
- Name the smallest validation that proves the change: build, lint, test, or documentation
  review.

## Stage 3: Execute

- Perform the change, following the applicable instruction files and repository guardrails.
- Keep the edits scoped to the stated task.
- Record a blocker rather than widening scope when the task turns out to need a specialized
  workflow after all.

## Stage 4: Review & Recommend

- Run the validation named in Stage 2 and report the result it actually gave.
- Summarize the changed files and paths.
- Recommend a dedicated `flow-*` skill, created in a new session, when this category is
  likely to recur — or, when the fallback was reached because an existing skill was
  inapplicable, recommend amending that skill's scope instead.

Stages 2 through 4 run on the specialist agent selected in Stage 1.

## Final Phases (Shared)

The tier in `resources/flow-phases.md` matching the change kind from Stage 1:
code-modifying runs Build & Test → QA Validation → Personal Validation → Create Pull Request →
Verification → Work Item Update → Summary; documentation/config runs Personal Validation →
Create Pull Request → Work Item Update → Summary. That file defines them.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-fallback"` and stages: Routing Check, Plan, Execute,
  Review & Recommend, then the shared phase names for the tier determined in Stage 1.
- `set_run_context` with the `changeKind` as soon as Stage 1 determines it — it selects the
  closing tier.
