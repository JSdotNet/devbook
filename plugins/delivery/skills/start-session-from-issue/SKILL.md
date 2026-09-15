---
name: start-session-from-issue
description: >
  Start this session's work from a single tracker work item — a GitHub issue, a Jira ticket, or
  a Markdown chapter: fetch the items matching a filter, select one, claim it, route it to the
  flow-* skill that matches its type, and run that flow here. One item per run, no extra
  sessions. Use when: picking up an issue for implementation, pulling the next item off the
  backlog, or running a scheduled backlog pickup.
---

# Start Session from a Work Item

## Purpose

Turn one tracker work item into work in progress. Fetch the open items matching a filter, select
a single item, claim it, decide which `flow-*` flow its type calls for, and run that flow **in
this session** with the item context and origin metadata baked in.

This is the generic counterpart to `schedule-bug-fix` in the `delivery-schedule` plugin: any
filter, any item type, routed to the matching flow rather than always a defect.

## Tracker

Every read and write here goes through the tracker operations — `find_item`, `read_item`,
`transition`, `comment` — resolved from `bindings["delivery.tracker"]`. See **Bindings →
Tracker** in `resources/surface-contract.md` for how an operation resolves and what each
provider maps an item to. Name the operation, never a provider's command.

With no tracker bound there is nothing to pick up: say so and stop.

## One Item Per Run

This skill starts **this** session's work from one work item. It does not prepare work for other
sessions, and it never spawns an agent to run the flow.

A `flow-*` run needs its own session: it must be able to ask about what is ambiguous, hold
the Personal Validation gate, and own its surface run. Asking the user is foreground-only
and a sub-agent has no user turn to wait for — see **Session Ownership** and **Sub-Agent
Constraints** in `resources/flow-execution-model.md`. Scoping a run to one
item is what makes that work: this session is the owner session, so the flow is
plan-first and gated for real.

To work a second item, run this skill again in another session. Each run claims a different
item, because the previous one is filtered out as in flight.

## Inputs

- Target the bound tracker addresses items in — a repository, a project, or a folder, whichever
  the binding names (default: the binding's own configured target).
- Item filter — any combination of, dropping what the bound tracker has no field for:
  - Label(s): e.g. `bug`, `feature`, `sprint-42`.
  - Milestone, sprint, or iteration: by title or number.
  - Assignee, in the bound tracker's own user identity (`@me` for yourself).
  - State: `open` (default) or `all`.
- Selection rule when the filter matches more than one item: `oldest` (default),
  `newest`, or `highest-priority` (by severity or priority label).
- Selection override: an explicit item id to work instead of the ranked pick (optional).
- Base branch to branch from (default: repository default branch).
- Plan-first: `true` (default on an interactive run — the flow proposes its plan and
  waits for approval before implementing) or `false` (the flow's own stage gating
  applies). An unattended run cannot wait for a plan approval, so it records the plan and
  continues; see step 11.

## Workflow

### Phase 1 — Fetch Matching Items

1. `find_item` with the filter, then `read_item` for each hit, so every candidate carries its
   id, title, body, labels, assignees, milestone, URL, and creation time.

2. If nothing matches, report that and stop.

### Phase 2 — Filter Out Work Already In Flight

3. Drop every candidate already being worked, so a run never picks up a second person's
   work or restarts its own:

   - Labelled `in-progress`.
   - A branch or worktree carries its item id — `git --no-pager worktree list`,
     `git branch --all`.
   - An open pull request references it.
   - Assigned to somebody other than the current user.

4. If every match is filtered out, say so and stop without claiming anything.

### Phase 3 — Select One Item

5. Apply the selection rule to the remaining candidates and take the **top one only**. When
   the selection override names an item id, take that one instead — and still apply the
   Phase 2 in-flight check to it.

6. Report the selection, the number of candidates deferred, and the runner-up, so the next
   run's pick is predictable.

7. **Confirmation depends on whether a user is there.**

   - **Interactive run:** ask the user to confirm the selected item, or name a different
     one. Do not proceed until they answer.
   - **Unattended run** (a scheduled run, no user turn available): proceed without
     confirmation. The scope is one item, the Phase 5 claim prevents a double pickup, and
     the flow still stops at Personal Validation before any pull request.

### Phase 4 — Route to an Flow

8. Decide which `flow-*` skill the item's type calls for. Read the item body and labels,
   not the labels alone — a mislabelled item routes on what it actually asks for:

   | Item is about | Flow |
   |---|---|
   | A defect, new or changed behavior, a new module or service, folder moves or layout changes — any change to the code | `flow-code`, which derives the kind |
   | Dependency or package updates | `flow-update-packages` |
   | An Aspire version upgrade | `flow-aspire-update` |
   | A devbook folder — an architecture chapter, decision or debt record, the domain model, technology graph, design guidelines, or AI adoption record | `flow-spec` |
   | Tooling, CI, scripting, documentation outside the devbook folders, housekeeping | `flow-code`, config kind |

   This mirrors the routing the plugin's `SessionStart` hook installs; a repository may ship
   its own `flow-*` skills in the host's repo-native skill folder, and those take precedence for the
   categories they cover. There is no fallback flow: every change to a repository is one of
   these, and a matching flow whose preconditions are unmet derives what is missing.

   State the routing decision and its reason before acting on it. When the item is too
   ambiguous to route, ask (interactive) or route to `flow-code` and say so (unattended).

### Phase 5 — Claim and Run

9. Claim the item before touching any code: `transition` it to the bound tracker's in-progress
   state, assign it to the current user, and mark it `in-progress` however that tracker records
   a label. Create the state or the label first where the target does not have it yet.

   If the claim fails, stop and report it. Never start work on an item that could not be
   claimed.

10. Run the routed flow in **this session** with the context below. Pass the origin as the run's
    tracker metadata to `start_run`, so Work Item Update reports its captured result and QA
    report back to this item.

    ```text
    Work item <id>: "<item title>"

    Work item origin:
    Tracker: <the provider bindings["delivery.tracker"] names>
    Target: <repository, project, or folder>
    Item Id: <id>
    Item URL: <item url>

    Item description:
    <item body>

    Labels: <labels>
    Milestone: <milestone or "none">
    Branch: <type>/<id>-<slug> from <base branch>
    ```

11. When plan-first is enabled, the flow's scope-discovery stage proposes its plan —
    files to create or modify, key design decisions, risks and assumptions — and waits for
    approval before implementing.

    On an **unattended run** there is nobody to approve, so record the plan as the stage output
    and continue into implementation rather than parking the run on a gate that cannot be
    answered. Nothing is lost by continuing: the flow still stops at Personal
    Validation, where the user reviews the recorded plan and the change it produced together,
    and no pull request is opened before that. Stop at the plan instead only when the run
    was explicitly configured to — for work where implementing on an unreviewed plan is the
    expensive mistake, such as an architecture or migration item.

12. **Never spawn an agent to run the flow**, and never pick up a second item in
    this run.

### Phase 6 — Summary

13. Output a summary:

    | Field | Value |
    |-------|-------|
    | Item worked | #42 — `Add login page` |
    | Routed to | `flow-code`, feature kind (feature behavior, labelled `feature`) |
    | Claimed | `@me`, `in-progress` |
    | Outcome | Plan recorded, implementation complete, awaiting Personal Validation |
    | Candidates deferred | 3 (next up: #37 — `Fix null pointer`) |
    | In flight, skipped | 1 |

14. State what the next run will pick up and what still needs the user.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "start-session-from-issue"` and these stages: Fetch Matching Items,
  Filter Out Work Already In Flight, Select One Item, Route to an Flow, Claim and Run,
  Summary.
- The flow in Phase 5 opens its own run, with this run's tracker metadata
  carried into its `start_run`. Reference that run id in the Claim and Run stage output
  rather than duplicating its stages here.

## Output

- Exactly one work item selected, claimed, routed, and worked up to Personal Validation.
- The routing decision and its reason, on the record.
- The remaining candidates deferred, with the next run's pick named.
- No extra sessions requested, and no agents spawned.

## Notes

- To work several items in parallel, launch several sessions yourself and run this skill
  once in each — every run claims a different item, so they do not collide. A separate
  worktree per session keeps their change sets apart. Do not try to make one run cover
  several items.
- Safe to run on a schedule: a run either starts one item or is a clean no-op. Because the
  claim happens before any code is written, an interrupted run leaves at most one item
  labelled `in-progress` with a branch to resume from.
- Remove the `in-progress` label when an item is abandoned, or later runs keep skipping it.

## Related Skills

- `schedule-bug-fix` (`delivery-schedule` plugin) — the same single-item pickup narrowed to
  `bug` items, always routed to `flow-code` as a defect, ranked by severity.
- `pr-merge-ready` — takes the pull request behind the finished work to merge-ready, one PR
  per pass.
- **Session Handoff** in `resources/flow-execution-model.md` — hand this
  session's in-flight run to a fresh session when its context fills, rather than starting the
  item over.
