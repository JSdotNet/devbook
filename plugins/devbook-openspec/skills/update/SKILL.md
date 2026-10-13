---
name: update
description: 'Move a repository''s change lane forward after upgrading devbook-openspec or the OpenSpec CLI: check the CLI range, run openspec update, replace the schema and rule where unmodified, report customized ones, re-stamp. Never rewrites openspec/config.yaml. Refused where no components.openspec stamp exists: run devbook-openspec:init. Use when: "devbook-openspec update", a new OpenSpec release.'
---

# devbook-openspec update

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reconcile what `devbook-openspec:init` materialized with the installed release. What lands and
the CLI check are `../init/SKILL.md`; the stamp and hash rules are devbook's
`assets/reconcile-protocol.md` under **The stamp**. Neither is repeated here.

**Refuse when `components.openspec` is absent**: say "not initialized, run
`devbook-openspec:init`" and stop — with no stamp, every file on disk reads as customized.

1. **The CLI.** `openspec --version` against `components.openspec.cli`. Outside it, report the
   installed version and the range and stop; never install, and never widen the range yourself.
2. **Migrate.** Run each script under `../../migrations/` in number order with node, the
   repository root as the working directory: `migrate.mjs --check`, and while it exits `1`, show
   its plan, run it without `--check`, and report what moved. `001` removes the Step 0 prototype; `002` the git workflow and a step's `branch:` and `PR:` lines.
3. **Detect.** Hash every path in `components.openspec.materialized` and compare it with its
   stamped hash. Equal is stale-or-current and replaceable; different is customized.
4. **Plan.** One table — `update`, `skip-customized`, `orphan` — and write nothing. Never skip
   this, not even when the plan is empty. A path this release no longer ships is an orphan:
   reported, never deleted. `openspec/config.yaml` is always `skip`: it is the repository's.
5. **Run `openspec update .`** from the repository root, with `OPENSPEC_TELEMETRY=0` when the
   overlay's `ext["devbook-openspec"].telemetry` says so. It refreshes OpenSpec's own skills
   for the stamped `tools` and touches neither the schema nor the config.
6. **Materialize.** Overwrite only what step 3 found replaceable. Delete `openspec/specs/`
   again when it holds nothing but `.gitkeep`.
7. **Stamp.** Rewrite `components.openspec` — `pluginVersion` and `materialized`; keep `cli` and
   `tools` as they were.
8. **Verify and report** exactly as `init` does, and leave the commit to the person.
