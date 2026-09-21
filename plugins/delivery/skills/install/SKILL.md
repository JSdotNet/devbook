---
name: install
description: 'Record the delivery engine in a repository — write its pluginVersion under components.delivery in .devbook/config.json and release any file an earlier engine seeded, so the repository''s own procedure skills are its own. Materializes nothing: the engine reads the config and the repository''s skills by path. Idempotent: first install and upgrade are one run. Use when: adopting the delivery engine, upgrading it, or components.delivery still claims a seeded start or capture skill. Triggers on: "delivery install", "install delivery", "delivery-install".'
---

# delivery install

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The engine materializes nothing. Everything it reads from a repository is either
`.devbook/config.json` — the four engine-owned keys, which `devbook-config:setup` writes — or
a skill the repository owns and the engine names by name: `start` at `app.start`, `capture`
inside Validation. Neither is a dependency; a flow that finds one absent does without and
says so. So this install records the engine and releases what an earlier one wrote.

The stamp rules — the two shared fields, the hash, what customized and orphan mean — are
`assets/reconcile-protocol.md` in the devbook plugin under **The stamp**, followed exactly.
This plugin writes `components.delivery` and touches no other entry, and none of the four
engine-owned top-level keys.

## The run

1. **Detect.** Read `components.delivery`. An entry under `materialized` — an earlier engine
   seeded `.agents/skills/start.md`, `.agents/skills/capture.md`, and a wrapper per host — is
   a file this engine no longer claims.
2. **Plan.** One table — `orphan` for every such entry, nothing else — and write nothing.
   Never skip this, not even when the plan is empty.
3. **Orphan.** Drop every `materialized` entry from the stamp. Delete no file: each stays where
   it is, the repository's own, until whichever install owns procedures adopts it or the
   repository removes it. Name each path in the report.
4. **Stamp.** Rewrite `components.delivery` as `pluginVersion` alone.
5. **Report** what was released and leave the commit to the user.
