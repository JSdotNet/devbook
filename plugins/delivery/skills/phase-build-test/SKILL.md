---
name: phase-build-test
description: 'Shared Build & Test phase for flow-code. Once every slice is reviewed clean, builds every project and runs the unit and end-to-end suites once, returning the failing targets with the error lines that matter and never fixing them. Invoked in order by the flow-runner agent, never directly.'
---

# Phase: Build & Test

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Builds every project and runs the unit and end-to-end suites once
- Returns the failing targets with the error lines that matter

**Doesn't**

- Fix a failure (implement does)
- Continue on red
- Run the app or QA

The `flow-runner` agent invokes this skill once every slice of `phase-implement` ⇄
`phase-review` is clean, before Verify. It is the run's **one full run** of the suites:
`phase-implement` runs only compile and the tests it touched.

## When To Run

- Every `flow-code` run, whatever the kind — a `config` change still builds, because a broken
  workflow file or script fails here. `flow-spec` has no Build & Test.
- Once per pass. The ready check (`skills/phase-ready/SKILL.md`) is what sends a red result
  back to `phase-implement`; this phase then runs again on the next pass.

## Inputs

- The change set the run produced.
- Optional project-specific build/test entry points (solution, test projects, E2E runner).

## Run This Phase In A Sub-Agent

**This phase is delegated, not run inline.** Build and test output is the most verbose,
least reusable text a flow produces, and every line of it read inline stays in the
owner session's context for the rest of the run — re-sent, and re-billed, on every later
turn. Run in a sub-agent it costs one summary instead.

- **Invoke it with a single `Agent` call** in the **same worktree** (no `isolation`), using
  the agent, model, and effort resolved for this phase per `resources/phase-resolution.md`.
- **Ask for a summary, never logs.** The sub-agent returns the structured **Outputs** below:
  results, counts, and the failing targets with the specific error lines that matter. It
  does not return build transcripts, full test output, or restated command invocations.
- **The flow-runner reports the stage** from that summary — the sub-agent never
  calls surface tools itself.
- **Run inline only when delegation is impossible** (the `Agent` tool is unavailable).

## Steps

1. **Build all projects.** A build error ends the run of this phase: report it and run no
   suite against a broken build.
2. **Run the unit test suite.**
3. **Run the automated end-to-end (E2E) test suite.**
4. **Stop on red and return.** Record every failing target and hand back. Do not edit code,
   re-run with a fix, or hand control on to Verify.

Batch these into as few shell invocations as the toolchain allows: chained commands cost one
model turn, and one turn is one whole prompt re-read. Splitting a build and three test
projects across five separate calls costs five.

**Never fix a failure.** Fixing a red build is `phase-implement`'s work: the result is
recorded, the ready check turns it into a brief, and the run goes back. A sub-agent that
starts repairing turns a cheap summary into a repair session nobody reviews.

## Outputs

- Build result (pass/fail) and the failing targets when red.
- Unit and E2E test results with pass/fail counts.
- The failing targets, each named with the error that identifies it, not with the
  surrounding log — this is what the ready check puts in its brief, and what the flow-runner
  records as one escaped defect each under **Quality Facts** in `resources/surface-contract.md`.

These are what the sub-agent returns, and all of it.

## Dashboard Reporting

- Report as the `Build & Test` stage via the shared **Reporting Contract** in
  `resources/surface-contract.md` (`update_stage` `in_progress` → `done`
  or `blocked`). A red result is `blocked` with the failing targets in `output`.

## Agents

- The agent the `phase-build-test` entry names, invoked as a sub-agent per **Run This Phase In
  A Sub-Agent** above. With none, this skill is the procedure and the sub-agent runs the
  builds and suites itself. Continue without a separate approval prompt before this phase.

## MCP Servers

- `microsoft-learn` *(optional)* for naming the likely cause of a stack-specific failure in
  the output — never for fixing it here.

## Reference

Phase definition: `resources/flow-phases.md`.
