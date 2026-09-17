---
name: install
description: 'Install or refresh devbook-derived''s tooling in a repository — the devbook-meta checker and generator under .devbook/_tools/, the CI check and nightly refresh workflows, the on-demand refresh script, the derived-artifacts rule with a wrapper per host, and its own marker-fenced section of AGENTS.md — and record it under components.derived in .devbook/config.json. Idempotent: run it on first setup, after upgrading the plugin, and whenever the check is missing from a repository that adopted devbook. Use when: adopting devbook-derived, upgrading it, "the devbook check is not installed", or the _meta indexes have no generator. Triggers on: "install devbook-derived", "install the devbook tooling", "set up the devbook check", "derived install", "devbook-derived-install".'
---

# devbook-derived install

Materialize the tooling the way `devbook` materializes its rules: copy what is stale,
report what is customized, stamp what landed. Read `devbook`'s
`assets/reconcile-protocol.md` first for **The stamp**'s two shared fields, the hash rules,
and the plan-before-write phase; this plugin writes `components.derived` and touches no
other entry. The folder list comes from devbook's stamp, never from disk; every folder
lives under `.devbook/`.

Stop and say so if `components.devbook` names no adopted folder: there is nothing to check
yet — run `devbook:install` first.

## What lands

| From this plugin | Into the repository | When |
|---|---|---|
| `tools/devbook-meta/` | `.devbook/_tools/devbook-meta/` | always |
| `assets/workflows/devbook-meta.yml` | `.github/workflows/devbook-meta.yml` | GitHub Actions present |
| `assets/workflows/devbook-meta-nightly.yml` | `.github/workflows/devbook-meta-nightly.yml` | GitHub Actions present |
| `assets/build/Update-DevbookIndex.ps1` | `build/Update-DevbookIndex.ps1` | always |
| `assets/agents-section.md` | `AGENTS.md`, between `<!-- devbook-derived:begin -->` and `<!-- devbook-derived:end -->` | always |
| `rules/devbook-derived-artifacts.md` and its `paths` | `.agents/rules/`, `.claude/rules/`, `.github/instructions/` — the trio devbook's `assets/rule-wrappers.md` describes | always |

Both workflows are edited on the way in — branch name, the nightly `cron` and
`REFRESH_BRANCH`, and the path filters trimmed to the adopted folders. The edit makes both
files customized from the first run, which is intended.

The `AGENTS.md` section is rendered whole from `assets/agents-section.md`, appended after
devbook's section, keyed `AGENTS.md#devbook-derived`, and follows devbook's marker rules —
rewritten while its text still hashes to what this plugin wrote, reported and left alone once
it does not. Never write inside devbook's markers.

Offer the `.claude/settings.json` deny rule from `assets/settings-snippet.md`; nothing else
enforces the `_meta/` rule mechanically. Never apply it silently.

## The run

1. **Plan.** One table — `create`, `update`, `skip-customized` — and write nothing.
2. **Materialize.** Overwrite only a file whose hash matches a release this plugin shipped.
3. **Stamp.** Rewrite `components.derived`: `pluginVersion` and `materialized`, each entry
   with the release it came from and its hash. Payload-only: no contract version, no ledger.
4. **Verify.** Run `node .devbook/_tools/devbook-meta/build.mjs --check` and report; a run
   that ends on a failing check is reported as failing, never as installed.
5. **Report** what moved, and leave the commit to the user. Without GitHub Actions, say
   plainly that the check runs locally and the refresh is manual.
