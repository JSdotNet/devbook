---
name: archive
description: 'Fold an accepted change into the devbook — check both gates, merge every delta into the chapter it targets with devbook''s delta.mjs, then let openspec archive move the change folder to openspec/changes/archive/<date>-<name>/. Refuses a change that is not accepted or whose acceptance has lapsed. Use when: a change is accepted and ready to land, "archive this change", "merge the deltas", "close out the change". Never openspec archive alone: it moves the folder and merges nothing.'
---

# devbook-openspec archive

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This rewrites chapters in the devbook, so every refusal below is stated in full and none is
skipped. Run from the repository root, on a branch of its own.

1. **The gate check.** Run `../status/SKILL.md` for the change. Ask the host that answers
   `devbook.decision@1` (devbook's `resources/decision.md`) for the proposal's state with
   `devbook_get_state`, and name it. Refuse — show the status table and stop — unless its
   `acceptance` stands at the change's current fingerprint and every step is `done`. With no
   host bound, refuse: there is no acceptance to read, and nothing merges. Never accept on the
   person's behalf here: acceptance is their decision, taken in the host.
2. **Merge.** `node .devbook/_tools/devbook-meta/delta.mjs --apply <name> --accepted-hash <fingerprint> --no-move`,
   the fingerprint the host recorded the acceptance at. It refuses unless that is the change's
   fingerprint now; on a refusal, report it verbatim and stop — nothing is written. On success
   it has written each target chapter, stamping nothing, and replaced each demo a demo delta
   targets whole — a `replaced` line, where a chapter reads `merged`.
   If its output ends in a `moved` line, the repository's copy predates `--no-move` and already
   moved the folder: skip step 3 and say `devbook:update` refreshes the tool.
3. **Move.** `openspec archive <name> --yes --skip-specs`. Its warning that the proposal lacks
   `## What Changes` is written for OpenSpec's default schema and is expected. If it fails, the
   chapters are merged and the folder is still open: report both, and never re-run step 2 — a
   second merge finds its added chapters already there. Fix what the CLI reported and re-run
   step 3 alone. Then delete `openspec/specs/` if the archive recreated it empty.
4. **Check.** `node .devbook/_tools/devbook-meta/build.mjs --check`. A failure is reported as
   failing, with the chapters the merge wrote, never as archived.
5. **Report** the chapters merged, the demos replaced, the archive path, and the check, and leave the commit to the
   person — one commit holding the merged chapters and the moved folder.
