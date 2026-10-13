---
name: fix-pr-checks
description: "Diagnose and fix failing pull request checks — read the failing job logs, reproduce locally, classify the failure, apply a fix, and push until the checks go green. Use when: PR checks are red, CI is failing, a required status check is blocking merge, or a build/test/lint job fails on a PR."
---

# Fix Failing Pull Request Checks

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Take a pull request with red checks to green. The skill reads the actual failing job logs
rather than guessing, reproduces the failure locally where possible, fixes the root cause, and
verifies the checks pass after the push.

## Pull Request Lane

Every `gh` command below is one spelling of the `pr-lane` slot. Resolve the slot first and use
whatever pull-request CLI or API the session offers for the same operation. The failing job
logs are the whole input here, so unbound there is nothing to diagnose: say once that no pull
request lane is available and stop, rather than guessing at a fix. Never fail on a missing
binary. The slot and its unbound default are in `resources/engine-contract.md`.

## Inputs

- Pull request number (default: the PR for the current branch).
- Maximum fix-and-push iterations before stopping to report (default: `3`).
- Whether to fix the code or only diagnose (default: fix).

## Hard Constraints

- Make a failing check pass by fixing the code, or the test when the test carries the wrong
  expectation. Never weaken or delete the assertion that fails, skip the test, mark the step
  `continue-on-error`, or disable a lint rule repository-wide to silence one violation: each
  turns a red check green while the defect it caught ships.
- Re-run a failing job at most once. A failure that passes on that re-run is classified flaky
  and reported as flaky.
- Validate a fix locally before pushing it whenever local validation is possible.

## Workflow

### Phase 1 — Collect Failures

1. List every check and its conclusion, then read only the failing steps of each failing run
   or job with `gh run view --log-failed` — the full log is mostly setup noise.
2. Build the failure inventory before changing anything:

   | Check | Job | Failure Type | First Error | Reproducible Locally |
   |---|---|---|---|---|
   | `build` | `build (ubuntu-latest)` | Compile | `CS0246: type or namespace 'Foo'` | Yes |
   | `test` | `test (net9.0)` | Test | `OrderTests.Total_Rounds` | Yes |
   | `lint` | `markdownlint` | Lint | `MD013 line-length` | Yes |

   Matrix jobs fail per leg: fix the leg that failed first — the others often share one cause.
   A required check that never started (`EXPECTED` in the rollup) usually means a path filter
   or a workflow trigger mismatch, not a code failure. A check that needs repository secrets
   always fails on a fork PR; recognise that before treating it as a code defect.

### Phase 2 — Classify

3. Classify each failure and route it:

   | Failure type | Signal | Route |
   | --- | --- | --- |
   | Compile / build | compiler or bundler error | Fix the source |
   | Test | deterministic assertion failure | Fix the code, or the test when the test is wrong |
   | Flaky test | passes on re-run, timing or ordering dependent | Re-run once, then report and propose a stabilisation |
   | Lint / format | style rule violation | Run the project's formatter, then fix the remainder |
   | Merge conflict / behind base | `mergeStateStatus` is `DIRTY` or `BEHIND` | Hand off to `update-pr-branch` |
   | Workflow definition | YAML, action version, or permission error | Fix the definition in place: correct the YAML, pin the action, grant the permission |
   | Secret / credential | missing secret, expired token, OIDC failure | Report to the user — do not attempt to supply credentials |
   | Infrastructure | runner outage, registry 5xx, network timeout | Re-run once, then report |
   | Security scan | new vulnerability or secret detected | Fix the vulnerability as code; a detected secret is removed and reported for rotation, never re-supplied |

4. When a failure is caused by an out-of-date base rather than by the PR's own changes, run
   `update-pr-branch` first and re-check before fixing anything.

### Phase 3 — Reproduce Locally

5. Reproduce with the exact command the failing step runs, read from its workflow file and
   narrowed to the failing unit where possible.
6. If the failure does not reproduce locally, compare the environment before concluding it is
   flaky: runner OS, SDK/runtime version, environment variables, matrix leg, and whether the
   job runs against the merge commit rather than the branch head.

### Phase 4 — Fix

7. Fix the root cause, smallest change first. For a failing test, decide explicitly whether the
   code or the test carries the wrong expectation, and state the reasoning.
8. Re-run the narrowed command until it passes, then the full local validation, so the fix does
   not trade one red check for another.

### Phase 5 — Push and Verify

9. Commit with a message naming the check that was failing, push, and watch the checks.
10. If new failures appear, return to Phase 1. Stop after the configured maximum iterations and
    report what remains, rather than looping indefinitely.
11. Re-run a job only when the failure is classified flaky or infrastructural.

### Phase 6 — Report

12. Output the result per check:

    | Check | Before | Cause | Fix | After |
    |---|---|---|---|---|
    | `build` | ❌ | Missing using after base refactor | Added import | ✅ |
    | `test` | ❌ | Rounding changed in `Money` | Updated expectation with rationale | ✅ |
    | `deploy` | ❌ | Missing `AZURE_CLIENT_ID` secret | Not fixable here | ⚠️ Needs user |

    Name every escalation — secrets, permissions, or a human decision.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.

- `start_run` with `skillId: "fix-pr-checks"` and these stages: Collect Failures, Classify,
  Reproduce Locally, Fix, Push and Verify, Report.
  Pass `sessionId: "${CLAUDE_SESSION_ID}"` — the host's session id, per the `session-id` slot.
- Each fix-and-push iteration re-enters Fix and Push and Verify; record the
  iteration count in the stage `output` rather than starting a new run.

## Related Skills

- `update-pr-branch` — when the failure is a conflict or an out-of-date base.
- `pr-merge-ready` — score one pull request against the merge-ready checklist and clear its blockers, one PR per pass.
- `phase-build-test` — the shared build-and-test procedure the `flow-*` flows run
  before a PR exists.
