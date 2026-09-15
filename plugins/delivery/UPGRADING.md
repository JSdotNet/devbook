# Upgrading delivery

Behaviour changes a consumer would notice, newest first.

## Unreleased

- **Two more overlay layers, outside the clone.** `tools/stack-config/check.mjs` now merges
  `<config dir>/config.local.json` (every repository) and `<config dir>/repos/<id>/config.local.json`
  (this repository) under the checkout's `.devbook/config.local.json`, where `<config dir>` is
  `$XDG_CONFIG_HOME/devbook`, `%APPDATA%\devbook`, or `~/.config/devbook`. A fresh worktree
  now runs with your settings instead of the team defaults. The repository layer needs a new
  top-level `id` in `.devbook/config.json`; absent, that layer is skipped and nothing else
  changes, so there is no migration. `devbook-config:setup` writes `id` for a new repository;
  an existing one adds it by hand. An overlay may no longer say `id`.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
