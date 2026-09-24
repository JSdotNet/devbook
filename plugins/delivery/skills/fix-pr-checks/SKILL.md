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

- Never make a test pass by weakening or deleting the assertion it is failing on.
- Never skip, `[Fact(Skip=...)]`, `it.skip`, or `continue-on-error` a failing check to go green.
- Never disable a lint rule repository-wide to silence one violation.
- Never re-run a failing job more than once hoping for a different result — classify it as flaky
  and say so explicitly.
- Never push a fix that was not validated locally when local validation is possible.

## Workflow

### Phase 1 — Collect Failures

1. List every check and its conclusion:

   ```bash
   gh pr checks <number>
   ```

2. Get the failing runs with their job detail:

   ```bash
   gh pr view <number> --json statusCheckRollup
   ```

3. For each failing workflow run, read only the failing steps:

   ```bash
   gh run view <run-id> --log-failed
   ```

   For a specific job:

   ```bash
   gh run view --job <job-id> --log-failed
   ```

4. Build the failure inventory before changing anything:

   | Check | Job | Failure Type | First Error | Reproducible Locally |
   |---|---|---|---|---|
   | `build` | `build (ubuntu-latest)` | Compile | `CS0246: type or namespace 'Foo'` | Yes |
   | `test` | `test (net9.0)` | Test | `OrderTests.Total_Rounds` | Yes |
   | `lint` | `markdownlint` | Lint | `MD013 line-length` | Yes |

### Phase 2 — Classify

5. Classify each failure and route it:

   | Failure type | Signal | Route |
   | --- | --- | --- |
   | Compile / build | compiler or bundler error | Fix the source |
   | Test | deterministic assertion failure | Fix the code, or the test when the test is wrong |
   | Flaky test | passes on re-run, timing or ordering dependent | Re-run once, then report and propose a stabilisation |
   | Lint / format | style rule violation | Run the project's formatter, then fix the remainder |
   | Merge conflict / behind base | `mergeStateStatus` is `DIRTY` or `BEHIND` | Hand off to `update-pr-branch` |
   | Workflow definition | YAML, action version, or permission error | Hand off to `github-actions` |
   | Secret / credential | missing secret, expired token, OIDC failure | Report to the user — do not attempt to supply credentials |
   | Infrastructure | runner outage, registry 5xx, network timeout | Re-run once, then report |
   | Security scan | new vulnerability or secret detected | Hand off to `fix-security-issue` (plugin: `aikido`) when installed |

6. When a failure is caused by an out-of-date base rather than by the PR's own changes, run
   `update-pr-branch` first and re-check before fixing anything.

### Phase 3 — Reproduce Locally

7. Map the failing CI step to a local command by reading the workflow file:

   ```bash
   gh run view <run-id> --json workflowName
   ```

   ```bash
   ls .github/workflows/
   ```

8. Run the same command locally, narrowed to the failing unit where possible:

   ```bash
   dotnet build
   ```

   ```bash
   dotnet test --filter "FullyQualifiedName~OrderTests.Total_Rounds"
   ```

   ```bash
   npm run lint
   ```

9. If the failure does not reproduce locally, compare the environment before concluding it is
   flaky: runner OS, SDK/runtime version, environment variables, matrix leg, and whether the
   job runs against the merge commit rather than the branch head.

### Phase 4 — Fix

10. Fix the root cause, smallest change first. For a failing test, decide explicitly whether the
    code or the test carries the wrong expectation, and state the reasoning.
11. Re-run the local command until it passes.
12. Run the full local validation, not just the narrowed command, so the fix does not trade one
    red check for another.

### Phase 5 — Push and Verify

13. Commit with a message naming the check that was failing.
14. Push, then wait for the checks:

    ```bash
    git push
    ```

    ```bash
    gh pr checks <number> --watch
    ```

15. If new failures appear, return to Phase 1. Stop after the configured maximum iterations and
    report what remains, rather than looping indefinitely.
16. Re-run a job only when the failure is classified flaky or infrastructural:

    ```bash
    gh run rerun <run-id> --failed
    ```

### Phase 6 — Report

17. Output the result per check:

    | Check | Before | Cause | Fix | After |
    |---|---|---|---|---|
    | `build` | ❌ | Missing using after base refactor | Added import | ✅ |
    | `test` | ❌ | Rounding changed in `Money` | Updated expectation with rationale | ✅ |
    | `deploy` | ❌ | Missing `AZURE_CLIENT_ID` secret | Not fixable here | ⚠️ Needs user |

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "fix-pr-checks"` and these stages: Collect Failures, Classify,
  Reproduce Locally, Fix, Push and Verify, Report.
  Pass `sessionId: "${CLAUDE_SESSION_ID}"` — the host's session id, per the `session-id` slot.
- Each fix-and-push iteration re-enters Fix and Push and Verify; record the
  iteration count in the stage `output` rather than starting a new run.

## Output

- Failure inventory with the real first error per failing job.
- Root cause and fix per check, or an explicit reason it could not be fixed here.
- Final check status after the push.
- Escalations for anything requiring secrets, permissions, or a human decision.

## Related Skills

- `update-pr-branch` — when the failure is a conflict or an out-of-date base.
- `pr-merge-ready` — score one pull request against the merge-ready checklist and clear its blockers, one PR per pass.
- `phase-build-test` — the shared build-and-test procedure the `flow-*` flows run
  before a PR exists.
- `github-actions` (plugin: `github`) — when the workflow definition itself is wrong.
- `fix-security-issue` (plugin: `aikido`) — security-scan failures.

## Notes

- `gh run view --log-failed` is the fastest path to the real error; the full log is usually
  thousands of lines of setup noise.
- Matrix jobs fail per leg. Fix the leg that failed first — the others often share one cause.
- A check that requires repository secrets will always fail on a fork PR. Recognise that before
  treating it as a code defect.
- Required checks that never started (`EXPECTED` in the rollup) usually mean a path filter or a
  workflow trigger mismatch, not a code failure.
