---
name: init
description: 'Record the delivery engine in a repository for the first time — write its pluginVersion under components.delivery in .devbook/config.json. Materializes nothing: the engine reads the config and the repository''s skills by path. Refused where components.delivery already exists: run delivery:update. Use when: adopting the delivery engine. Triggers on: "delivery init", "init delivery", "install delivery", "adopt the delivery engine".'
user-invocable: false
---

# delivery init

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The engine materializes nothing: everything it reads from a repository is the four
engine-owned keys of `.devbook/config.json`, which `devbook-config:init` writes, or a skill
the repository owns and the engine names by name. So this records that the engine is adopted,
and nothing more.

The stamp rules are `assets/reconcile-protocol.md` in the devbook plugin under **The stamp**,
followed exactly. This plugin writes `components.delivery` and touches no other entry, and
none of the four engine-owned top-level keys.

**Refuse when `components.delivery` exists.** Say "already initialized, run
`delivery:update`" and stop.

1. **Plan.** One row — `create components.delivery` — and write nothing until it is shown.
2. **Stamp.** Write `components.delivery` as `pluginVersion` alone.
3. **Report** what was written and leave the commit to the user.
