---
name: doctor
description: 'Diagnose a repository''s installation of this marketplace without writing anything — every component''s stamp against what is on disk, outstanding devbook migrations, a stale or customized AGENTS.md section, and each installed plugin against the newest published — and name the one skill that fixes each finding. Reads every stamp, which is why it lives here and not in any one component. Use when: something may be out of date, a migration may be outstanding, a stamp may have drifted, after an upgrade, or before trusting a repository nobody remembers configuring. Triggers on: "devbook-config doctor", "doctor", "is the stack healthy", "is my installation current", "outstanding migrations", "stamp drift", "is the AGENTS.md section stale".'
---

# devbook-config doctor

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Say whether this repository's installation is current, and write nothing. Whether the
chapters are valid is `devbook:validate`'s question; this one reads every component's stamp,
which no single component may. Every fix it names belongs to that component's own `update` —
two writers for one stamp is how a reconcile stops being idempotent.

## Steps

1. **Look.** Run `node scripts/report.mjs --root <repository> --json` from this plugin's root.
   No `.devbook/config.json`: say "not initialized, run `devbook-config:init`" and stop. Report
   every plugin whose installed version is behind the newest published, and every `update
   available` row, with `devbook-config:update` as the fix.
2. **Check the migration ledger.** From devbook's `installPath` in that output, run
   `node migrations/<id>/migrate.mjs --check --root <repository>` for every folder, oldest
   first. Exit `1` is hard drift: work the ledger says is done, or a migration it does not yet
   record. Never apply one here. devbook not installed: say the ledger is unchecked, and why.
3. **Check every stamp** against disk, with the stamp rules in devbook's
   `assets/reconcile-protocol.md` under **The stamp** — hash every `materialized` entry and
   the `AGENTS.md` section between each component's markers:

   | Drift | Severity | Fix |
   |---|---|---|
   | A migration the plugin's `contractVersion` requires is missing from the ledger | hard | `devbook:update` |
   | The stamped `contractVersion` is below `MINIMUM_CONTRACT_VERSION` in devbook's `tools/devbook-meta/graph.mjs` | hard | Upgrade through the previous major's last release first, then `devbook:update` |
   | A file a stamp says was materialized is gone | hard | That component's `update` |
   | A devbook folder on disk that `adopted` does not list, or the reverse | hard | `devbook:update` |
   | A component's `AGENTS.md` section, or one of its markers, is missing | hard | That component's `update` |
   | A materialized hash matches an older release | stale | That component's `update`; nothing is broken |
   | An `AGENTS.md` section matches its stamped hash but not what its template renders now | stale | That component's `update` |
   | A materialized hash matches nothing ever shipped | customized | Report it and leave it — often deliberate |
   | An `AGENTS.md` section no longer matches its stamped hash | customized | Report it and leave it; the repository has taken the section over |

4. **Report** one table: finding, component, severity, and the skill that fixes it. Fail on
   hard drift; report staleness and customization without failing — a stale generated file
   must not block an unrelated pull request.

## Do not

- Do not apply a migration, edit a stamp, or rewrite an `AGENTS.md` section. Each belongs to
  its component's `update`, which records what it did as it does it.
- Do not treat a component this machine has not installed as drift: its stamp is shared, and
  the report's `blocked` scope already says so.
