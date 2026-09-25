---
name: update
description: 'Move a repository that already has devbook forward — refresh the devbook-meta checker, its CI workflow, the folder rules with a wrapper per host, and devbook''s section of AGENTS.md, run outstanding schema migrations, create a folder adopted since or orphan one dropped, and re-stamp. One idempotent operation covering a plugin upgrade, a change in which folders are adopted, and migration-only. Refused where no components.devbook stamp exists: run devbook:init first. Use when: upgrading devbook, adding or dropping a devbook folder, or a migration is outstanding. Triggers on: "devbook update", "update devbook", "upgrade devbook", "devbook sync", "run devbook migrations", "adopt another devbook folder", "drop a devbook folder".'
user-invocable: false
---

# devbook update

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reconcile an initialized repository with the installed devbook release. Read
`assets/reconcile-protocol.md` first: it carries the stamp shape, the asset
table, and what each phase below does. None of it is repeated here.

**Refuse when `.devbook/config.json` has no `components.devbook`.** Say "not initialized,
run `devbook:init`" and stop: with no stamp there is no provenance to reconcile against, and
every file on disk would read as customized.

Run the six phases in order, every time. An upgrade, a change in adoption, and a migration
are one operation — the stamp says which.

1. **Detect.** Stamp, installed version, disk state. Disk wins on existence,
   the stamp wins on provenance. A stamped contract below the floor in
   `tools/devbook-meta/graph.mjs` stops here: upgrade through the previous
   major's last release first.
2. **Resolve.** Ask only about genuinely new choices — a folder that appeared on disk
   unstamped, or one the user asks to adopt or drop. A newly adopted folder is created per
   *Creating a folder* in `../init/SKILL.md`.
3. **Plan.** Show the diff table and write nothing. Never skip this.
4. **Migrate.** Ledger forward, oldest first, `--check` before and after each.
5. **Materialize.** Overwrite stale, report customized, never both.
6. **Stamp and verify.** Rewrite the entry, run `devbook:validate`, report.

## Notes

- The folder rules land in the repository as a trio per rule — the rule verbatim under
  `.agents/rules/`, a `paths` wrapper under `.claude/rules/`, and an `applyTo` wrapper under
  `.github/instructions/` — so both hosts apply them on a matching read. Which rules exist and
  what each one's `paths` are is `rules/rules.json`, never a hardcoded list. Shape and table:
  `assets/rule-wrappers.md`.
- Render the `AGENTS.md` section from `adopted` per `assets/agents-section.md`,
  never from what is on disk. Then create `CLAUDE.md` and `.github/copilot-instructions.md`
  from `assets/root-wrappers/` where absent, so both hosts reach that file; one that exists
  is never touched, whatever it holds.
- Write nothing to `.gitignore` and create no personal file: `AGENTS.local.md` and the
  overlay live under the user's devbook config directory, never in the clone, and an empty
  overlay reads as a setting somebody chose.
- Offer the routing sections of `assets/routing-snippet.md` only when a flow engine or
  specialist agents are installed — with neither, they name nothing. Never apply any of
  it silently, and never put routing inside the `AGENTS.md` markers.
- The committed `_meta/` index, its refresh script, its nightly and drift workflows, and
  the `Read(_meta/**)` deny rule are a layered plugin's, not this skill's. It never
  writes inside another plugin's markers.
- Report an update that ends on a failing check as failing, never as updated.
