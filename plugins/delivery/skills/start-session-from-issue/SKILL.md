---
name: start-session-from-issue
description: >
  Start this session's work from a single tracker work item — a GitHub issue, a Jira ticket, a
  Backlog entry, or a Markdown chapter: fetch the items matching a filter, select one, claim
  it, route it to the flow-* skill that matches its type, and run that flow here. Use when: picking up an issue for implementation, pulling the next
  item off the backlog, or running a scheduled backlog pickup.
---

# Start Session from a Work Item

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Turn one tracker work item into work in progress. Fetch the open items matching a filter, select
a single item, claim it, decide which `flow-*` flow its type calls for, and run that flow **in
this session** with the item context and its origins baked in.

This is the attended counterpart of the unattended issue sweep a higher layer ships: any
filter, any item type, routed to the matching flow, in this session.

## Tracker

Every read and write here goes through the tracker operations — `find_item`, `read_item`,
`transition`, `comment` — resolved from `bindings["delivery.tracker"]`. See **Bindings →
Tracker** in `resources/engine-contract.md` for how an operation resolves and what each
provider maps an item to. Name the operation, never a provider's command.

With no tracker bound there is nothing to pick up: say so and stop. A `plugin:skill` tracker
implements no `find_item`, so it has nothing to pick up either: say so and stop — its items
reach a flow through that plugin's own entry skill, which hands the flow its origins.

## One Item Per Run

This skill works one item, in this session, and never spawns an agent to run the flow. A
`flow-*` run must ask about what is ambiguous, hold the Personal Validation gate, and own its
surface run, and a sub-agent has no user turn to wait for — see **Session Ownership** and
**Sub-Agent Constraints** in `resources/flow-execution-model.md`. To work several items in
parallel, run this skill once per session, each in its own worktree: every run claims a
different item, because the previous one is filtered out as in flight.

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
   - A branch or worktree carries its item id.
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

### Phase 4 — Route to a Flow

8. Route the item to a `flow-*` skill by the session-start routing in
   `hooks/session-start-context.md`, reading the item body and labels, not the labels alone —
   a mislabelled item routes on what it actually asks for. A repo-native `flow-*` skill takes
   precedence for the changes it covers.

   State the routing decision and its reason before acting on it. When the item is too
   ambiguous to route, ask (interactive) or route to `flow-code` and say so (unattended).

### Phase 5 — Claim and Run

9. Claim the item before touching any code: `transition` it to the bound tracker's in-progress
   state, assign it to the current user, and mark it `in-progress` however that tracker records
   a label. Create the state or the label first where the target does not have it yet.

   If the claim fails, stop and report it. Never start work on an item that could not be
   claimed.

10. Run the routed flow in **this session** with the context below, and record the run's
    **`origins`** — always an array, one entry per work item the run starts from, each with a
    `kind` — in the run context with `set_run_context`, so Report Back returns the result to
    every one of them (`skills/phase-report-back/SKILL.md`).

    | Field | Value |
    |---|---|
    | `kind` | `issue` for a GitHub issue or Jira ticket, `entry` for a Backlog entry or plan item, `annotation` for a devbook review note, `change` for an OpenSpec change step |
    | `tracker` | The provider `bindings["delivery.tracker"]` names |
    | `target` | The repository, project, or folder |
    | `id`, `url` | The item's id and URL |

    The selected item is the first origin. Every work item it names as its own source — a
    Backlog plan item that references a GitHub issue, a ticket raised from an annotation — is
    an origin of its own after it, with its own `kind`. A `linked` item the change set merely
    references is not an origin; Report Back finds those itself.

    ```text
    Work item <id>: "<item title>"

    Work item origins:
    - kind: <kind>
      Tracker: <tracker>
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

12. Run the flow in this session — never through a spawned agent — and pick up no second
    item in this run.

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

- `start_run` with `skillId: "start-session-from-issue"` and these stages: Fetch Matching Items,
  Filter Out Work Already In Flight, Select One Item, Route to a Flow, Claim and Run,
  Summary.
  Pass `sessionId: "${CLAUDE_SESSION_ID}"` — the host's session id, per the `session-id` slot.
- The flow in Phase 5 opens its own run, with this run's `origins` carried into its run
  context. Reference that run id in the Claim and Run stage output
  rather than duplicating its stages here.

## Output

- Exactly one work item selected, claimed, routed, and worked up to Personal Validation.
- The routing decision and its reason, on the record.
- The remaining candidates deferred, with the next run's pick named.

## Notes

- Safe to run on a schedule: a run either starts one item or is a clean no-op. Because the
  claim happens before any code is written, an interrupted run leaves at most one item
  labelled `in-progress` with a branch to resume from.
- Remove the `in-progress` label when an item is abandoned, or later runs keep skipping it.

## Related Skills

- The unattended issue sweep a higher layer ships — the same tracker, one issue at a time,
  every pull request a draft.
- `pr-merge-ready` — takes the pull request behind the finished work to merge-ready, one PR
  per pass.
- **Session Handoff** in `resources/flow-execution-model.md` — hand this
  session's in-flight run to a fresh session when its context fills, rather than starting the
  item over.
