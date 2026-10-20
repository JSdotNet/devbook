# Install

```meta
date: 2026-10-20
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/08-crosscutting-concepts.md#stamp", ".devbook/arc42/08-crosscutting-concepts.md#migration", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule", ".devbook/arc42/adr/hosts.md", ".devbook/arc42/adr/releases.md"]
c4: ["marketplace.devbook.reconciler", "marketplace.devbook-config.init-service", "marketplace.devbook-config.update-service"]
c4-touches: ["repository"]
```

A plugin reaches a repository through its `init` skill, is kept current by its `update`, and
reaches it in no other way. `init` refuses where the component's stamp exists and `update`
where it does not. Either writes the payload one way — rules as a host-neutral copy plus a wrapper per host, tooling under
`.devbook/_tools/`, one marker-fenced section of `AGENTS.md`, root wrappers where absent — and
records every copy's hash in the repository's stamp. A copy that still hashes to a release is
replaced; one edited since is reported as customized and never overwritten. Only `devbook`,
which rewrites content the repository authored, carries a contract version and a migration
ledger; every other component is payload-only. This repository adopts its own plugins the
same way, and its checker makes every vendored copy unable to drift from the plugin it came
from.

## Why

```meta
```

**Rules are delivered, never auto-applied.** Neither manifest has a rules key and neither host
has a rules component, so a scoped rule inside a plugin fires nowhere until an install writes it
into a repository. A plugin rule is therefore a template — `name` and `description`, globs in
`rules/rules.json` beside it — installed as the same trio this repository uses for its own rules
([hosts](hosts.md)): `.agents/rules/<name>.md` verbatim, a pointer wrapper per host. The file is
named for what it becomes, so a rule citing a sibling by bare filename resolves in the plugin
and in every repository alike. Globs carry both layouts, because a glob matching nothing applies
nothing and trimming would make the rule customized from the first reconcile — a rule that
mattered while two layouts existed.

**One section of `AGENTS.md`, and the root wrappers where absent.** The one thing a
repository's instruction file should say about its devbook — which folders, where the rules
are, how the indexes are checked — was said nowhere on disk. The section is rendered from the
stamp's `adopted` list, carries structure and never routing, and is materialized like a file:
keyed `AGENTS.md#devbook`, hashed, rewritten only while the fenced text still matches. A first
install then landed on a section Claude Code never loaded, because nothing carried the root
wrapper; the install now creates `CLAUDE.md` and `.github/copilot-instructions.md` where
neither exists, stamped `managed: false` from the start, and never touches one that exists.

**Tooling under `.devbook/_tools/`.** The generator is plain Node with no host in it; under
`.github/tools/` a first install read as devbook adding GitHub tooling. `.devbook/` is the one
parent, and the underscore is what the naming rule reserves for machinery. `.github/`
keeps only what GitHub reads: the workflows and the Copilot wrappers.

**What a component writes decides whether it needs a ledger.** `devbook` rewrites chapters,
`meta` blocks, and other components' entries — none of it hash-comparable, so only a script can
move it and only a ledger says whether the script ran. A payload-only component copies files it
owns whole, and hash-matching is then the whole migration mechanism. A change that must reach an
already-edited copy has no mechanism by design; the seed is meant to be edited.

**A workflow edited on the way in owes no migration for a step it gains.** `devbook-derived:init`
writes the nightly's `cron` and refresh branch and the drift workflow's branch and path filters
into its two workflows as they land. So each is customized from its first run, and `update`
leaves it alone. When a release changes their steps — `1.28.0` added the C4 render — `update`
reports the shipped diff for a person to merge, and no migration is owed. A script cannot tell
the install's edit from a person's later one in a CI file the repository owns. A wrong insertion
breaks the pipeline; a missing step only leaves an output unwritten. The render step adds output
and removes nothing: a stale workflow still refreshes the indexes, and
`build/Update-DevbookIndex.ps1`, which reconcile replaces on its shipped hash, renders the views
on demand until the step is merged. The exemption stops there. A change that leaves a stale copy
failing — a tool path it calls that is gone — owes a migration, shipped without a ledger the way
`delivery-schedule`'s `001-weekend-cadence` is. devbook's own `devbook-meta.yml` stays under
`AGENTS.md`'s *When a change ships a migration*: it is the repository's gate, and a step missing
from a gate is a check that silently stops running.

**A procedure is the rule trio with the ownership reversed.** A rule body is the plugin's
and is refreshed while it hashes to a release; a procedure body under `.agents/skills/` is
the repository's from its first edit, and the only thing the plugin keeps refreshing is the
wrapper, which now carries the procedure's goal above the pointer. Same three files, same
hashes, same customized rule; what differs is which of the three the plugin expects to keep
rewriting. A present file the component never stamped — a `capture` an earlier engine seeded —
is asked about once and kept as the repository's or replaced, never silently overwritten.

**`run` is Claude Code's recipe, not a fourth copy.** Claude Code's `run` and `/run-skill-generator`
look for `.claude/skills/run-<name>/SKILL.md`, and a `start` procedure beside them was a second
recipe neither read. So the body of `run` is that recipe — the generator's, or the seed where no
host can run it — `managed: false` from the moment it lands, and Copilot gets a managed twin at
`.github/skills/run/SKILL.md` pointing at it. The rename moved a path a customized body sat at,
which hash-matching cannot do, so `devbook-procedures` shipped the first migration outside
`devbook`: `001-start-is-run`, numbered in its own sequence and idempotent by its `--check`, with
no ledger — the shape it removes is the record that it ran — until the fold below carried it
into devbook's. `001` rewrote only the stamp, so an
`extensions["app.start"]` bound to `repo:start` kept naming a skill that was gone;
`004-start-binding-is-run` removes it, since an unset `app.start` falls back to the `run`
recipe, or hands its options to `repo:run`. Delivery's `001-phase-maps` guards the same id in
every layer, because 004 reads only the committed file and runs first only under
`devbook-config:update`. `extensions` is the engine's, and this is the one write another
component makes there: the rename exception devbook's reconcile protocol grants for an id another
entry spells, extended to the procedure a `devbook-procedures` migration renamed.

**A procedure never takes a host's own name.** A project skill that shares its name with a
command or skill the host bundles replaces it, so a procedure named `debug` took Claude Code's
`/debug` away from every repository that adopted it. The procedure is `diagnose`, and
`002-debug-is-diagnose` moves an edited body and renames it in the stamp; the wrappers are
`update`'s to write, as for any adopted procedure.

**A procedure no caller invokes is not seeded.** `show` walked the branch's feature for a
reviewer through `run` and `capture`, but no flow called it: Validation starts the application
through `run` and takes evidence through `capture` directly, and on Claude Code a person who
wants to see a change working types `/verify`, which follows the same `run` recipe. So `show`
is removed; `003-show-removed` deletes its wrappers and an unedited body, and leaves an edited
one as the repository's own.

**Procedures install with `devbook`.** Since `devbook-procedures` folded into `devbook`
([plugin boundaries](plugin-boundaries.md)), `devbook:init` asks about procedures beside
folders and `devbook:update` reconciles them in the same pass. The procedures keep their
`adopted` list and each copy's hash, now under `components.devbook`, and nothing about the
trio, the wrapper's goal, or the body's ownership changes. Moving the entry is a stamp-shape
change, so the fold ships a `devbook` migration in the same commit, per
[releases](releases.md): `027-procedures-in-devbook`, at contract 27, rewrites
`components.devbook-procedures` as `components.devbook.procedures.adopted` and merges every
hash into devbook's `materialized`, leaving each copy where it is. The four
`devbook-procedures` migrations move into `devbook` with it under their shipped ids, per the
reconcile protocol's rule that a migration id is never invented, renamed, or removed, and enter
devbook's ledger with `appliesTo: [procedures]`. They rewrite the old entry, so ledger order
runs them before `027`.

**OpenSpec's verbs: `init` and `update`, `validate` and `doctor`.** Where OpenSpec has a word,
the marketplace uses it, so a person who knows one tool reads the other without translating.
One `install` covering first setup and upgrade asked a stamped repository what its stamp already
answered, and said nothing about which case a run was; `init` scaffolds and stamps, `update`
refreshes, migrates, and re-stamps, and each refuses the other's case — "already initialized,
run update", "not initialized, run init". The same split took `check` apart: `devbook:validate`
asks whether the corpus is valid, and `devbook-config:doctor` whether the installation is
current, because only the second reads every component's stamp and only devbook-config may.
Sync was rejected earlier for the same reason as before: it names a two-way reconcile between
peers, and a plugin writes while the repository never writes back. Every such skill is
addressed `plugin:init` and `plugin:update`, because the plugin name already carries the scope.

**`devbook-config` is the front door; a component's own pair is hidden from the menu.**
`devbook-config:init` and `devbook-config:update` fan out to every adopted component's pair,
so a menu listing both the orchestrator and five component pairs offered two ways to do one
thing and no hint which to pick. The pairs of `devbook`, `delivery`, and `devbook-derived`
carry `user-invocable: false`: gone from the `/` menu, still invocable by
the model, which is what the fan-out needs — `disable-model-invocation` would be the opposite
and break it. They are not removed, because no plugin depends on `devbook-config` and a
repository with `devbook` alone still reaches `devbook:init` by asking for it in words.
`delivery-schedule`'s pair stays visible: a person runs it directly to change a cadence, not
only through the fan-out. A host that does not know the key ignores it and keeps listing them.
Its `schedule-*` entry points carry neither key: a scheduled session reaches its target
through the model, so `disable-model-invocation` stops every run at its first step, and the
schedule catalog's checker fails a target that sets it.

**This repository adopts like any other.** It was once exempt: a second copy of
`plugins/devbook/tools/` under `.devbook/_tools/` would drift on the first edit, and a delivered
rule trio failed the checker for want of `paths`. An exempt repository never exercised the
install it ships, and every path a flow names — `.devbook/_tools/devbook-meta/build.mjs`
among them — resolved everywhere but here. Both blockers are now checks rather than reasons:
`tools/check-assets.mjs` recognizes a delivered rule or procedure by name and derives its
wrappers from the shipping plugin, and fails when `.devbook/_tools/devbook-meta/`,
`devbook-tech/`, or `scenarios/` differs by a byte from `plugins/devbook/tools/`, so an edit to the plugin and
the refresh of its copy land in one commit. Hashes and that comparison are taken over
LF-normalized text, because the working tree is CRLF and the index LF.

## Rejected

```meta
```

- A two-file rule shape with the body in `.github/instructions/`: every cross-reference between
  rules would need a rewrite at both ends.
- A contract version and ledger on every component: a counter that never moves beside a folder
  that stays empty.
- Reconciling the root wrappers after creating them: a root file is where a repository puts what
  it wants said to one host and not the other, so every later edit is a customization.
- Exempting this repository from its own install: nothing then tested the payload where it
  is authored, and it was rejected on 2026-09-25 once the checker made the copies drift-proof.
- One `install` that branches on whether the stamp exists: it hides which case a run is, and
  puts the adoption interview in front of an operation people run to change nothing.
- Removing the component pairs in favour of `devbook-config`: every plugin installs alone, and
  a repository without `devbook-config` would have no way in.
- A `devbook-derived` migration that inserts the C4 render step into an installed repository's
  two workflows: it would edit CI the repository owns, guessing which lines the install wrote,
  to restore an output the refresh script already produces on demand.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-20 | A workflow `devbook-derived:init` edits on the way in owes no migration for a step a release adds, and `AGENTS.md` and the plugin's README say so. The C4 render step `1.28.0` added to both workflows ships that way; a change that leaves a stale copy failing still owes one. | `update` reports the shipped diff. |
| 2026-10-13 | A newly materialized path ships its migration, per `AGENTS.md` under *When a change ships a migration*: the 2026-10-08 reasoning that `update` creates a new path and so owes none is withdrawn. `030-scenario-tools` materializes `.devbook/_tools/scenarios/` where `domain` is adopted and the folder is missing or still an older release's copy, and reports a customized copy. | Without one the ledger never records the path and `doctor` has no `--check` to report it missing. |
| 2026-10-08 | `tools/scenarios/` materializes into `.devbook/_tools/scenarios/` where `domain` is adopted, and `check-assets` holds its vendored copy to the plugin like the other two. Shipped without a migration; corrected on 2026-10-13. | — |
| 2026-10-06 | `004-start-binding-is-run` hands an `app.start` with options to `repo:run`. The id is unchanged, and delivery's `001-phase-maps` drops either retired provider wherever it finds one. | It wrote `delivery:phase-validation`, a phase skill retired since. |
| 2026-10-05 | Procedures install with `devbook`: `027-procedures-in-devbook` moves the stamp entry at contract 27, and `001` to `004` join devbook's ledger under their shipped ids. | — |
| 2026-10-05 | Procedures will install with `devbook`: a `devbook` migration moves `components.devbook-procedures` under `components.devbook`, keeping `adopted` and every hash, and the four `devbook-procedures` migrations move with them. Decided here; the fold lands as its own change. | — |
| 2026-10-01 | `devbook-procedures` ships `004-start-binding-is-run`: an `app.start` binding to `repo:start`, which `001` left dangling, is removed or handed to the default provider. The reconcile protocol's rename exception extends to `devbook-procedures`, the one component other than `devbook` that writes an engine key, and only to rename an id it retired. | — |
| 2026-10-01 | The weekly schedules move to the weekend; `delivery-schedule` ships `001-weekend-cadence`, with no ledger. `update` re-times the routine and the stamped `pluginVersion` is the record: `--check` exits `1` below the release that ships it. | What it moves is a routine in the machine's scheduler, which neither a hash nor a script reaches. |
| 2026-09-30 | `show` is removed; `devbook-procedures` ships `003-show-removed`, and `chapter-accept` starts the application through `run`. | No flow invoked it, and `/verify` answers a person on Claude Code. |
| 2026-09-30 | `debug` becomes `diagnose`; `devbook-procedures` ships `002-debug-is-diagnose`. | A project skill named `debug` replaces Claude Code's bundled `/debug`. |
| 2026-09-29 | `delivery-schedule`'s `schedule-*` entry points drop `disable-model-invocation`; the catalog checker now fails a target that sets it. | It had stopped every scheduled run at the Skill call. |
| 2026-09-28 | This repository drops `devbook-procedures`: its `run`, `show`, `capture`, and `debug` copies and the stamp entry are removed. | The procedures are the product here and the plugin's seeds are their only copy. |
| 2026-09-28 | `start` becomes `run`: its body is Claude Code's `.claude/skills/run-<name>/SKILL.md` recipe from `/run-skill-generator`, with a Copilot twin; `devbook-procedures` ships `001-start-is-run`, the first migration of a payload-only component, and this repository applies it. | — |
| 2026-09-26 | This repository reaches its own release through `devbook-config:update`: `devbook` materialized at 1.8.0 and every stamp moved to 1.9.0 with no migration outstanding; `devbook-procedures` adopted `start`, `show`, `capture`, and `debug`, each body rewritten from its seed. `devbook-derived` stayed at 1.2.0 while the machine that ran it lacked the plugin — a stamp is never dropped for that — and reached 1.9.0 once it was installed; its refresh script, both workflows, and its rule trio landed then too, never having been stamped before. | — |
| 2026-09-25 | Reversed the 2026-09-09 exemption: this repository adopts like any other. `check-assets` validates delivered rule and procedure trios and fails on a vendored `.devbook/_tools/` copy that differs from `plugins/devbook/tools/`. | — |
| 2026-09-25 | The component `init`/`update` pairs, bar `delivery-schedule`'s, are `user-invocable: false`; `devbook-config` is the menu's one entry. | — |
| 2026-09-23 | `init` and `update` replace `install` and `setup`; `validate` and `doctor` replace `check`. Migration 015 renames the bound ids. | — |
| 2026-09-21 | Procedure skills land as a trio whose wrapper carries the goal; `devbook-procedures:install` writes them, `delivery:install` stamps `pluginVersion` alone. | — |
| 2026-09-15 | `tools/devbook-meta/` and `tools/devbook-tech/` materialize into `.devbook/_tools/`, not `.github/tools/`. | — |
| 2026-09-15 | The install creates `CLAUDE.md` and `.github/copilot-instructions.md` where absent, `managed: false`. | — |
| 2026-09-09 | This repository stamps itself — engine keys and three components — and materializes nothing. | — |
| 2026-09-09 | `contractVersion`, `adopted`, and `migrations` are `devbook`'s alone; the other components are payload-only. | — |
| 2026-09-07 | Plugin rules ship as a trio through the install; `applyTo` refused in a rule; every install skill is `install`. | — |
| 2026-09-07 | `<component>-sync` becomes `<component>-install`. | Nothing here reconciles two peers. |
| 2026-09-07 | `devbook:install` writes and reconciles one marker-fenced section of `AGENTS.md`. | — |
