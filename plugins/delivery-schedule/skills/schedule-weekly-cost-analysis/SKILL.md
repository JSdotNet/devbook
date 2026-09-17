---
name: schedule-weekly-cost-analysis
description: 'Analyse the token usage the delivery-surface-dashboard recorded for the week''s flow runs, surface the top actionable cost-reduction tips, and produce a concise report.'
disable-model-invocation: true
---

# Scheduled: Weekly Cost Analysis

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Read the token usage the bound delivery surface recorded for each flow run
in the window, analyse the top spending patterns, and surface concrete, prioritised actions
to reduce cost without sacrificing quality.

## Inputs

- Time window: `last-7-days` (default) or a specific ISO date range `YYYY-MM-DD:YYYY-MM-DD`.
- Output format: `summary` (default — top tips only) or `full` (all tips with spend breakdown).
- Cost tip limit: top `5` tips (default, configurable).

## Skill Dependencies

This skill has no hard skill dependencies, but pairs well with:

- **`suggestion-review`** — can be invoked on high-cost skill or agent files to propose
  prompt-trimming opportunities that reduce token consumption.

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

5. Output the Weekly Cost Analysis report:

   ```
   ## Weekly Cost Analysis — <date range>

   ### Summary

   | Metric | Value |
   |--------|-------|
   | Total tokens | <n> |
   | Estimated cost | $<n> |
   | Most expensive model | <model> (<pct>% of spend) |
   | Most expensive agent type | <agent> (<pct>% of spend) |

   ### Top Cost-Reduction Tips

   1. **<Tip title>** — <description and expected saving>.
   2. **<Tip title>** — <description and expected saving>.
   …

   ### Repository-Specific Actions

   - [ ] <actionable recommendation derived from cross-reference in Phase 2>
   - [ ] <actionable recommendation>
   ```

6. If `output-format` is `full`, append:
   - Per-model token and cost breakdown table.
   - All tips returned by Chronicle (not just the top-N).
   - Session-level or agent-level breakdown table if available.

### Phase 4 — Follow-Up (Optional)

7. Ask the user whether to act on any of the repository-specific actions:
   - If prompt trimming is recommended for a specific skill: offer to invoke `suggestion-review`
     on that file.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-weekly-cost-analysis"` and these stages: Retrieve Cost
  Data, Analyse Patterns, Produce Report, Follow-Up.

## Output

- Structured weekly cost report with summary metrics and prioritised tips.
- Repository-specific action items with optional one-click follow-up.

## Notes

- This skill reads only what the surface already recorded, so it is a no-op when no
  flow runs fall inside the window.
- Run this skill every Monday to catch cost spikes before they accumulate.
- Cost data is read-only; this skill never modifies repository files unless the user approves
  a follow-up action in Phase 4.
