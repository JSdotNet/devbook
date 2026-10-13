---
name: schedule-review
description: 'Review a codebase or path in three layers — open TODOs, improvement suggestions, the code review checklist — rank every finding in one table, and open one issue per finding at or above a severity. Use when: a review sweep, a health check before a release.'
---

# Scheduled: Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. Severity, the key,
the ranked table, and the issue are `../../resources/findings-contract.md`'s.

## Inputs

- Scope: `all` (default) or a path glob.
- Layers: `all` (default), or any of `todo`, `suggestions`, `code-review`.
- Issue threshold: `blocking` (default), `high`, `all`, or `none` to open no issue.
- Repository for issues: `owner/repo` (default: the current one).

## Workflow

### Phase 1 — TODO Review

1. With `grep` over the scope: every `TODO`, `FIXME`, `HACK`, and `NOTE` comment, and every
   unchecked checklist item in a documentation file. Kind `todo`; severity by what the comment
   says is at stake.

### Phase 2 — Suggestion Review

2. Structural, quality, coverage, and extensibility improvements, each with an effort
   (`small`, `medium`, `large`) and a risk. A small, low-risk one is `medium`; the rest `low`.

### Phase 3 — Code Review

3. The contract's review checklist over the scope.

### Phase 4 — Rank

4. Merge the layers into the contract's ranked table.

### Phase 5 — Issues

5. **Gate:** the findings at or above the threshold; by hand, the yes may name a subset. Open
   or update each per the contract, prefix `Review`, label `review`.

### Phase 6 — Summary

6. The report in `report.md` beside this file: the per-layer counts, then the ranked table.
