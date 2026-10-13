---
name: ask
description: 'Answer a question about this marketplace — what devbook, delivery, the surfaces, the change lane, and the unattended lane are and how they fit, installed against newest versions, what is enabled here, and how this repository wires its flows, phases, gates, and policy. Reads only. Use when: "what is devbook", how the stack works, "which version am I on", "how are my flows set up".'
---

# devbook-config ask

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Answer one question about the stack from what is actually on disk. Every question has a
state half and a concept half, and most need both: *"is my devbook current"* is a version
comparison, *"why does devbook not ship flows"* is the layer rule.

Answer nothing from memory. A version, an enablement, and a binding are all facts with a
file behind them, and that file is the answer.

## The state half

Run from this plugin's own root:

```
node scripts/report.mjs --root <repository>
```

It prints, with the path every fact came from: the catalog and where it is checked out,
each plugin's newest and installed version and whether it is enabled, this repository's
`.devbook/config.json` read out as phase maps, bindings, policy and gates, the
component stamps, which devbook folders exist, and the flows the engine on disk ships.
`--json` gives the same model unrendered.

Two lines matter more than they look. The catalog appears twice when this repository *is*
the marketplace source — a working tree and the host's clone — and a clone older than the
working tree means the published newest is behind what you are reading. And a plugin whose
row says `not installed` is not something to describe as if it were present.

## The concept half

The canon is walked, never searched. Take the catalog checkout root from the report and
start at the chapter the question names, then follow `related` and `depends-on` out of it:

| Question about | Start at |
| --- | --- |
| What a plugin is and what it ships | `plugins/<name>/README.md` |
| Layers, and why a plugin may not name another | `.devbook/arc42/08-crosscutting-concepts.md#layer` |
| Flow, phase, schedule — which is which | `.devbook/arc42/08-crosscutting-concepts.md#flow-skill` |
| Phases, surfaces, host slots, stamps, migrations | the matching section of that same chapter |
| Which plugin category a plugin falls in | `.devbook/arc42/05-building-block-view.md` |
| Why something is shaped the way it is | `.devbook/arc42/09-architecture-decisions.md` |
| Phase maps, gates, policy, the config schema | `plugins/delivery/resources/engine-contract.md` |
| The change lane: OpenSpec, a change's shape, its two gates, grill | `plugins/devbook-openspec/README.md`, then `plugins/devbook/rules/devbook-changes.md` and `.devbook/arc42/building-blocks/devbook-openspec.md` |
| What a surface is and how one is bound | `plugins/delivery/resources/surface-contract.md` |

## Answer rules

- Name the file behind every fact. An unsourced version number is a guess.
- Report configuration as declared or defaulted, never as absent-therefore-broken: an
  unset key takes the engine's documented default, and `null` is deliberately unbound.
- Say when the clone is stale rather than reporting its versions as the newest.
- Send writing elsewhere: `devbook-config:init` and `devbook-config:update` set a repository up, each
  component's own `init` and `update` materialize it. This skill only reads.
