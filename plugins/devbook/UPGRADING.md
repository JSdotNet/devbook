# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## 1.1.0: the root wrappers are created for you

`devbook:install` now creates `CLAUDE.md` and `.github/copilot-instructions.md` where a
repository has neither, each a two-line pointer at `AGENTS.md`, so the section it writes there
is read by both hosts without a step left to you. A present file is never touched, and the
created ones are stamped `managed: false`: yours from the moment they land. No migration — the
next reconcile creates them where they are missing. Reason:
`.devbook/arc42/adr/67-the-install-creates-the-root-wrappers-where-absent.md`.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
