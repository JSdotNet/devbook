---
name: init
description: "Record the delivery engine in a repository for the first time: write components.delivery in .devbook/config.json; materializes nothing. Refused where the stamp exists (delivery:update). Use when: adopting the delivery engine."
user-invocable: false
---

# delivery init

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The engine materializes nothing: everything it reads from a repository is the
engine-owned keys of `.devbook/config.json` — `bindings`, `phases`, `areas`, `policy`, `gates` —, which `devbook-config:init` writes, or a skill
the repository owns and the engine names by name. So this records that the engine is adopted,
and nothing more.

The stamp rules are `assets/reconcile-protocol.md` in the devbook plugin under **The stamp**,
followed exactly. This plugin writes `components.delivery` and touches no other entry, and
none of the engine-owned top-level keys.

**Refuse when `components.delivery` exists.** Say "already initialized, run
`delivery:update`" and stop.

1. **Plan.** One row — `create components.delivery` — and write nothing until it is shown.
2. **Stamp.** Write `components.delivery` as `pluginVersion` alone.
3. **Report** what was written and leave the commit to the user.
