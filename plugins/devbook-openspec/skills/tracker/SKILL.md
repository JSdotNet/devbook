---
name: tracker
description: 'Keep a change''s tasks.md as its work items — read a step with its scenario pages, set its state and tick its tasks, or leave a note — for an engine binding its tracker as { "provider": "devbook-openspec:tracker" }. Implements read_item, update_item, and comment over openspec/changes/<name>/tasks.md. Use when: a run reads or updates the step it builds, "mark step 2 done".'
---

# devbook-openspec tracker

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A work item is a part of a change: `<change>` is its proposal, `<change>#step-<N>` the
`## Step N — title` block in `openspec/changes/<change>/tasks.md`, and `<change>#close` its
acceptance and archive. The lines under a step heading are
`../../rules/devbook-openspec-change.md`'s — `delivers:`, `owner: me`, then the tasks. Three
operations; anything else — find, create, link — is not this tracker's, and the caller takes
its unbound path.

**The state is read off the files, never decided, and never off a branch or a pull request.**
A step is `done` when every one of its tasks is ticked in `tasks.md` as the current branch
holds it, `in progress` when some are, `open` when none are. The close is `done` once the
change sits under `openspec/changes/archive/`, `open` before. Nothing here is ever
`in review`: ticks let a run accept and archive before its pull request opens.

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
