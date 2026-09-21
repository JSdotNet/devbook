# Releases

```meta
date: 2026-09-21
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/01-introduction-and-goals.md", ".devbook/domain/plugin-authoring/domain.md#marketplace", ".devbook/domain/plugin-authoring/domain.md#migration", ".devbook/arc42/adr/install.md"]
```

Every plugin carries the same version — `1.3.0` — in both manifests and the marketplace
entry, moved together on an explicit ask and never one at a time; the history before `1.0.0`
is collapsed, because no consumer installed under it. From that baseline a change to a chapter
schema, a stamp shape, a config key, or a materialized path ships its migration in the same
commit, and `AGENTS.md` states which changes owe one. A contract bump with its migration is a
minor release; a migration lives until the next major, which raises the floor
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
behind; from the first `devbook:install` onward a schema, stamp, config, or path change leaves a
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
| 2026-09-21 | Every plugin is `1.3.0`; contract 12 ships in it with migration 012, which retires the overlay's checkout layer and devbook's `.gitignore` block. |
| 2026-09-18 | Every plugin is `1.2.0`; contract 11 ships in it with migration 011 — the first release where a contract bump moved the version. |
| 2026-09-17 | Every plugin is `1.1.0`; contract 10 ships in it with migration 010. |
| 2026-09-17 | A migration lives for one major; the floor starts at 9 and a major raises it. |
| 2026-09-14 | The marketplace is `jsdotnet-devbook` under `jsdotnet-<repository>`; `jsdotnet` is retired, not reused. |
| 2026-09-14 | The repository is `JSdotNet/devbook`. |
| 2026-09-14 | Every plugin is `1.0.0`, the pre-release migrations are deleted, and a migration ships with its change from here on. |
| 2026-09-02 | The marketplace is `jsdotnet`, a per-machine key never renamed after release. |
