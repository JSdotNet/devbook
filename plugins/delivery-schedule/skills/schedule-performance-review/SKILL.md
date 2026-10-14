---
name: schedule-performance-review
description: 'Scan a codebase for performance problems, score the top ten by impact and effort, and implement only the best one as a pull request — or report only while an earlier run''s pull request is still open. Use when: a performance sweep, finding hot paths, a quick perf win.'
---

# Scheduled: Performance Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. One finding is
implemented per run, so a pull request stays reviewable.

## Inputs

- Scope: `all` (default) or a path glob.
- Dry run: `true` reports the findings and implements nothing (default `false`).

## Checklist

Each item applied in the ecosystem the repository's build files name; the examples are .NET's.

- **Allocation** — an object, closure, or array created inside a hot loop; string
  concatenation in a loop; a value type boxed on a hot path.
- **Async** — sync-over-async (`.Result`, `.Wait()`), an `async void`, a cancellation token
  not passed through.
- **Collections** — a query enumerated more than once, `ToList()` inside a loop, `Count()`
  where `Any()` was meant, a lookup done by linear scan.
- **I/O and database** — an N+1 query, a read without a bound, a connection or stream opened
  per item, a file read whole where a stream would do.

## Workflow

### Phase 1 — Scan

1. List open pull requests on a `schedule/performance-review/` branch. One is open: its
   finding still waits on a person, so this run scans and reports and implements nothing —
   no branch, no commit, no pull request; it goes from step 3 to Phase 5, and *Run* says why.
2. Where an Aspire AppHost exists, read its recent structured logs first: the slow requests
   and high-allocation paths they name are where the scan starts.
3. Scan the scope against the **Checklist**. Per finding: `<file>:<line>`, category
   (`allocation`, `async`, `collections`, `io-db`), the issue in one line, **impact** 1–5 (how
   much faster, cheaper, or more reliable), and **effort** 1–5 (5 a trivial change, 1 a large
   refactor). Rank by `impact + effort` and keep ten. Row 1 is the candidate; one a `perf:`
   commit on the base branch already fixed gives way to the next. Dry run: go to Phase 5.

### Phase 2 — Implement

4. Test first: a benchmark or test that exposes the issue (red); the fix the finding names
   (green); then the whole suite with the test command the build files name — `dotnet test`,
   `npm test`, `pytest`, `go test ./...` — so nothing regressed (verify).
5. Review the change against the checklist in `../../resources/findings-contract.md` and fix
   what it finds before committing.
6. Commit on the branch:

   ```
   perf: <short description of the fix>

   Finding: <one-line issue description>
   File: <file>:<line>
   Category: <category>
   Impact score: <n>/5 | Effort score: <n>/5
   ```

### Phase 3 — Decide

7. **Gate:** the ten findings, the fix, and the test and benchmark results.

### Phase 4 — Pull Request

8. Push and open the pull request — never on top of an earlier run's, which step 1 stopped
   at — titled `perf: <short description>`, labelled `performance` and `automated`, its body
   the ten findings, the implemented one with before and after snippets, and the test or
   benchmark output.

### Phase 5 — Summary

9. The report in `report.md` beside this file.
