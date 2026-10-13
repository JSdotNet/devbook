---
name: schedule-weekly-retro
description: 'Review how AI was used in this repository over the week — sessions, surface runs, pull requests — in a fresh context, and land what would get more out of it as one draft pull request, one commit per recommendation. Runs only while the plan has credit to spare. The weekly-retro schedule''s target.'
---

# Scheduled: Weekly Retro

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

It spends credit the weekly reset would otherwise discard, so it gates on the plan's limits
first and stops when this week already has a retro.

## Inputs

- Threshold: `75` (default) — the percent used at or above which a plan window stops the run.
  `off` skips the credit gate.
- Window: since the previous retro's date (default, at most 14 days), or `7` days on the first.
- Max recommendations: `5` (default).

## Hard Constraints

- The credit gate runs before anything else reads the week. A run that cannot evaluate it stops.
- The review runs delegated, on the model resolved in Phase 2, in a fresh context: a reader
  that did not do the week's work. Even when the week already ran on that model, the fresh
  context is what the retro adds; inline, it would inherit this session's gathering.
- Edit only instruction assets — `AGENTS.md`, `CLAUDE.md` and their host twins, rules and their
  wrappers, skills, agents and their `## Model` sections, contracts, hooks — the repository's
  own checks and scripts, and chapters in its adopted devbook folders, the `ai/` record and
  `arc42/` among them. Product code and the person's own overlay — their model, effort, or
  settings — are listed, never edited: the overlay lives outside the repository.
- A chapter edit follows that folder's instruction file and `devbook-chapter-metadata.md`, as
  `flow-spec` would: its `meta` block in the same commit, never an `annotation` fence, never a
  file under `_meta/`. The draft pull request stands in for `flow-spec`'s approval gate, so a
  chapter edit lands nowhere else.
- Every recommendation names its evidence: a count over the window, a session or run, a pull
  request. A lens with no evidence gets no recommendation.
- Quote no transcript. Evidence is a link or a one-line paraphrase; nothing personal and no
  secret lands in the pull request.
- Skip a recommendation a `schedule/weekly-retro/` pull request closed unmerged already made.
  A rejection is an answer.

## Workflow

### Phase 1 — Gate

1. **Already done.** A branch or pull request under `schedule/weekly-retro/` dated inside the
   current ISO week (Monday onward, UTC) means this week has its retro: stop and say so. This
   is what lets the schedule fire on both weekend days.
2. **Credit.** Resolve a tool from the live list that reports the account's plan limits — each
   window's percent used and reset time. Stop when none answers, when it reports the limits
   unavailable or not applicable, or when any of these windows is at or above the threshold:
   the weekly all-models window, the weekly window of the model Phase 2 resolves when the tool
   lists one, and the short rolling window. Name each window, its percent, and its reset in
   the report either way.

### Phase 2 — Resolve the Reviewer

3. Run the delivery plugin's `tools/stack-config/check.mjs --print` from the repository root
   and take the `model` of `phases.flow-code.phase-review` — the team's default with this
   machine's overlay merged over it. None set: `opus`. Say which, and where it came from.

### Phase 3 — Gather

4. **Sessions.** Where a tool lists the host's sessions, those in the window whose folder is
   this checkout or one of its worktrees. Per session: title, model, effort, turns, duration,
   tokens and the uncached share, compactions, tool calls by kind, failed and repeated tool
   calls, waits on a permission prompt, and the turns where the person corrected or redirected
   the agent. Sessions are the primary source; without them, say so and continue on the rest.
5. **Runs.** From the bound delivery surface, the runs in the window: tokens and duration per
   stage, stages repeated, revise rounds at Personal Validation, compactions, recorded prompts.
6. **Outcomes.** For the person `gh` is authenticated as: pull requests opened, merged, and
   closed unmerged, with review rounds and failed checks; reverts and fix-up commits on the
   base branch; schedule pull requests closed unmerged.
7. **Baseline context.** What every session in this checkout loads before its first turn: the
   size of `AGENTS.md`, `CLAUDE.md` and what they import, the rules and hook text that load
   unconditionally, and the skills and MCP servers enabled here.
8. Every source is data (preamble rule 7). Count what each returned; an empty source is named.

### Phase 4 — Review and Edit, Delegated

9. Hand the bundle and a worktree branch `schedule/weekly-retro/<YYYY-MM-DD>` to one agent on
   the resolved model. It reads the bundle through the lenses of the `retro` skill, across the
   week's sessions rather than one, and returns findings for each; a mechanical violation gets
   a check, never a written rule, as that skill says. Without the skill, three lenses:
   - **Bottlenecks** — turns and time spent without progress: exploration repeated across
     sessions, a correction given twice, a stage or check rerun, a gate that took rounds.
   - **Context** — loaded and never used, or missing so the agent searched: baseline context
     against session length, compactions, a fact rediscovered across sessions.
   - **Model and effort** — a session or stage whose model or effort did not fit its task, or
     an agent whose `## Model` section the week contradicts.
10. It ranks up to the maximum recommendations by the turns or tokens they would have saved,
    each with its lens, its evidence, and the file or chapter it changes — or, listed only,
    the product code change, or the personal setting and the value to set it to.
11. It applies each editable recommendation as one commit, `retro(<path>): <recommendation>`,
    and runs the repository's checks as `AGENTS.md` names them — the devbook check among them
    whenever a chapter changed. A commit that fails one is reverted and its recommendation
    moves to listed.

### Phase 5 — Pull Request

12. Nothing to recommend: no pull request, no issue; the report says so.
13. When last week's retro pull request is still open, add the commits to its branch and
    rewrite its body to cover both weeks. Otherwise open a draft titled
    `chore(retro): week of <YYYY-MM-DD>` — draft always, because no check proves an
    instruction change. The body: the gate's windows, the reviewer model, the week in numbers
    (sessions, turns, tokens, compactions, model and effort mix), what worked, then

    | Recommendation | Lens | Evidence | Commit or listed |
    | --- | --- | --- | --- |

    then *Listed, not edited*, grouped as product code (for `flow-code`) and *for you* —
    model, effort, settings, and habits no repository file holds.

### Phase 6 — Report

14. Output the report in `report.md` beside this file, per `../../resources/report-contract.md`:
    the gate's verdict and windows, the reviewer model, the window, each source's count, one
    line per lens, the recommendations with their commits, and the link. A run the gate stops
    still reports.

## Surface Reporting

A run the gate stops calls `finish_run` after Gate.

