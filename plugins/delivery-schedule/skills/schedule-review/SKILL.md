---
name: schedule-review
description: 'Run a full automated review cycle on the codebase or a specific scope: collects TODO items, surfaces future-improvement suggestions, and runs a structured code review. Produces a prioritised findings report and optionally opens GitHub issues for the highest-priority items.'
disable-model-invocation: true
---

# Scheduled: Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

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

## Skill Dependencies

This skill sequences the following installed skills:

- **`todo-review`** — collects and prioritises all TODO comments, open checklist items, and
  unresolved placeholders in the codebase.
- **`suggestion-review`** — performs a future-improvement scan that surfaces quick wins,
  next-iteration ideas, and longer-term opportunities ranked by value vs effort.
- **`code-review`** — runs the structured C# .NET review checklist (correctness, SOLID,
  async patterns, security, test coverage, naming) and reports findings by severity.
- **`create-github-issue`** — converts approved high-priority findings into tracked GitHub issues.

## Workflow

### Phase 1 — TODO Review

1. Use the `todo-review` skill across the configured scope to:
   - Collect all TODO comments (`// TODO`, `// FIXME`, `// HACK`, `// NOTE`).
   - Collect open checklist items in documentation files.
   - Classify each item: **High**, **Medium**, or **Low** priority.
   - Produce a normalised list of actionable findings.

### Phase 2 — Suggestion Review

2. Use the `suggestion-review` skill across the configured scope to:
   - Identify structural, quality, coverage, and extensibility improvements.
   - Estimate effort (small / medium / large) and risk (low / medium / high) per suggestion.
   - Rank suggestions by value-to-effort ratio.
   - Separate into: Quick wins, Next iteration, Longer-term.

### Phase 3 — Code Review

3. Use the `code-review` skill across the configured scope to run the full checklist:
   - Correctness (null guards, logic, return values).
   - SOLID compliance.
   - Async/await patterns (no sync-over-async, CancellationToken propagation).
   - Error handling (specific exceptions, no silent catches).
   - Security (no secrets, input validation, parameterised queries).
   - Test coverage (public APIs tested, AAA pattern, `dotnet test` passes).
   - Naming and readability.

4. Classify findings as **Blocking**, **Important**, or **Suggestion**.

### Phase 4 — Consolidated Report

5. Merge findings from all three layers into a single ranked report:

   | Priority | Layer | File | Finding | Action |
   |----------|-------|------|---------|--------|
   | 🔴 Blocking | Code Review | `Api/Handlers/Query.cs:42` | Sync-over-async `.Result` on DB call | Fix before merge |
   | 🔴 High TODO | TODO Review | `Services/Data.cs:87` | `// TODO: add retry logic` since 3 months | Create issue |
   | ⚠️ Important | Code Review | `Models/Order.cs:14` | Missing null guard on `customerId` | Fix soon |
   | ⚠️ Quick Win | Suggestions | `Services/Email.cs` | Extract magic strings to constants | Easy win |
   | 💡 Low | TODO Review | `Utils/Helpers.cs:5` | `// TODO: consider extracting helper` | Backlog |

6. De-duplicate: if the same location appears in multiple layers, merge into one finding
   with the highest severity and all contributing reasons noted.

### Phase 5 — Issue Creation (Optional)

7. Present the findings that match the configured severity filter.
8. Ask the user to confirm which findings should become GitHub issues.
9. For each approved finding, use the `create-github-issue` skill to create an issue with:
   - **Title:** `[Review] <finding summary>`
   - **Body:** finding detail, file and line, layer (TODO / Suggestion / Code Review),
     severity, and recommended action.
   - **Labels:** `review`, `automated`, and a severity label (`blocking`, `important`, or `suggestion`).

### Phase 6 — Summary

10. Output a completion summary:

    | Layer | Findings | Blocking / High | Created as Issues |
    |-------|----------|-----------------|-------------------|
    | TODO Review | 8 | 2 | 2 |
    | Suggestions | 5 | 0 | 0 |
    | Code Review | 6 | 3 | 3 |
    | **Total** | **19** | **5** | **5** |

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-review"` and these stages: TODO Review, Suggestion
  Review, Code Review, Consolidated Report, Issue Creation, Summary.

## Output

- Consolidated, prioritised findings report covering TODOs, suggestions, and code review.
- GitHub issues created for all approved high-priority findings.
- Summary table per review layer.

## Notes

- Each review layer can be run independently by invoking its skill directly; this skill
  runs all three in sequence and merges the output.
- Run this skill weekly or before each release to maintain a healthy codebase baseline.
- For non-.NET repositories, the `code-review` layer's checklist items that are .NET-specific
  (async patterns, `dotnet test`) should be adapted to the project's actual ecosystem.
