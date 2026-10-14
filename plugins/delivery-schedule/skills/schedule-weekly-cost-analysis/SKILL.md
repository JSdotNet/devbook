---
name: schedule-weekly-cost-analysis
description: 'Report what the week''s flow runs cost from the token usage the bound delivery surface recorded — by model, stage, and sub-agent, on the uncached figure — and name the changes that would save the most. Use when: what did the runs cost, token spend, cost spike.'
---

# Scheduled: Weekly Cost Analysis

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. It reads only what
the surface recorded and never estimates: no surface, or no run in the window, is a report that
says so.

## Inputs

- Window: `7` days (default) or an ISO range `YYYY-MM-DD:YYYY-MM-DD`.
- Format: `summary` (default, the top tips) or `full` (every tip and the breakdown).
- Tips: `5` (default).

## Workflow

### Phase 1 — Retrieve

1. The surface's `list_runs`, kept to runs whose `startedAt` is in the window, and `get_run`
   for each to read its `contextSummary`.
2. Aggregate: `totals.tokens` and `totals.uncachedTokens` — the uncached figure is the real
   context pressure, so rank on it — per model (`contextSummary.models`), per stage
   (`perStage`), per delegated agent (`subAgentTotals`), and the compaction and truncation
   counts that mark a run outgrowing its window.

### Phase 2 — Analyse

3. Name the drivers: the model with the largest share, the most expensive stage or agent,
   the stage whose delta pushed a run into compaction, and prompts repeated verbatim that a
   cache or a batch would absorb.
4. Turn each into a repository action, a *Needs you* row: a cheaper model in the `## Model`
   section of an agent spent on low-complexity work, the prompt of a costly skill trimmed,
   or runs restarted where a handoff would have resumed them from persisted state.

### Phase 3 — Report

5. The report in `report.md` beside this file.
