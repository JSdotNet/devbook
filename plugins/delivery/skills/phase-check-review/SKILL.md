---
name: phase-check-review
description: "Check & Review phase of flow-spec: checks touched chapters' meta blocks and broken references, runs the devbook check, lists status changes. flow-runner only."
---

# Phase: Check & Review

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**
- Checks meta blocks and references after renames, runs the devbook check
- Lists every status change for the gate

**Doesn't**
- Regenerate _meta/
- Edit code

`flow-spec`, inline, after `phase-drafting`. It records what the ready check reads; a failure
here is an open item for the ready check, which sends it back to drafting.

1. **Meta blocks.** Every chapter the run touched carries the `meta` block its instruction file
   requires.
2. **References.** For each heading or file the draft renamed or moved, search the adopted
   folders and the repository for the old address, and update every reference to it.
3. **Run the check** the repository's `AGENTS.md` devbook section names, read-only — usually
   `node .devbook/_tools/devbook-meta/build.mjs --check`. Fix what it reports in the source
   Markdown. Never run `--write`, and never touch `_meta/`: the refresh is the repository's own
   path.
4. **Status changes.** List every chapter whose status moved, from what to what, for the gate.

## Output

The check's result, the references updated, and the status-change list. Report as the
`Check & Review` stage — `done` when the check passes, `blocked` with the failing lines when it
does not — per **Reporting Contract** in `resources/surface-contract.md`. Its place in the
order: `resources/flow-phases.md`.
