---
name: schedule-performance-review
description: 'Identify 10 performance improvements across the codebase, score each by impact and effort, then implement and open a PR for the single highest-impact, lowest-effort finding.'
disable-model-invocation: true
---

# Scheduled: Performance Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Run a structured performance scan across the codebase to surface the top 10 improvement
opportunities. Score each finding by estimated impact and implementation effort, then
automatically implement the best candidate and open a pull request.

## Inputs

- Scope: `all` (default) or a path glob such as `src/MyService/**`.
- Language / ecosystem: auto-detected from repository content.
- Dry-run mode: `true` lists findings only, no implementation (default: `false`).

## Skill Dependencies

This skill sequences the following installed skills:

- **`code-optimization`** — drives the performance checklist scan (allocations, async, LINQ,
  I/O, database patterns) and produces scored findings.
- **`code-review`** — used alongside `code-optimization` to catch correctness risks in the
  proposed change before it is committed.
- **`delegate-to-coding`** — delegates the actual implementation of the winning finding to the
  coding agent once the finding is approved.
- **`tdd`** — wraps the implementation in a Red-Green-Refactor cycle: write a failing benchmark
  or test that exposes the issue, then fix it, then verify the test passes.
- **`aspire-logging`** — when the project runs under .NET Aspire, queries structured logs to
  identify slow requests or high-allocation paths that should be prioritised.

## Workflow

### Phase 1 — Scan for Findings

1. If .NET Aspire is in use, use the `aspire-logging` skill to pull recent structured logs and
   surface endpoints or operations with high latency or allocation counts. Use these as
   priority hints for the scan.

2. Use the `code-optimization` skill to analyse the codebase against its full performance
   checklist (allocation reduction, async efficiency, LINQ and collections, I/O and database).

3. Collect raw findings. For each finding, record:
   - File and line range.
   - Category: `allocation`, `async`, `linq`, `io-db`, `readability`.
   - One-line description of the issue.
   - Estimated fix size: `trivial` (< 5 lines), `small` (5–20 lines), `medium` (20–50 lines).

4. Score each finding on two axes (1–5):
   - **Impact**: how much faster, cheaper, or more reliable the code becomes after the fix.
   - **Effort**: inverse of implementation complexity — 5 = trivial change, 1 = large refactor.

5. Rank findings by combined score (`impact + effort`), highest first. Keep the top 10.

### Phase 2 — Present Findings

6. Display the top 10 as a scored table:

   | # | File | Issue | Category | Impact | Effort | Score |
   |---|------|-------|----------|--------|--------|-------|
   | 1 | `Api/Handlers/Query.cs:42` | `ToList()` inside loop causes N enumerations | linq | 4 | 5 | 9 |
   | 2 | `Services/Data.cs:87` | Sync-over-async `.Result` on DB call | async | 5 | 4 | 9 |
   | … | … | … | … | … | … | … |

7. Highlight the top-ranked finding (row 1) as the **implementation candidate**.
   Stop here if dry-run is `true`.

8. Ask the user to confirm:
   - Proceed with implementing finding #1, or
   - Select a different finding by number.

### Phase 3 — Implement the Winning Finding

9. Use the `tdd` skill to implement the fix in a Red-Green-Refactor cycle:
   a. Write a benchmark or test that exposes the performance issue (Red).
   b. Apply the fix identified by `code-optimization` (Green).
   c. Run `dotnet test` to verify the fix is correct and nothing regresses (Refactor / verify).

10. Use the `code-review` skill to review the change before committing:
    - Confirm no correctness regressions.
    - Confirm the fix matches the `code-optimization` checklist guidance.

11. Create a branch named `perf/<category>-<short-description>` (for example,
    `perf/linq-avoid-repeated-enumeration`).

12. Commit with message:

    ```
    perf: <short description of the fix>

    Finding: <one-line issue description>
    File: <file>:<line>
    Category: <category>
    Impact score: <n>/5 | Effort score: <n>/5
    ```

### Phase 4 — Personal Validation

13. Present the top-10 findings table (Phase 2), the implemented fix, and the
    test/benchmark results to the user and **wait for explicit approval before
    opening a pull request**. If approval is withheld, stop here and record the
    outcome — never open the PR before personal validation.

### Phase 5 — Pull Request

14. After approval, push the branch and open a PR:
    - **Title:** `perf: <short description>`
    - **Body:**
      - Full top-10 findings table from Phase 2.
      - Highlighted implemented finding with before/after code snippets.
      - Test or benchmark output confirming the improvement.
    - **Labels:** `performance`, `automated`.

### Phase 6 — Summary

15. Once the pull request is created (or the run concludes without one), output a
    completion summary:
    - Number of findings identified.
    - Implemented finding: file, issue, expected improvement.
    - Link to the opened PR.
    - Remaining 9 findings listed for future review cycles.

## Surface Reporting

Follow the **Reporting Contract** in `surface-contract.md` (`delivery` plugin).
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-performance-review"` and these stages: Scan for
  Findings, Present Findings, Implement the Winning Finding, Personal
  Validation, Pull Request, Summary.

## Output

- Top-10 performance findings table.
- Branch and PR implementing the highest-impact, lowest-effort finding.
- Remaining findings preserved for future runs.

## Notes

- Only one finding is implemented per run to keep PRs focused and reviewable.
- If the top finding was already fixed in a previous run, skip it and take the next one.
- Run this skill weekly or before each release to accumulate incremental gains.
- For non-.NET repositories, omit Aspire and dotnet steps; adapt the scan and build commands
  to the project's actual ecosystem.
