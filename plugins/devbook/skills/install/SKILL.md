---
name: install
description: 'Reconcile a repository with devbook — adopt the .arc42/.domain/.tech/.design/.ai devbook folders, install or refresh the devbook-meta generator and its CI checks, write devbook''s section of AGENTS.md, run outstanding schema migrations, and write the stamp. One idempotent operation covering first install, plugin upgrade, a change in which folders are adopted, and migration-only. Use when: adopting devbook, upgrading it, adding or dropping a devbook folder, or a migration is outstanding. Triggers on: "devbook install", "install devbook", "devbook sync", "set up devbook", "adopt the devbook folders", "scaffold .arc42", "scaffold .domain", "set up .tech", "set up .design", "track AI adoption", "upgrade devbook", "run devbook migrations", "devbook-install".'
---

# devbook install

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reconcile this repository with the installed devbook release. Read
`assets/reconcile-protocol.md` first: it carries the stamp shape, the asset
table, and what each phase below does. None of it is repeated here.

Run the six phases in order, every time. A first install, an upgrade, a change
in adoption, and a migration are one operation — the stamp says which.

1. **Detect.** Stamp, installed version, disk state. Disk wins on existence,
   the stamp wins on provenance.
2. **Resolve.** Ask only about genuinely new choices. Ask adoption as one
   question naming all five folders; `.ai`'s stage set is a follow-up, asked
   only when `.ai` was adopted. Adopt only folders the repository will actually
   maintain — an empty devbook folder is worse than an absent one, and partial
   adoption is the normal case.
3. **Plan.** Show the diff table and write nothing. Never skip this.
4. **Migrate.** Ledger forward, oldest first, `--check` before and after each.
5. **Materialize.** Overwrite stale, report customized, never both.
6. **Stamp and verify.** Rewrite the entry, run `devbook-check`, report.

## Creating a folder

Each adopted folder gets its directory and one starting chapter with a valid
`meta` block, written to the shape its rule states: `devbook-arc42.md`,
`devbook-domain.md`, `devbook-tech.md`, `devbook-design.md`, `devbook-ai.md`.
Required block fields are in `devbook-chapter-metadata.md`.

`.ai` needs its stage set chosen before anything is written: ask which positions
this repository's development flow actually has, create one numbered file per
stage, and register them in `adoption-map.md`. Do not impose a default flow.
Then confirm git tracks it — `git check-ignore -v .ai/adoption-map.md`. A repo
holding Adobe Illustrator files often carries a `*.ai` rule, which matches the
folder itself and silently ignores the whole area; add a `!.ai/` negation.

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
- The `.gitignore` block follows the same marker rules and covers `AGENTS.local.md`
  and `.devbook/config.local.json`. Ignore both; create neither. An empty overlay
  reads as a setting somebody chose.
- Always offer the `.claude/settings.json` deny rule from `assets/routing-snippet.md`:
  nothing else enforces the `_meta/` rule mechanically. Offer its routing sections only
  when a flow engine or specialist agents are installed — with neither, they name nothing.
  Never apply any of it silently, and never put routing inside the `AGENTS.md` markers.
- Without GitHub Actions, install `build/Update-DevbookIndex.ps1` alone and
  say plainly that index refresh is now manual.
- Report a reconcile that ends on a failing check as failing, never as installed.
