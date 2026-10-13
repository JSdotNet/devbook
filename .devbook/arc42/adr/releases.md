# Releases

```meta
date: 2026-09-30
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/01-introduction-and-goals.md", ".devbook/arc42/08-crosscutting-concepts.md#marketplace", ".devbook/arc42/08-crosscutting-concepts.md#migration", ".devbook/arc42/adr/install.md"]
```

Every plugin carries the same version — `1.24.0` — in both manifests and the marketplace
entry, moved together on an explicit ask and never one at a time; the history before `1.0.0`
is collapsed, because no consumer installed under it. From that baseline a change to a chapter
schema, a stamp shape, a config key, or a materialized path ships its migration in the same
commit, and `AGENTS.md` states which changes owe one. A contract bump is a minor release, with its migration
when one is owed — a bump whose every part is an added field or value with a
safe default owes none, because nothing written under the previous contract
stops validating. A migration lives until the next major, which raises the floor
`MINIMUM_CONTRACT_VERSION` and deletes the folders at or below it. The floor is 9. Three
names are keys a consumer installs under: the marketplace is `jsdotnet-devbook` under the rule `jsdotnet-<repository>`, the
repository is `JSdotNet/devbook`, and the marketplace name is never renamed after the first
install.

## Why

```meta
```

**A version history nobody lived through is noise.** A number earns its meaning from the
consumers that installed under it — it is what an upgrade note addresses and what a migration
moves away from. The spread from `devbook` 3.4.0 to a surface at `0.1.0` recorded which branch
merged after which and asked every reader to treat one plugin as a fourth major and another as
pre-release. Collapsing it before the first install costs nothing; after, it is a downgrade. The
three pre-release migrations went with it, each moving away from a state no repository was in,
and the mechanism — the folder shape, the `MIGRATION.md` plus idempotent `migrate.mjs`, the
append-only ledger — stays. This repository's own ledger was emptied with the reset, the one
deliberate exception to a ledger entry never being removed: it held three no-ops recorded on
the day the stamp was created.

**The argument expires at the first install.** The deletion was safe because no repository was
behind; from the first install onward a schema, stamp, config, or path change leaves a
repository behind unless a script moves it. So the obligation starts here and never again lapses.

**The marketplace name is a per-machine primary key.** A host keys its registry, its cache
directory, and every `plugin@marketplace` reference by it, and GitHub redirects nothing about
it; a rename is a new marketplace to the host and orphans every install. The bare `jsdotnet`
said "not Copilot-specific" while it was the only such marketplace; beside `jsdotnet-ai-plugins`
it read as that marketplace's parent. A name that follows a rule needs no explaining, and the
rename was done on the last day it cost one machine and two plugins.

**A migration lives for one major.** What grows without bound is not the folder but the
promise that every shipped migration keeps working against every intermediate state forever.
A separate migrations plugin saves nothing — same checkout, and released in lockstep with the
generator it is written against; one script instead of one folder per change is the same lines
minus the `MIGRATION.md`; fetching from a tag adds a network dependency to save disk already
spent. So the cap is the one every migration framework a consumer knows uses: a major raises
the floor, a reconcile below it stops and says to pass through the previous major's last
release, and ledger ids are still never rewritten — an entry outlives its folder. Contract 10
and `010-terms-live-in-domain-md` therefore ship in `1.1.0`, and the `>=1.0.0 <2.0.0`
ranges hold.

**The repository name is a separate key, and cheap to move once.** A host stores it once as the
marketplace's source and GitHub redirects a renamed repository for git, the API, and the web.
`ai-agent-stack` described the repository before the specialists left; what remains is the
convention and the engine over it, and everything the repository says about itself leads with
devbook. `devbook` now names the repository, the plugin, and the folder, and prose says which.

## Rejected

```meta
```

- Keeping the version spread as provenance, or restarting `contractVersion` at 1.
- A migrations plugin, one migration script, or migrations fetched from a tag.
- Keeping migrations that can only exit `0`, to seed a ledger no run applied.
- `jsdotnet` as the marketplace name once a second marketplace followed the rule.
- A suffix to avoid `devbook` naming three things.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-10-13 | Every plugin is `1.24.0`, the release of the linked walkthroughs. A demo's walkthrough can link a scenario page's part instead of carrying its own steps, `devbook-meta` checks the link, and `demo-sync.mjs` copies each linked step's text and signature from the page. Two migrations ship in it, both under contract 30, which does not move: the linked form is an added value with a safe default — a free walkthrough validates as before — so it owes no bump. `030-scenario-tools` materializes `.devbook/_tools/scenarios/` that 1.21.0 added without one, and `030-linked-walkthroughs` rewrites a free walkthrough under a `Proved by:` case's slug to the linked form. A repository already stamped at contract 30 runs both, because presence in the ledger decides whether a migration runs and never a version comparison; the folder number names the contract the migration was written against, as `001`–`004` ran beside contracts far above them. Numbering them `031` would have needed a contract bump with nothing repo-visible behind it. A minor release, because a migration is owed. The other plugins move unchanged, because every plugin moves together. |
| 2026-10-12 | Every plugin is `1.23.0`. It carries the fixes to `devbook`'s scenario tools found adopting them in spec-manager: the reporter finds a part's spec from its file suite, a listing writes no run, the runner resolves `@playwright/test` from the running suite and ships a `package.json` that makes its folder an ES module scope, and `runSetup` declares its parameter type for a consumer's `tsc`. `run.json` stays version 2 and gains `parts[].failure` and a signature per shot, each optional to a reader, which is why this is a minor release and not a patch. A `flags` entry resolving to a `setting` names the `settings` entry instead. No contract moves and no migration is owed: the new `package.json` and `playwright.mjs` are files reconcile adds where they are absent, and every other file it replaces on a shipped hash. The other plugins move unchanged, because every plugin moves together. |
| 2026-10-08 | Every plugin is `1.22.0`, the release of the scenario evidence. No contract moves and no migration is owed: the contract stays at 30, and every part is added with a safe default. `devbook`'s `build.mjs` writes `_meta/scenarios.json`, a new derived file with its own `schemaVersion: 1`, and `graph.json` keeps its shape. The surface lifecycle's `update_stage` takes an optional `evidence` for Verify, so the group stays `@1`. `delivery`'s phases list, derive, run, and check the scenario pages an item references, and Personal Validation shows their screenshots. `devbook`'s `delta.mjs --check` runs the corpus-wide scenario rules over the corpus as a change would leave it, every delta merged in memory, and reports each new problem against the delta that causes it; `devbook-changes.md` and `devbook-openspec`'s schema, templates, and change rule name a scenario page as a delta and the `Proved by:` form of a requirement's case, and `tracker` and `status` list the scenario pages a step delivers with their runs. Only the check and the instruction text move, so no migration is owed: a schema or template copy still on a shipped hash is replaced by reconcile. The other plugins move unchanged, because every plugin moves together. |
| 2026-10-08 | Every plugin is `1.21.0`, the one release of the scenario pages. Contract 30 ships in it with no migration: it adds the `scenario` type, its six setup fields, and the `Proved by:` line a requirement's scenario may carry instead of its own steps, each an added value with a safe default that nothing written under 29 used. `devbook` gains the scenario tools under `tools/scenarios/` and the `scenario-write`, `scenario-derive`, and `scenario-run` skills, added payload that owes nothing. The other plugins move unchanged, because every plugin moves together. |
| 2026-10-07 | `devbook-config-view` joins at `1.20.1`, the last release every plugin shared, as `delivery-run-view` did at `1.15.0`. |
| 2026-10-07 | Every plugin is `1.20.1`. It carries five fixes to the `devbook-meta` demo checker and `delta.mjs` found reviewing an installed copy: a JSON demo script is exempt only when it is the one with its id, a delta keeps an approval whose chapter and demo it leaves alone, a replaced demo lifts every approval that folds it in, a demo delta's managed region is checked before it lands, and the change folder is read only inside the repository. No contract change and no migration. |
| 2026-10-07 | Every plugin is `1.20.0`, closing the spread `devbook` `1.19.0` and `devbook-collaboration` `1.18.1` had opened with the demo spec kind. Contracts 28 and 29 ship in it with no migration: 28 makes a `user` and a `technical` actor chapter a sync unit, and 29 leaves a demo's managed region out of every fingerprint. |
| 2026-10-06 | Every plugin is `1.18.0`, closing a spread from `1.15.0` to `1.17.0` that single-plugin moves had opened — `delivery` and its `001-phase-maps`, `devbook-openspec` and its `001-no-step-0-prototype`, `devbook-config` `1.15.1`, `delivery-schedule` `1.17.0`. Contracts 25, 26, and 27 ship in it: 25 (`sync`) and 26 (click demos) are additive and owe no migration; 27 folds `devbook-procedures` into `devbook` with `027-procedures-in-devbook`, which moves its stamp under `components.devbook` and carries the procedures' `001`–`004` under their shipped ids, and `devbook-procedures` leaves the marketplace. `devbook-skills` gains `research-brief`, `pr-body`, `retro`, and `wayfinder`, each an added skill that owes nothing. |
| 2026-10-03 | `delivery-run-view` joins at `1.15.0`, the last release every plugin shared, rather than at `0.1.0`. |
| 2026-10-01 | Every plugin is `1.15.0`. It carries `devbook-procedures`' `004-start-binding-is-run` and `delivery-schedule`'s `001-weekend-cadence`, payload-only migrations with no contract bump. |
| 2026-09-30 | Every plugin is `1.14.0`. It carries `devbook-procedures`' `002-debug-is-diagnose` and `003-show-removed`, payload-only migrations with no contract bump. |
| 2026-09-29 | Every plugin is `1.13.0`, the one release of the change lane; contracts 22, 23, and 24 ship in it with no migration, each additive. It carries the `requirement` type on `.design`, the change folder under `openspec/changes/` with its rule and the delta merge `delta.mjs`, the two rungs on a change's `proposal.md` and the gates and review queue that write them, the `devbook-openspec` bridge — joining at this version, its `devbook` range raised to `>=1.13.0` — the engine's replan chore, `policy["openspec.scenarios"]`, and `bindings["openspec.grill"]`, and `devbook-config` setting up, updating, and diagnosing the lane, unresolved provider ids included. |
| 2026-09-28 | Every plugin is `1.12.0`. `devbook-procedures` renames `start` to `run`, whose body becomes Claude Code's `.claude/skills/run-<name>/SKILL.md` recipe with a Copilot twin, and ships `001-start-is-run` to move it; it adds a sixth procedure, `prototype`, which owes nothing. No contract change. |
| 2026-09-28 | Every plugin is `1.11.0`. Contract 20 ships in it with no migration, because a repository with no `.devbook/statuses.json` validates as before; contract 21 ships with migration 021, which deletes `review`, `reviewer`, and `review-at` from every `meta` block now that a review in progress is `status` plus the open annotation fences. |
| 2026-09-27 | Every plugin is `1.10.0`; contract 19 ships in it with no migration, because it only lets an invariants chapter pair with the `## Shared Value Objects` or `## Shared Enums` grouping. |
| 2026-09-26 | Every plugin is `1.9.0`. `devbook-procedures` seeds a fifth procedure, `estimate`, an added seed a repository adopts through `update`, so no contract moves and no migration is owed. |
| 2026-09-25 | Every plugin is `1.8.0`; contract 18 ships in it with migration 018, which retitles a context's behaviour files `# Requirements` and `# Invariants`. The same contract takes `#### Scenario:` off an invariant — a claim, its rejection code, and `Enforced at:` — and leaves any an older invariant carries. |
| 2026-09-25 | Every plugin is `1.7.0`; contract 17 ships in it with migration 017, which moves a context's `invariants.md` and `invariants.<name>.md` into the invariants subpage of their domain page — `domain.invariants.md`, `domain.<name>.invariants.md` — and rewrites every reference to them. |
| 2026-09-24 | Every plugin is `1.6.0`. `delivery-surface-backlog` joins at that version; `delivery` adds the optional `bindings["delivery.surface"]` key, an added field with a safe default, so no migration is owed. |
| 2026-09-23 | Every plugin is `1.5.0`, the one release of the OpenSpec preparation; contracts 14 and 15 ship in it with migration 015. It carries the `requirements.md` and `invariants.md` behaviour files and their converters, the rename to `init`, `update`, and `validate`, the `plugin:skill` tracker and approved-spec bindings, and the `devbook-verify` schedule. |
| 2026-09-23 | Contract 15 and migration 015, which renames the skill ids a stack config binds, wait unreleased for `release-plan`, which reads the migration folder to pick the version. |
| 2026-09-22 | Every plugin is `1.4.0`; contract 13 ships in it with migration 013, which takes the decision rungs off every folder but `domain/`. A contract bump is a minor release, with its migration only when one is owed. |
| 2026-09-21 | Every plugin is `1.3.0`; contract 12 ships in it with migration 012, which retires the overlay's checkout layer and devbook's `.gitignore` block. |
| 2026-09-18 | Every plugin is `1.2.0`; contract 11 ships in it with migration 011 — the first release where a contract bump moved the version. |
| 2026-09-17 | Every plugin is `1.1.0`; contract 10 ships in it with migration 010. |
| 2026-09-17 | A migration lives for one major; the floor starts at 9 and a major raises it. |
| 2026-09-14 | The marketplace is `jsdotnet-devbook` under `jsdotnet-<repository>`; `jsdotnet` is retired, not reused. |
| 2026-09-14 | The repository is `JSdotNet/devbook`. |
| 2026-09-14 | Every plugin is `1.0.0`, the pre-release migrations are deleted, and a migration ships with its change from here on. |
| 2026-09-02 | The marketplace is `jsdotnet`, a per-machine key never renamed after release. |
