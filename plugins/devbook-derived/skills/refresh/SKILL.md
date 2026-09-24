---
name: refresh
description: 'Rewrite the committed derived devbook indexes — .devbook/_meta/ and one _meta/ per adopted folder — from the chapters as they are on this branch, and say which files moved. The one session-time way to write a derived file, and only when a person asks for this branch to be current: never inside a flow, never beside a chapter edit. Use when: something is about to read the indexes from this branch — a release, a local viewer — or after a large chapter change on the default branch. Triggers on: "refresh the devbook index", "regenerate _meta", "update the graph", "rebuild the indexes", "devbook-derived refresh".'
---

# devbook-derived refresh

Open the reply with `devbook-derived@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Run devbook's checker with the one flag nothing in devbook passes, and report what moved.
`.devbook/arc42/adr/checks-and-indexes.md` is the rule this skill is the
deliberate exception to: refresh is the scheduled job's, and a session does it only when a
person asks for this branch to be current, because two branches that each regenerate beside
a chapter edit rewrite the same JSON and conflict on merge.

## Steps

1. **Refuse the wrong moment.** Stop, and say why, when this run is inside a flow, when the
   working tree already holds an uncommitted chapter edit that is not this branch's own
   work, or when nobody asked for the index — a chapter edit that "also" refreshes is the
   conflict the checks-and-indexes decision record exists to prevent.

2. **Refresh.** From the repository root:

   ```
   ./build/Update-DevbookIndex.ps1                # every adopted scope
   ./build/Update-DevbookIndex.ps1 -Scope tech    # one folder
   ```

   Without `pwsh`: `node .devbook/_tools/devbook-meta/build.mjs --write [--scope <folder>]`.
   Either way the output is deterministic — no timestamps — so "nothing moved" means the
   committed indexes were already current. A missing checker means devbook is not
   materialized: say so, name `devbook:update` — or `devbook:init` where devbook has no
   stamp yet — and stop.

3. **Fix what the check reports** in the source Markdown, never under `_meta/`, and refresh
   again. A broken reference is devbook's finding; `devbook:validate` has the repair table.

4. **Report** which index files moved, and leave the commit to the user. Commit the
   refresh on its own, never folded into a chapter change.

## Do not

- Do not hand-edit anything under `_meta/`, and do not commit a refresh from a flow.
- Do not refresh to make the CI drift warning go away on a pull request that only edits
  chapters; that warning is advisory, and the nightly job reconciles the default branch.
