# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## Unreleased: every skill opens with its plugin version

Each `devbook` skill now opens its reply with `devbook@<version>`, the version read from the
plugin manifest beside it (`.devbook/arc42/adr/76-every-skill-opens-with-its-plugin-version.md`).
Nothing a repository holds changes, so there is nothing to reconcile.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
