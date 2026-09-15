# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## 1.1.0: the generator moves to `.devbook/tools/`

`.github/tools/devbook-meta/` and `.github/tools/devbook-tech/` become
`.devbook/tools/devbook-meta/` and `.devbook/tools/devbook-tech/`: the generator is plain
Node, and `.github/` is one host's folder. Every command that names the path — the skills, the
flows, the two workflows, `build/Update-DevbookIndex.ps1`, the `AGENTS.md` section — names the
new one, `generatedBy` in the derived artifacts follows on the next refresh, and the contract is
10. Migration `10-the-generator-lives-under-devbook` moves the folders and rewrites the five
files the install owns; `devbook:install` runs it. A path you wrote somewhere of your own is
yours to move. The nested-layout globs on the shared rules narrow from `.devbook/**` to the five
chapter folders at the same time, so opening the generator or the stack config no longer loads
the chapter rules; reconcile refreshes the wrappers. Reason:
`.devbook/arc42/adr/68-the-generator-lives-under-devbook.md`.

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
