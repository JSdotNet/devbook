# Upgrading delivery-surface-dashboard

Behaviour changes a consumer would notice, newest first.

## 1.1.0: the session-title words are configurable

`components.delivery-surface-dashboard.sessionNaming.labels` in `.devbook/config.json` maps a
destination kind — `artifact`, `code`, `domain`, `arc42`, `tech`, `design`, `ai`, or `devbook`
for all five folders at once — to the word the session title shows for it, and `null` to no
prefix at all, which leaves the host's own session name in place. Nothing changes for a
repository that sets none: the words are the kind ids, as before. The key is added with a safe
default, so no migration ships. Where it lives and why:
`.devbook/arc42/adr/75-session-naming-is-configured-in-the-dashboards-component-entry.md`.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
