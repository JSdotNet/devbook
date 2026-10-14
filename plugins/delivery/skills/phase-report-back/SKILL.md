---
name: phase-report-back
description: "Report Back phase of every flow-*: sends the run's result to every origin, linked item, and custom target, blocking when one fails. flow-runner only."
---

# Phase: Report Back

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Sends the result to every target: origins, linked items, custom skills
- Ticks the tasks this run completed

**Doesn't**

- Rewrite an item's body or create an item
- Swallow a failed post: it blocks

Returns the result to wherever the run answers to. Its place in the order is in
`resources/flow-phases.md`; who runs it, per `resources/phase-resolution.md`.

## Inputs

- **`origins`**: every work item the run started from, each `{ kind, tracker, target, id,
  url }`, as the pickup skill recorded it in the run context — read it back with `get_run`.
  An ad-hoc chat request has none.
- **`targets`**: `phases.<flow>.phase-report-back.targets` in the effective configuration, an
  array, default `[ "origin" ]`.
- **The payload**: the outcome, the pull request link, the Personal Validation decision, the
  recorded QA report — or the reason Verify was skipped or did not apply — and the spec-check
  table, or the reason it was skipped. **Never invent a result.**

## Targets

| Target | Means |
| --- | --- |
| `origin` | Every origin the run recorded, each handled by its kind below |
| `linked` | Work items the change set links but the run did not start from — a `Closes #123` in a commit or the PR body, a Backlog entry id. Each gets a comment, never a status move |
| `plugin:skill`, `repo:<skill>` | A custom destination — a team channel post, a release-notes draft — invoked with the payload |

| Origin kind | Started from | Report Back does |
| --- | --- | --- |
| `issue` | A GitHub issue or a Jira ticket, including one that asked for a `flow-spec` run | Comments with the payload and moves the status |
| `entry` | A Backlog entry or plan item | Comments on the entry and ticks the steps this run completed |
| `annotation` | A devbook review note on a chapter | Resolves the annotation with the outcome and links the PR |
| `change` | An OpenSpec change step | Ticks the step's tasks and sets the step state from its branch and pull request |
| none | An ad-hoc chat request | Nothing for `origin`; `linked` and custom targets still run |

No `schedule` kind exists: an unattended run parks at Personal Validation and never reaches
this phase, and the schedule publishes its own brief.

A `flow-spec` comment names the chapters changed and every status change, such as a decision
record moving to `accepted`.

## Steps

1. **Resolve the target list.** Expand `origin` into the recorded origins and `linked` into
   the items the commits and the PR body reference. An item that is both an origin and linked
   is reported once, as its origin.
2. **Attempt every target, in order.** One that fails does not stop the rest; record its error
   and move on.
   - **Reach an item through the bound tracker's tooling first**, then the host's CLI for that
     tracker. `bindings["delivery.tracker"]` says which tooling reaches an issue or an entry,
     per **Bindings → Tracker** in `resources/engine-contract.md`.
   - **Add a new comment; never rewrite an item's body or create an item.** Ticking a task
     through the provider's own operation — `update_item` for a `plugin:skill` tracker — is
     the one other edit. A provider with no task list skips the tick and says so.
   - **A custom destination** is invoked with the payload and reports back whether it posted.
     One that does not resolve is a failed target, not a skipped one.
3. **Decide the stage.**
   - Every target reached: `done`, with each target and what it received.
   - **Any target failed: `blocked`**, with each failure's error and the list of targets that
     succeeded, so a retry reaches only the rest. Never `done`, and never continue silently.

## Skip

`skipped`, with the reason, when no target is left — no origin, nothing linked, no custom
destination — or when **`policy.phases.reportBack: false`** turns it off. The summary is
then the report.

## Dashboard Reporting

Report as the `Report Back` stage via the **Reporting Contract** in
`resources/surface-contract.md`, listing each target and its result in the output. A sub-agent
never calls surface tools itself.
