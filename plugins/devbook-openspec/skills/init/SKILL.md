---
name: init
description: 'Bring the change lane into a repository for the first time — check the OpenSpec CLI against the supported range, run openspec init at the repository root, write the managed devbook schema and a seeded openspec/config.yaml, remove the specs/ folder the CLI scaffolds, install the change-folder rule with a wrapper per host, and stamp components.openspec in .devbook/config.json. Never installs the CLI. Refused where components.openspec already exists: run devbook-openspec:update. Use when: adopting OpenSpec over a devbook, setting up the change lane. Triggers on: "devbook-openspec init", "install devbook-openspec", "set up OpenSpec here", "adopt the change lane".'
---

# devbook-openspec init

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This file exceeds the 40-line body budget on purpose: it is the asset table, the refusals, and the run, and an install stated by half installs half.

Read devbook's `assets/reconcile-protocol.md` first for **The stamp**'s two shared fields and
its hash rules, and devbook's `assets/rule-wrappers.md` for the rule trio. This skill writes
`components.openspec` and touches no other entry.

**Refuse**, saying which and naming the fix, when: `components.openspec` exists (run
`devbook-openspec:update`); `components.devbook` is absent (run `devbook:init`);
`components.devbook.adopted` lacks `changes` or `contractVersion` is below 24 (run
`devbook:update` — the change folder and its gates are devbook's); or `openspec/config.yaml`
already exists (a setup this skill did not write — moving it to the `devbook` schema is a
person's call). `openspec/changes/` alone is devbook's change folder, and `openspec init` keeps it.

**The CLI.** Run `openspec --version` against `>=1.13.2 <2.0.0`, or a narrower range the person
gives. Absent or outside it, print `npm install -g @fission-ai/openspec@latest` and stop: never
install it. Every CLI call runs from the repository root.

**Ask**, before writing anything: which hosts OpenSpec installs its skills for — its `--tools`
list, `claude,github-copilot` by default. That is the repository's and goes in the stamp. Whether to send OpenSpec's anonymous
usage statistics is this machine's alone: read `ext["devbook-openspec"].telemetry` from the
stack-config overlay's user layer, ask only when it is absent, and write the answer there, never
to the repository. Run every CLI call with `OPENSPEC_TELEMETRY=0` when the answer is no.

## What lands

| From this plugin | Into the repository | Stamped |
|---|---|---|
| — | `openspec/` from `openspec init . --tools <list> --no-animation` | no |
| `assets/schemas/devbook/` | `openspec/schemas/devbook/` | folder hash, `managed: true` |
| `assets/config.yaml` | `openspec/config.yaml`, replacing the CLI's | file hash, `managed: false` — seeded once, the repository's after |
| `rules/devbook-openspec-change.md` and its `paths` | the trio | per file, `managed: true` |

Then delete `openspec/specs/` when it holds nothing but `.gitkeep`: OpenSpec's spec folder is
not where this repository's behaviour lives, and `archive` recreates it empty, which git ignores.

## The run

1. **Plan.** One table of the paths above, `create` or `skip-customized`, and write nothing.
2. **Materialize** in the table's order, then delete `openspec/specs/`.
3. **Stamp** `components.openspec`: `pluginVersion`, `cli` (the range checked), `tools`,
   and `materialized`, each entry with `from`, `hash`, and `managed`.
4. **Verify.** `openspec schema validate devbook`, `openspec schema which devbook` answering
   `Source: project`, and `node .devbook/_tools/devbook-meta/build.mjs --check`. A failing check
   is reported as failing, never as initialized.
5. **Report** what landed and what the engine binds — `devbook-openspec:spec` as the `skill` of
   `phases.flow-code.phase-scope`, the replan chore
   `{ "run": "devbook-openspec:status --replan", "on-failure": "required" }` in its `after`, and
   `bindings["delivery.tracker"]` as `{ "provider": "devbook-openspec:tracker" }` — which are the engine's keys to write, not this skill's. Offer `devbook-openspec:onboard`, and leave the
   commit to the person.
