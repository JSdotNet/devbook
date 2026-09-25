---
name: init
description: 'Bring devbook into a repository for the first time — adopt the .devbook/arc42/.domain/.tech/.design/.ai devbook folders, scaffold one starting chapter per adopted folder, install the devbook-meta checker and its CI workflow, install its folder rules with a wrapper per host, write devbook''s section of AGENTS.md, and write the stamp. Refused where components.devbook already exists: that repository is initialized, and devbook:update moves it forward. Use when: adopting devbook in a repository that has never had it. Triggers on: "devbook init", "init devbook", "install devbook", "set up devbook", "adopt the devbook folders", "scaffold arc42/", "scaffold domain/", "set up tech/", "set up design/", "track AI adoption".'
user-invocable: false
---

# devbook init

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Scaffold devbook into a repository that has never had it, and stamp it. Read
`assets/reconcile-protocol.md` first: it carries the stamp shape, the asset table, and what
each phase below does. None of it is repeated here.

**Refuse when `components.devbook` exists in `.devbook/config.json`.** Say "already
initialized, run `devbook:update`" and stop — the stamp is what an update reads, and a second
init would ask again what the stamp already answers.

1. **Detect.** Installed version and disk state. A devbook folder already on disk with no
   stamp is adopted as found, never recreated.
2. **Resolve.** Ask adoption as one question naming all five folders; `ai/`'s stage set is a
   follow-up, asked only when `ai/` was adopted. Adopt only folders the repository will
   actually maintain — an empty devbook folder is worse than an absent one, and partial
   adoption is the normal case.
3. **Plan.** Show the diff table and write nothing. Never skip this.
4. **Materialize.** Create each adopted folder per *Creating a folder* below, then copy the
   asset table.
5. **Stamp and verify.** Run every shipped migration's `--check`, oldest first; a folder
   already on disk may still hold an old shape, and one that exits `1` is applied and
   re-checked exactly as in the reconcile's phase 4. Write the entry at the plugin's
   `contractVersion` with each migration in the ledger, `applied` or `not-applicable` per
   its `appliesTo`. Run `devbook:validate` and report.

## Creating a folder

Each adopted folder gets its directory under `.devbook/` — `.devbook/domain/`, never a
root-level `.domain/` — and one starting chapter with a valid `meta` block, written to the
shape its rule states: `devbook-arc42.md`, `devbook-domain.md`, `devbook-tech.md`,
`devbook-design.md`, `devbook-ai.md`. Required block fields are in
`devbook-chapter-metadata.md`. `devbook:update` creates a folder adopted later the same way.

`ai/` needs its stage set chosen before anything is written: ask which positions this
repository's development flow actually has, create one numbered file per stage, and register
them in `adoption-map.md`. Do not impose a default flow. Then confirm git tracks it —
`git check-ignore -v .devbook/ai/adoption-map.md`. A repo holding Adobe Illustrator files
often carries a `*.ai` rule; `.devbook/ai/` does not match it, but a file inside named
`<something>.ai` would — check before adopting.

The notes on rules, the `AGENTS.md` section, root wrappers, `.gitignore`, and routing are
`../update/SKILL.md` under *Notes*, and hold here unchanged. Report an init that ends on a
failing check as failing, never as initialized.
