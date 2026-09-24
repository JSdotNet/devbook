---
name: ask
description: 'Answer a question about this marketplace and the plugins in it — what devbook, delivery, the bridges, the surfaces, and the fan-out lane are and how they fit together, which version of a plugin is installed against the newest one published, which plugins are enabled here, and how this repository has wired its flows, roles, gates, and policy. Reads only; it never installs or reconciles anything. Use when: asking how the stack works, comparing installed against newest, checking what is enabled, or reading a repository''s flow wiring. Triggers on: "what is devbook", "explain the delivery engine", "how do the plugins fit together", "which version am I on", "is there a newer version", "which plugins are enabled", "how are my flows set up", "what does this repo bind", "which gates are on".'
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
`.devbook/config.json` read out as roles, extension points, policy and gates, the
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
| Roles, surfaces, host slots, stamps, migrations | the matching section of that same chapter |
| Which plugin category a plugin falls in | `.devbook/arc42/05-building-block-view.md` |
| Why something is shaped the way it is | `.devbook/arc42/09-architecture-decisions.md` |
| Extension points, gates, the config schema | `plugins/delivery/resources/engine-contract.md` |
| What a surface is and how one is bound | `plugins/delivery/resources/surface-contract.md` |

## Answer rules

- Name the file behind every fact. An unsourced version number is a guess.
- Report configuration as declared or defaulted, never as absent-therefore-broken: an
  unset key takes the engine's documented default, and `null` is deliberately unbound.
- Say when the clone is stale rather than reporting its versions as the newest.
- Send writing elsewhere: `devbook-config:init` and `devbook-config:update` set a repository up, each
  component's own `init` and `update` materialize it. This skill only reads.
