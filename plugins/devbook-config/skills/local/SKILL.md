---
name: local
description: 'Record what is true of this machine only — QA depth, retry budget, each phase''s agent, model, and effort, a local MCP server or checkpoint, a personal grill skill, machine-only instructions — in the stack-config overlay or AGENTS.local.md under the devbook config directory, never the committed config. Use when: the report shows no user overlay or a leftover model-selection.md, "set up my overlay".'
---

# devbook-config local

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

`init` and `update` write what is true of the repository; this writes what is true of you on
this machine, and it is the only skill here that does. Every layer, its merge rules, and what
an overlay may not say are *The overlays* in the delivery plugin's `resources/engine-contract.md`;
a phase entry's fields are its *Phases*, and how they resolve is `resources/phase-resolution.md`.

## Steps

1. **Look first.** Run `node scripts/report.mjs --root <repository>` from this plugin's root:
   it names both overlay paths, says which exist, which keys and `ext.<plugin>` namespaces each
   carries, and whether a retired `model-selection.md` is left over. Read a present file before
   asking about anything it already answers.
2. **Convert a leftover `model-selection.md`** before asking anything. Run
   `node scripts/model-selection.mjs`: it prints the user-overlay `phases` the file's
   categories become, and every row naming no phase. Show both, and carry the phases into
   step 5 as answers already given.
3. **Ask what is true of this machine.** Every question is optional and the default is
   nothing. QA depth, inside `policy.qa.ceiling`; `review.retryBudget` and `ready.retryBudget`; then, per phase of
   each flow map the merged config carries — `--print` from step 5 shows it — the `agent`,
   `model`, and `effort` you want here, beside the team's value; `inherit` cancels a team
   default. An MCP server bound here and nowhere else, as that phase's `mcp`; a grill skill of
   your own as `bindings["openspec.grill"]`, which wins over the repository's — or `null` to
   skip grilling on this machine; a gate of your own; and whether you want an `AGENTS.local.md`.
   Offer each in the words of the contract, never invent a key.
4. **Pick the layer per answer.** User — `<config dir>/config.local.json` — by default;
   repository — `repos/<id>/` under it, which needs a committed `id` — when the answer is
   about this repository alone. Nothing goes inside the clone, gitignored or not.
5. **Write the overlay.** Merge into the file that is there: set only the keys answered and
   remove nothing. A phase map here names only the phases it changes, field by field. Start
   an absent one from the delivery plugin's `resources/config.local-template.json`, keeping
   only the keys chosen. Validate with that plugin's `tools/stack-config/check.mjs` against
   this repository's config, and fix until it exits `0`; `--print` shows the merge. The
   checker does not compare `qa.depth` with the repository's `qa.ceiling`: the ceiling caps
   the result at run time.
6. **Retire `model-selection.md`** once the overlay that replaces it validates: ask, and on a
   yes delete it. Nothing reads it any more, and a kept copy reads as a setting that applies.
7. **Create `AGENTS.local.md`** when asked, at the layer chosen in step 4, holding a heading
   and nothing else. What goes in it is yours to write.
8. **Report** each file written, left alone, or retired, by path and layer, and re-run the
   report.

An overlay never carries a key *The overlays* refuses; the checker names each one. Never write
a secret — gitignored is not private, and neither is a home directory — and never write an
overlay for someone else: on a shared account, say so and stop.
