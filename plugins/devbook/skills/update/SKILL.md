---
name: update
description: 'Move a repository that already has devbook forward: refresh the checker, scenario tools, folder rules, procedure skills, and its AGENTS.md section, run outstanding migrations, adopt or drop a folder or a procedure, and re-stamp. Refused where no components.devbook stamp exists: run devbook:init. Use when: "devbook update", upgrading devbook, a devbook migration is outstanding, adding or dropping a folder or procedure.'
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
   unstamped, or a folder or procedure the user asks to adopt or drop. A newly adopted folder
   is created per *Creating a folder* in `../init/SKILL.md`.
3. **Plan.** Show the diff table and write nothing. Never skip this.
4. **Migrate.** Ledger forward, oldest first, `--check` before and after each.
5. **Materialize.** Overwrite stale, report customized, never both — the procedures too,
   per `assets/procedures/skill-wrappers.md` under *What lands, and how*.
6. **Stamp and verify.** Rewrite the entry, run `devbook:validate`, report.
