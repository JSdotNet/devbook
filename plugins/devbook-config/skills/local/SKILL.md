---
name: local
description: 'Say what is true of this machine and nobody else''s — QA depth inside the repository''s ceiling, the retry budget, a role or MCP binding that exists only here, an extra checkpoint of your own, the environment and model your scheduled routines run with, the model each flow category uses, and machine-only instructions — and write it where the stack reads it: the user layer of the stack-config overlay by default, the repository layer when an answer is about one repository, the model-selection file, and AGENTS.local.md — all under your devbook config directory, none inside the clone. Never the committed config. Use when: a first run would otherwise take the team''s defaults without saying so, the report says no user overlay exists, or a personal setting should stop being re-asked. Triggers on: "devbook-config local", "set up my overlay", "what is true of my machine", "remember my QA depth", "stop asking for the environment", "set my model preferences", "create AGENTS.local.md".'
---

# devbook-config local

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

`setup` and `update` write what is true of the repository; this writes what is true of you on
this machine, and it is the only skill here that does. Every layer, its merge rules, and what
an overlay may not say are *The overlays* in the delivery plugin's `resources/surface-contract.md`;
the model-selection file is *Personal Global Override File* in `resources/flow-model-selection.md`.

## Steps

1. **Look first.** Run `node scripts/report.mjs --root <repository>` from this plugin's root:
   it names both overlay paths and the model-selection path, says which exist, and
   which keys and `ext.<plugin>` namespaces each carries. Read a present file before asking
   about anything it already answers.
2. **Ask what is true of this machine.** Every question is optional and the default is
   nothing. QA depth, inside `policy.qa.ceiling`; `validate.retryBudget`; a role or MCP
   server bound here and nowhere else; a gate of your own; `ext.schedule` — the environment
   and model a routine runs with; a model per flow category; and whether you want an
   `AGENTS.local.md`. Offer each in the words of the contract, never invent a key.
3. **Pick the layer per answer.** User — `<config dir>/config.local.json` — by default;
   repository — `repos/<id>/` under it, which needs a committed `id` — when the answer is
   about this repository alone. Nothing goes inside the clone, gitignored or not.
4. **Write the overlay.** Merge into the file that is there: set only the keys answered and
   remove nothing. Start an absent one from the delivery plugin's `resources/config.local-template.json`,
   keeping only the keys chosen. Validate with that plugin's `tools/stack-config/check.mjs`
   against this repository's config, and fix until it exits `0`.
5. **Write the model-selection file** when a category was answered: the `Category` / `Model`
   table at the path the report names, listing only the categories chosen.
6. **Create `AGENTS.local.md`** when asked, at the layer chosen in step 3, holding a heading
   and nothing else. What goes in it is yours to write.
7. **Report** each file written or left alone, by path and layer, and re-run the report.

## Do not

- Never touch `.devbook/config.json`. Nothing here is true of the repository.
- Never write `id`, `components`, `policy.pr.required`, `policy.qa.ceiling`, or
  `policy.gate.personalValidation` in an overlay; the checker refuses each by name.
- Never write a secret. Gitignored is not private, and neither is a home directory.
- Never write an overlay for someone else: on a shared account, say so and stop.
