---
name: update
description: "Move the delivery engine's record in a repository forward: run outstanding config migrations into the phase maps, release files an earlier engine seeded, and re-stamp components.delivery. Refused without a stamp (delivery:init). Use when: upgrading the delivery engine, or the stack config still carries extensions or delivery.roles."
user-invocable: false
---

# delivery update

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The engine materializes nothing. Everything it reads from a repository is either
`.devbook/config.json` — the engine-owned keys, which `devbook-config:init` writes — or
a skill the repository owns and the engine names by name: `run` behind `phase-verify`, `capture`
inside it. Neither is a dependency; a flow that finds one absent does without and
says so. So `delivery:init` records the engine, and this skill keeps the record current and
releases what an earlier engine wrote.

The stamp rules — the two shared fields, the hash, what customized and orphan mean — are
`assets/reconcile-protocol.md` in the devbook plugin under **The stamp**, followed exactly.
This plugin writes `components.delivery` and no other entry; it rewrites the engine-owned
keys only through a migration, which is the rename exception in that same protocol.

**Refuse when `components.delivery` is absent.** Say "not initialized, run `delivery:init`"
and stop.

## The run

1. **Migrate.** Run each script under `../../migrations/` in number order with node, the
   repository root as the working directory: `migrate.mjs --check`, and while it exits `1`,
   show its plan and every note under it, run it without `--check`, then show `git diff` of
   `.devbook/config.json` and name each overlay it rewrote. Pass `--plugin <name>=<path>` for
   a plugin a note says is not installed here when the person can point at it. `001` rewrites
   `extensions`, `delivery.roles`, `delivery.mcp`, a gate on an extension point, and a map
   under a retired flow into the two complete phase maps; its notes are what a person still
   decides. Then run `../../tools/stack-config/check.mjs` and fix until it exits `0`.
2. **Detect.** Read `components.delivery`. An entry under `materialized` — an earlier engine
   seeded `.agents/skills/start.md`, `.agents/skills/capture.md`, and a wrapper per host — is
   a file this engine no longer claims.
3. **Plan.** One table — `orphan` for every such entry, nothing else — and write nothing.
   Never skip this, not even when the plan is empty.
4. **Orphan.** Drop every `materialized` entry from the stamp. Delete no file: each stays where
   it is, the repository's own, until whichever install owns procedures adopts it or the
   repository removes it. Name each path in the report.
5. **Stamp.** Rewrite `components.delivery` as `pluginVersion` alone.
6. **Report** what was migrated and released, the migration's notes first, and leave the commit to the user.
