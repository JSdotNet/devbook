# Upgrading fleet

Behaviour changes a consumer would notice, newest first.

## Unreleased: every skill opens with its plugin version

Each `fleet` skill now opens its reply with `fleet@<version>`, the version read from the
plugin manifest beside it (`.agents/rules/skills.md`).
Nothing a repository holds changes, so there is nothing to reconcile.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/releases.md`. There is nothing to upgrade from.
