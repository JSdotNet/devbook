---
name: update
description: 'Move the delivery engine''s record in a repository forward — release any file an earlier engine seeded, so the repository''s own procedure skills are its own, and rewrite components.delivery in .devbook/config.json to the installed pluginVersion. Materializes nothing. Refused where no components.delivery stamp exists: run delivery:init. Use when: upgrading the delivery engine, or components.delivery still claims a seeded start or capture skill. Triggers on: "delivery update", "update delivery", "upgrade delivery".'
---

# delivery update

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The engine materializes nothing. Everything it reads from a repository is either
`.devbook/config.json` — the four engine-owned keys, which `devbook-config:init` writes — or
a skill the repository owns and the engine names by name: `start` at `app.start`, `capture`
inside Validation. Neither is a dependency; a flow that finds one absent does without and
says so. So `delivery:init` records the engine, and this skill keeps the record current and
releases what an earlier engine wrote.

The stamp rules — the two shared fields, the hash, what customized and orphan mean — are
`assets/reconcile-protocol.md` in the devbook plugin under **The stamp**, followed exactly.
This plugin writes `components.delivery` and touches no other entry, and none of the four
engine-owned top-level keys.

**Refuse when `components.delivery` is absent.** Say "not initialized, run `delivery:init`"
and stop.

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
