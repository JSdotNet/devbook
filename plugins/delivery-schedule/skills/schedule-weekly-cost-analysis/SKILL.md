---
name: schedule-weekly-cost-analysis
description: 'Analyse the token usage the bound delivery surface recorded for the week''s flow runs, surface the top actionable cost-reduction tips, and produce a concise report.'
---

# Scheduled: Weekly Cost Analysis

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Read the token usage the bound delivery surface recorded for each flow run
in the window, analyse the top spending patterns, and surface concrete, prioritised actions
to reduce cost without sacrificing quality.

## Inputs

- Time window: `last-7-days` (default) or a specific ISO date range `YYYY-MM-DD:YYYY-MM-DD`.
- Output format: `summary` (default — top tips only) or `full` (all tips with spend breakdown).
- Cost tip limit: top `5` tips (default, configurable).

## Tools

The bound delivery surface's `list_runs` and `get_run`, and nothing else: a scheduled
session starts with the two delivery plugins.

## Workflow

### Phase 1 — Retrieve Cost Data

1. Call `list_runs` on the bound delivery surface and keep the runs whose `startedAt`
   falls inside the configured time window. Call `get_run` for each and read its
   `contextSummary`.

2. Aggregate across those runs:
   - Total tokens (`totals.tokens`) and the uncached remainder (`totals.uncachedTokens`),
     which is the figure that reflects real context pressure rather than cache reads.
   - Breakdown by model (`contextSummary.models`, plus per-run totals).
   - Breakdown by stage (`perStage`) and by delegated work (`subAgentTotals`).
   - Compaction and truncation counts, which mark runs that outgrew their context window.

### Phase 2 — Analyse Patterns

3. Identify the top spending drivers:
   - Which model accounts for the largest share of spend?
   - Which stage or sub-agent is most expensive on the uncached figure?
   - Did any run compact, and which stage's token delta pushed it there?
   - Are there repeated identical prompts that could be cached or batched?

4. Cross-reference the findings with repository-specific context:
   - If a high-cost model is used for low-complexity tasks: suggest a cheaper model tier for
     those agent files.
   - If session count is high: check whether runs are being restarted rather than handed
     off. A handoff resumes a run from persisted state instead of reloading its whole
     context, and each issue is meant to cost one session, not several.

### Phase 3 — Produce Report

5. Output the report in `report.md` beside this file, per `../../resources/report-contract.md`:
   the summary metrics, the top-N tips with their expected saving, and each
   repository-specific action from Phase 2 as a *Needs you* row.
6. If `output-format` is `full`, add the *Breakdown* — per model, and per session or agent
   where available — and every tip, not just the top N.

### Phase 4 — Follow-Up (Optional)

7. Unattended, the repository-specific actions stand in the report for a person to take.
   Run by hand, offer to act on any of them — trimming the prompt of a skill named as
   high-cost, moving a low-complexity agent to a cheaper tier.

## Notes

- This skill reads only what the surface already recorded, so it is a no-op when no
  flow runs fall inside the window.
- Run this skill every Monday to catch cost spikes before they accumulate.
- Cost data is read-only; this skill never modifies repository files unless the user approves
  a follow-up action in Phase 4.
