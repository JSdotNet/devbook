---
name: refresh
description: 'Rewrite the committed derived devbook indexes (.devbook/_meta/ and each folder''s _meta/) and the C4 view renders under .devbook/arc42/_meta/c4/ from this branch''s chapters and workspace, and say which files moved. Only when a person asks for this branch to be current — never inside a flow or beside a chapter edit. Use when: a release or a local viewer is about to read the indexes, "refresh the devbook index", "regenerate _meta".'
---

# devbook-derived refresh

Open the reply with `devbook-derived@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Run devbook's checker with the one flag nothing in devbook passes, then the view renderer, and report what moved.
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

   Without `pwsh`: `node .devbook/_tools/devbook-meta/build.mjs --write [--scope <folder>]`, then,
   for all scopes or `arc42`, the renderer as `.devbook/_tools/c4-render/README.md` gives it.
   Either way the output is deterministic — no timestamps — so "nothing moved" means the
   committed indexes were already current. A missing checker means devbook is not
   materialized: say so, name `devbook:update` — or `devbook:init` where devbook has no
   stamp yet — and stop.

3. **Fix what the check reports** in the source Markdown, never under `_meta/`, and refresh
   again. A broken reference is devbook's finding, repaired per the `repairs.md` beside `devbook:validate`'s skill.

4. **Report** which index and render files moved, and leave the commit to the user. Commit the
   refresh on its own, never folded into a chapter change.

## Do not

- Do not hand-edit anything under `_meta/`, and do not commit a refresh from a flow.
- Do not refresh to make the CI drift warning go away on a pull request that only edits
  chapters; that warning is advisory, and the nightly job reconciles the default branch.
