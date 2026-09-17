---
name: phase-build-test
description: 'Shared Build & Test phase for code-modifying flow-* flows. Builds all projects and runs the unit and end-to-end suites first, failing fast on any red result. Invoked in order by the flow-runner agent.'
---

# Phase: Build & Test

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reusable **Build & Test** phase shared by every code-modifying `flow-*` flow. The
`flow-runner` agent invokes this skill first — before Validation and Personal
Validation — so build and test behavior lives in one place instead of in each skill.

## When To Run

- Run for code-modifying flows (`flow-code`, `flow-update-packages`, `flow-project`).
- Always run this phase **first**, after the skill's own unique stages produce a change set.
- Documentation/config flows skip this phase.

## Inputs

- The change set produced by the calling flow.
- Optional project-specific build/test entry points (solution, test projects, E2E runner).

## Run This Phase In A Sub-Agent

**This phase is delegated, not run inline.** Build and test output is the most verbose,
least reusable text a flow produces, and every line of it read inline stays in the
owner session's context for the rest of the run — re-sent, and re-billed, on every later
turn. Run in a sub-agent it costs one summary instead.

- **Invoke it with a single `Agent` call** in the **same worktree** (no `isolation`), using
  the model resolved for this phase's category per
  `resources/flow-model-selection.md`.
- **Ask for a summary, never logs.** The sub-agent returns the structured **Outputs** below:
  results, counts, and the failing targets with the specific error lines that matter. It
  does not return build transcripts, full test output, or restated command invocations.
- **The flow-runner reports the stage** from that summary — the sub-agent never
  calls surface tools itself.
- **Run inline only when delegation is impossible** (the `Agent` tool is unavailable). A
  short re-run of a single failing test after a one-line fix may also stay inline; a full
  build-and-suite pass may not.

## Steps

1. **Build all projects** and fail fast on any build error.
2. **Run the unit test suite** and require it to pass.
3. **Run the automated end-to-end (E2E) test suite** and require it to pass.
4. **Stop and fix on red** — do not hand control to Validation or Personal Validation
   while the build, unit, or E2E tests are failing.

Batch these into as few shell invocations as the toolchain allows: chained commands cost one
model turn, and one turn is one whole prompt re-read. Splitting a build and three test
projects across five separate calls costs five.

Fixing a red build is **Implementation**, not this phase: return the failure and let the
flow-runner route it, rather than expanding the phase's sub-agent into a repair session.

## Outputs

- Build result (pass/fail) and the failing targets when red.
- Unit and E2E test results with pass/fail counts.
- A go/no-go signal for the next phase (Validation).

These are what the sub-agent returns, and all of it: a failing target is named with the
error that identifies it, not with the surrounding log.

## Dashboard Reporting

- Report as the `Build & Test` stage via the shared **Reporting Contract** in
  `resources/surface-contract.md` (`update_stage` `in_progress` → `done`
  or `blocked`).

## Agents

- The provider bound to the `validate` service, invoked as a sub-agent per **Run This Phase In
  A Sub-Agent** above. Unbound, this phase is the default provider and runs the builds and
  suites itself. Continue without a separate approval prompt before this phase.

## MCP Servers

- `microsoft-learn` *(optional)* for targeted official .NET/Azure/Aspire guidance or code
  samples when build/test failures require stack-specific remediation.

## Reference

Phase definition: `resources/flow-phases.md`.
