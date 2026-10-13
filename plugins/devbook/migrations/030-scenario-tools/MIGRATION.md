# 030 — the scenario tools reach every repository that adopted `domain/`

```meta
contractVersion: 30
appliesTo: [domain]
breaking: no
```

## What

devbook 1.21.0 added a path to what `devbook:init` and `devbook:update` materialize:

| From the plugin | Into the repository | When |
| --- | --- | --- |
| `tools/scenarios/` | `.devbook/_tools/scenarios/` | `domain` adopted |

A repository that adopted `domain/` before 1.21.0 has no copy, and one that took 1.21.0 to
1.23.0 holds a copy an older release shipped. This migration materializes the copy the
installed plugin ships where the folder is missing, and replaces a copy that still hashes to a
release devbook shipped. A copy hashing to no shipped release is customized: reported, never
overwritten. So is one the stamp records `managed: false`.

It writes nothing else. The stamp's `materialized[".devbook/_tools/scenarios"]` entry and the
ledger are the reconcile's to write, in its stamp phase.

## Why

`AGENTS.md`, under *When a change ships a migration*, owes one for every change to what
`devbook:init` materializes. 1.21.0 shipped none on the reasoning that `update` creates a new
path anyway; the ledger then has no record that a repository received the tools, and
`devbook-config:doctor` has no `--check` to report the gap. The record is
`.devbook/arc42/adr/install.md` in the marketplace.

## What breaks

Nothing. A repository without `domain/` adopted records `not-applicable`, and adopting it later
re-evaluates the migration. A customized copy keeps working as it is; diff it against the
plugin's `tools/scenarios/` and take what you need by hand, or record it `managed: false`.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while the folder is missing or holds an older shipped copy, and `0` when it
is current, customized, or `domain` is not adopted; it writes nothing. Drop the flag to apply.
Running it twice changes nothing. Both forms take `--root <path>`, defaulting to the working
directory.

## Hashes

The folder rule in `assets/reconcile-protocol.md`, over LF. The copy the installed plugin
ships is hashed live; the older releases are listed in the script:

| Release | Hash |
| --- | --- |
| 1.21.0, 1.22.0 | `sha256:9a8deb1f6589db5c3cfee03ad8d25c5ed18ad151141d2b9f8cc88aebeb6d9f81` |
| 1.23.0 | `sha256:ac980259318b18bdd8b1c7a54f8b443734ef6bc8232acc48a32261eba0ba5483` |
