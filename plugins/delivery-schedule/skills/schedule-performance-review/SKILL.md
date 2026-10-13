---
name: schedule-performance-review
description: 'Identify 10 performance improvements across the codebase, score each by impact and effort, then implement and open a PR for the single highest-impact, lowest-effort finding.'
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

## Checklist

Carried here because a scheduled session starts with the two delivery plugins and nothing
else. The scan looks for:

- **Allocation** — an object, closure, or array created inside a hot loop; string
  concatenation in a loop; a value type boxed on a hot path.
- **Async** — sync-over-async (`.Result`, `.Wait()`), an `async void`, a
  `CancellationToken` not passed through.
- **LINQ and collections** — a query enumerated more than once, `ToList()` inside a loop,
  `Count()` where `Any()` was meant, a lookup done by linear scan.
- **I/O and database** — an N+1 query, a read without a bound, a connection or stream opened
  per item, a file read whole where a stream would do.

Where the project runs under .NET Aspire, its structured logs name the slow requests and the
high-allocation paths first; read them before scanning.

## Workflow

### Phase 1 — Scan for Findings

0. List open pull requests on a `schedule/performance-review/` branch. One is open: its
   finding still waits on a person, so this run scans and reports and implements nothing —
   no branch, no commit, no pull request; Phases 3–5 are skipped and *Run* says why.

1. If .NET Aspire is in use, read its recent structured logs and
   surface endpoints or operations with high latency or allocation counts. Use these as
   priority hints for the scan.

2. Scan the codebase against the **Checklist** above.

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

8. Unattended, finding #1 is the candidate. Run by hand, ask the person to confirm it or
   to pick a different finding by number.

### Phase 3 — Implement the Winning Finding

9. Implement the fix test first:
   a. Write a benchmark or test that exposes the performance issue (red).
   b. Apply the fix the finding names (green).
   c. Run the whole suite with the test command the repository's build files name —
      `dotnet test`, `npm test`, `pytest`, `go test ./...` — so nothing regressed (verify).

10. Review the change before committing, against the checklist in
    `../schedule-merge-review/SKILL.md`:
    - Confirm no correctness regressions.
    - Confirm the fix matches the **Checklist** item it addresses.

11. Create the branch the preamble names, `schedule/performance-review/<YYYY-MM-DD>`, or,
    run by hand, one the person names.

12. Commit with message:

    ```
    perf: <short description of the fix>

    Finding: <one-line issue description>
    File: <file>:<line>
    Category: <category>
    Impact score: <n>/5 | Effort score: <n>/5
    ```

### Phase 4 — Decide

13. Unattended, the preamble decides: go on to Phase 5 with the pull request ready for
    review when the tests and the benchmark passed and draft otherwise. Run by hand, present
    the top-10 findings table (Phase 2), the implemented fix, and the test and benchmark
    results to the person and wait for their yes before opening it; withheld, stop here and
    record the outcome.

### Phase 5 — Pull Request

14. Push the branch and open the pull request — never on top of an earlier run's, which
    step 0 already stopped at:
    - **Title:** `perf: <short description>`
    - **Body:**
      - Full top-10 findings table from Phase 2.
      - Highlighted implemented finding with before/after code snippets.
      - Test or benchmark output confirming the improvement.
    - **Labels:** `performance`, `automated`.

### Phase 6 — Summary

15. Once the pull request is created (or the run concludes without one), output the report
    in `report.md` beside this file, per `../../resources/report-contract.md`. It carries:
    - Number of findings identified.
    - Implemented finding: file, issue, expected improvement.
    - Link to the opened PR.
    - Remaining 9 findings listed for future review cycles.

## Surface Reporting

Follow the **Reporting Contract** in `surface-contract.md` (`delivery` plugin).
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-performance-review"` and these stages: Scan for
  Findings, Present Findings, Implement the Winning Finding, Decide, Pull
  Request, Summary.

## Output

- Top-10 performance findings table.
- Branch and PR implementing the highest-impact, lowest-effort finding.
- Remaining findings preserved for future runs.

## Notes

- Only one finding is implemented per run to keep PRs focused and reviewable.
- If the top finding was already fixed in a previous run, skip it and take the next one.
- Run this skill weekly or before each release to accumulate incremental gains.
- The checklist's examples are .NET's; the scan applies each item in the ecosystem the
  repository's build files name, and the Aspire hint only where an AppHost exists.
