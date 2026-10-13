---
name: schedule-review
description: 'Run a full automated review cycle on the codebase or a specific scope: collects TODO items, surfaces future-improvement suggestions, and runs a structured code review. Produces a prioritised findings report and optionally opens GitHub issues for the highest-priority items.'
---

# Scheduled: Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Run a layered, automated review of the codebase. Each review layer adds a different
signal — open TODOs, improvement opportunities, and correctness issues — then combines them
into a single prioritised findings report. High-priority findings can be converted to GitHub
issues in one step.

## Inputs

- Scope: `all` (default) or a path glob such as `src/MyService/**`.
- Review layers: `all` (default), or a comma-separated subset: `todo`, `suggestions`, `code-review`.
- Severity filter for issue creation: `blocking` (default), `important`, or `all`.
- Create GitHub issues for high-priority findings: `true` (default) or `false`.
- Target repository for issues: `owner/repo` (defaults to current repository).

## Layers

Carried here because a scheduled session starts with the two delivery plugins and nothing
else:

- **TODO review** — every `TODO`, `FIXME`, `HACK`, and `NOTE` comment and every unchecked
  checklist item in a documentation file, found with `grep`.
- **Suggestion review** — a scan for structural, quality, coverage, and extensibility
  improvements, each with an effort and a risk.
- **Code review** — the checklist in `../schedule-merge-review/SKILL.md`.
- `gh` for the issues this skill opens.

## Workflow

### Phase 1 — TODO Review

1. Over the configured scope:
   - Collect all TODO comments (`// TODO`, `// FIXME`, `// HACK`, `// NOTE`).
   - Collect open checklist items in documentation files.
   - Classify each item: **High**, **Medium**, or **Low** priority.
   - Produce a normalised list of actionable findings.

### Phase 2 — Suggestion Review

2. Over the configured scope:
   - Identify structural, quality, coverage, and extensibility improvements.
   - Estimate effort (small / medium / large) and risk (low / medium / high) per suggestion.
   - Rank suggestions by value-to-effort ratio.
   - Separate into: Quick wins, Next iteration, Longer-term.

### Phase 3 — Code Review

3. Run the code-review checklist over the configured scope:
   - Correctness (null guards, logic, return values).
   - SOLID compliance.
   - Async/await patterns (no sync-over-async, CancellationToken propagation).
   - Error handling (specific exceptions, no silent catches).
   - Security (no secrets, input validation, parameterised queries).
   - Test coverage (public APIs tested, AAA pattern, `dotnet test` passes).
   - Naming and readability.

4. Classify findings as **Blocking**, **Important**, or **Suggestion**.

### Phase 4 — Consolidated Report

5. Merge findings from all three layers into one ranked list — the *Findings* table of
   `report.md` beside this file — priority first: `blocking`, `high`, `important`,
   `quick win`, `low`.

6. De-duplicate: if the same location appears in multiple layers, merge into one finding
   with the highest severity and all contributing reasons noted.

### Phase 5 — Issue Creation (Optional)

7. Present the findings that match the configured severity filter.
8. Unattended, every finding at or above the severity filter becomes an issue, updating an
   open one with the same title rather than opening a second. Run by hand, ask the person
   which findings should.
9. For each, `gh issue create` with:
   - **Title:** `[Review] <finding summary>`
   - **Body:** finding detail, file and line, layer (TODO / Suggestion / Code Review),
     severity, and recommended action.
   - **Labels:** `review`, `automated`, and a severity label (`blocking`, `important`, or `suggestion`).

### Phase 6 — Summary

10. Output the report in `report.md` beside this file, per `../../resources/report-contract.md`:
    the per-layer counts, then the ranked list from Phase 4 as *Findings*, each linked to the
    issue Phase 5 opened for it.

## Notes

- Each layer can be run on its own by naming it in the layers input; the default runs all
  three in sequence and merges the output.
- Run this skill weekly or before each release to maintain a healthy codebase baseline.
- For a repository that is not .NET, drop the checklist items that are .NET-specific
  (`dotnet test`) and keep the rest.
