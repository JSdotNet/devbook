# Upgrading devbook-config

Behaviour changes a consumer would notice, newest first.

## 1.1.0: `guide` is now `ask`

The question-answering skill is invoked as `devbook-config:ask`. Its behaviour, triggers,
and the report behind it are unchanged; only the name moved. Nothing on disk in a consuming
repository names the skill, so no migration ships.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
