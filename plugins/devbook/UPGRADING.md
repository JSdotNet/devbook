# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## Unreleased: one decision record per technical concern

`devbook-arc42.md` now says what a decision record is for and how many there are. A record
holds a technical choice — one that would take a migration of code, data, or infrastructure to
reverse — and there is one record per concern (`adr/storage.md`, `adr/api.md`), updated in
place, with a `## History` table carrying the individual decisions. A naming, layout, or
process choice is no longer a record: the rule or chapter that states it carries the reason.
Decision records lose their number; debt records keep theirs. A repository holding a numbered
per-decision set is not broken — the generator reads both shapes — and folds it when it
chooses, as this repository's own debt record 7 does; the rule is prose, so no migration ships.

## Unreleased: every skill opens with its plugin version

Each `devbook` skill now opens its reply with `devbook@<version>`, the version read from the
plugin manifest beside it (`.agents/rules/skills.md`).
Nothing a repository holds changes, so there is nothing to reconcile.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/releases.md`. There is nothing to upgrade from.
