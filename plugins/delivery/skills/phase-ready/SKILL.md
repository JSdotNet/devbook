---
name: phase-ready
description: 'The ready check before Personal Validation in every flow-* flow. Reads what review, Build & Test, Verify, Spec Check, and the scope recorded, and either hands the run to the gate or sends a brief of what is missing back to phase-implement — phase-drafting in flow-spec — within policy.ready.retryBudget. Run inline by the flow-runner agent, never configured, never directly.'
---

# Phase: Ready

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Checks the recorded results of review, build-test, verify, spec-check and the scope's criteria
- Not ready: sends a brief of what's missing back to implement (flow-spec: drafting), within `policy.ready.retryBudget`
- Budget spent: hands over to the gate with the open items listed first

**Doesn't**

- Fix anything or run tests itself
- Send code-ahead or unresolved rows back: those go to the gate
- Approve: only you do, at Personal Validation

Nothing reaches Personal Validation half-done. The flow-runner runs this check **inline**,
right before the gate, in both flows. It takes **no configuration**: a `phase-ready` key in any
`phases` map is refused, and no agent, skill, model, or effort can be bound to it. It does no
new work — it reads what the earlier phases recorded and decides.

## Steps

1. **Read the recorded results** of this pass — the stage outputs, and `get_run` on a resumed
   session — never re-run anything to find out.
2. **List the open items**, one per row that applies:

   | Not ready when | Recorded by |
   | --- | --- |
   | A review blocker is still open | `phase-review` |
   | The build or a suite is red | `phase-build-test` |
   | A Verify scenario failed, or required tooling was missing | `phase-verify` |
   | An acceptance criterion or seam in scope has no passing test, or Spec Check reports it `spec-ahead` or `conflict` | `phase-scope`, `phase-spec-check` |
   | A scenario page Scope listed has a failed part, or Spec Check reports its run `stale` | `phase-verify`, `phase-spec-check` |
   | `flow-spec`: the devbook check fails, or a chapter in scope lacks its `meta` block | `phase-check-review` |

   A phase that ended `skipped` for a recorded reason is not an open item. A phase that ended
   `blocked` is.
3. **Set aside what needs a person.** `code-ahead` and `unresolved` Spec Check rows never send
   the run back — the chapter is a person's call, and Spec Check may already have brought it
   level. Carry them to the gate as questions, with every `stale` row for a page Verify recorded
   as not run at its depth — startup-only, or `skipped` with nothing to run — since another
   round cannot run it either.
4. **Decide.** The round count is persisted as `readyRounds` in the run's `runContext` with
   `set_run_context`, so a resumed session reads it back instead of starting over.
   - **No open items:** ready. Hand the run to Personal Validation.
   - **Open items, `readyRounds` below `policy.ready.retryBudget`** (default `2`): not ready.
     Write a brief naming exactly what is missing — each item with the target, test, or
     scenario and the error or verdict that recorded it — increment `readyRounds`, and send
     the run back to `phase-implement`, or `phase-drafting` in `flow-spec`. Every phase after
     it runs again, through this check.
   - **Open items, budget spent:** go to Personal Validation anyway, with every open item
     listed **first**, ahead of the review handoff. Never present unfinished work as finished,
     and never loop past the budget.
   - **Unattended run, budget spent:** park instead of reaching the gate — a handoff brief
     naming what is done and every open item, `approval` left `pending`, and stop.

## Outputs

- The verdict — `ready`, `not ready` with the brief, or `budget spent` with the open items —
  and the round it was reached in.
- The open items recorded by `phase-scope` or `phase-spec-check`, which the flow-runner
  reports as escaped defects found at `Ready`, per **Quality Facts** in
  `resources/surface-contract.md`.
- The questions for the gate: `code-ahead` and `unresolved` rows, the `stale` rows for pages
  Verify could not run at its depth, and on a spent budget every open item.

## Dashboard Reporting

Report as the `Ready` stage via the shared **Reporting Contract** in
`resources/surface-contract.md`: `done` when ready, `blocked` with the brief in `output` when
the run goes back, `done` with the open items in `output` when the budget is spent. Each pass
is a new transition, so the rounds stay visible.

## Reference

Phase definition: **The Ready Check** in `resources/flow-phases.md`. Policy key:
`ready.retryBudget` in `resources/engine-contract.md`.
