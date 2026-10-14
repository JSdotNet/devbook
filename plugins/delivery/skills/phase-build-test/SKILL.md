---
name: phase-build-test
description: "Build & Test phase of flow-code: builds every project and runs the unit and end-to-end suites once, returning failures unfixed. flow-runner only."
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

The run's **one full run** of the suites, once per pass — `phase-implement` runs only compile
and the tests it touched. A `config` change still builds: a broken workflow file or script
fails here. Its place in the order: `resources/flow-phases.md`.

## You Run Delegated

You run delegated, per `resources/phase-resolution.md`. Return only the **Outputs** below —
no build transcript, no full test output, no restated commands, and no surface calls: the
flow-runner reports the stage from what you return, a red result as `blocked`.

## Steps

1. **Build all projects.** A build error ends this phase: report it and run no suite against
   a broken build.
2. **Run the unit suite, then the end-to-end suite**, chained into as few shell invocations as
   the toolchain allows — each call is one more whole-prompt turn.
3. **Stop on red and return.** Never fix a failure, re-run with a fix, or hand on to Verify:
   the ready check turns the result into a brief for `phase-implement`, and a runner that
   starts repairing turns a cheap summary into a repair session nobody reviews.

## Outputs

- Build result, and unit and end-to-end results with pass/fail counts.
- The failing targets, each named with the error that identifies it, not the surrounding log —
  what the ready check puts in its brief and the flow-runner records as one escaped defect
  each under **Quality Facts** in `resources/surface-contract.md`.
