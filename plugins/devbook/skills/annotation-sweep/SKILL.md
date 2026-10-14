---
name: annotation-sweep
description: 'Delete every resolved annotation fence in a devbook chapter and nothing else, so a branch merges without answered notes. Use when: clearing resolved notes before a pull request, tidying a chapter after a review, or a chapter still holds answered comments ("sweep the annotations").'
---

# annotation sweep

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Close the loops a branch answered. The lifecycle this enforces, and why a resolved note goes,
is `rules/devbook-annotations.md` under *Resolving a note means deleting it*.

1. **Resolve the scope.** One chapter address, `<path>#<slug>`; a path with no slug sweeps
   every chapter in that file. Never sweep a folder: a person has to be able to look at what
   is about to go.
2. **List what would go**, and show each note's author, date, kind, body, and the reply that
   answered it. Report an empty list and stop — nothing to sweep is the ordinary case.

   ```
   node .devbook/_tools/devbook-meta/annotations.mjs list --chapter <path#slug> --status resolved
   ```

3. **Sweep**, once the user has seen the list. It deletes every `status: resolved` fence and
   no open one; it is the only writer, never a hand edit. When
   `.devbook/_tools/devbook-meta/` is absent, run `devbook:update`, or `devbook:init` where
   devbook has no stamp yet.

   ```
   node .devbook/_tools/devbook-meta/annotations.mjs sweep --chapter <path#slug>
   ```

4. **Report** what went and what is left, and handle the changed file per the rule's *Writing
   one*.

Never resolve a note here: answering is `reply` plus `resolve`, by whoever answered, and a
sweep that resolved its own targets would delete the questions nobody got to. A swept aside
worth keeping becomes prose only through a deliberate edit in its own change.
