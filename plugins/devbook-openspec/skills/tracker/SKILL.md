---
name: tracker
description: 'Keep a change''s tasks.md as its work items — read a step with the scenario pages it delivers, set its state and tick its tasks, or leave a note on it — for an engine that binds its tracker as { "provider": "devbook-openspec:tracker" }. Implements read_item, update_item, and comment over the steps of openspec/changes/<name>/tasks.md: a step''s state — open, in progress, done — read off its ticks, and the close''s off the change''s one pull request. Use when: a run reads or updates the step it is building, "which steps of this change are done", "mark step 2 done".'
---

# devbook-openspec tracker

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A work item is a part of a change: `<change>` is its proposal, `<change>#step-<N>` the
`## Step N — title` block in `openspec/changes/<change>/tasks.md`, and `<change>#close` its
acceptance and archive. The lines under a step heading are
`../../rules/devbook-openspec-change.md`'s — `delivers:`, `owner: me`, then the tasks. Three
operations; anything else — find, create, link — is not this tracker's, and the caller takes
its unbound path.

**The state is read, never decided.** A step has no branch or pull request of its own: it is
`done` when every one of its tasks is ticked in `tasks.md` on `change/<change>` or on the base
branch, locally or on the remote; `in progress` while that branch exists or a task is ticked,
with a task unticked; `open` otherwise. A step is never `in review`. Ticks are what let the
closing run accept and archive before the one pull request opens; waiting for a merge there
would wait for a pull request that only opens after the acceptance it is waiting on.

The close is read off `change/<change>`'s pull request: `done` merged, `in review` open,
`in progress` while the branch exists, `open` otherwise. Read the pull request's state through
whatever the host exposes for it — the GitHub CLI, a connector — and say so when none answers:
the state is then unknown, never `done`.

- **`read_item`** — for every item, `change` and `part` (`proposal`, `step` with its number,
  or `close`). For a step, also its title, `delivers:` and `owner`, its tasks with their
  ticks, its state, and the proposal's status. Also its `scenarios`: every scenario page
  `delivers:` names — a delta under `devbook-delta/domain/<context>/` whose page is
  `type: scenario`, whole or as `#<part>` — each with its run as `devbook:verify-change`
  reports it, `current`, `stale`, or `missing` where the page has no `run.json`. A run is
  read, never started. An item that does not exist is an error, named.
- **`update_item`** — given the tasks the run completed: tick them, on the branch the run
  works on, and edit no other line. Never untick a task a person ticked.
- **`comment`** — append `> <date>: <text>` as the step block's last line, on the branch the
  run works on.

Refuse `update_item` and `comment` on a change under `archive/`: it is history.
