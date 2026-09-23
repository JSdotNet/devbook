# 015 — the skills take OpenSpec's verbs

```meta
contractVersion: 15
appliesTo: [arc42, domain, tech, design, ai]
breaking: yes
```

## What

Every component's `install` skill is now two: `init`, which scaffolds and stamps and refuses
where the stamp exists, and `update`, which refreshes, migrates, and re-stamps and refuses
where none does. `devbook-config:setup` is `devbook-config:init`. `devbook:check` is
`devbook:validate`, and the half of it that read the stamp moved to `devbook-config:doctor`.
`delivery-schedule`'s `schedule-devbook-check` is `schedule-devbook-validate`, and its catalog
entry `devbook-check` is `devbook-validate`.

A repository binds skills by id — an extension point in `.devbook/config.json` names a
provider such as `devbook:check` at `session.start` or `devbook:install` at `flow.end` — and
an overlay may bind the same points. This migration rewrites every string value that is one
of the old ids, in the committed config and in both overlay layers under the user's devbook
config directory, `config.local.json` and `repos/<id>/config.local.json`:

| Old | New |
| --- | --- |
| `devbook:install` | `devbook:update` |
| `devbook:check` | `devbook:validate` |
| `devbook-derived:install` | `devbook-derived:update` |
| `devbook-procedures:install` | `devbook-procedures:update` |
| `delivery:install` | `delivery:update` |
| `delivery-schedule:install` | `delivery-schedule:update` |
| `devbook-config:setup` | `devbook-config:init` |
| `delivery-schedule:schedule-devbook-check` | `delivery-schedule:schedule-devbook-validate` |

In the committed config it also renames `devbook-check` to `devbook-validate` in
`components.schedule` — an `enabled` entry and an `overrides` key alike.

An id bound where a repository runs a reconcile is renamed to `update`, never `init`: a
repository that already binds one is initialized, and `init` would refuse it.

## Why

Where OpenSpec has a word, the marketplace uses it, so a person who knows one tool reads the
other without translating. `install` said nothing about whether a repository already had the
component, and one skill doing both first setup and upgrade asked the same question of
a stamped repository that the stamp already answered. `check` asked two questions — is the
corpus valid, is the installation current — and only the first is devbook's alone; the second
reads every component's stamp, which only devbook-config may. The record is
`.devbook/arc42/adr/install.md` in the marketplace.

## What breaks

An extension point bound to an old id names a skill that no longer exists. The delivery
checker still validates the file — a provider id is not checked against installed skills —
so nothing fails loudly: a flow reaches the point, finds no such skill, and does without it.
Until this migration runs, a `session.start` bound to `devbook:check` silently validates
nothing, and a `flow.end` bound to `devbook:install` silently reconciles nothing.

A `components.schedule` still selecting `devbook-check` names a catalog entry that no longer
ships, and `delivery-schedule:update` skips it as unknown.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when every file is clean; it writes nothing,
and it is what CI and the plan phase of `devbook:update` call. Drop the flag to apply.
Running it twice changes nothing. Both forms take `--root <path>`, defaulting to the working
directory, and read the config directory from `XDG_CONFIG_HOME`, else `APPDATA` on Windows
and `~/.config` elsewhere — the same rule the checker uses.

## What the script does, and does not

It replaces each old id as a quoted token and leaves the rest of each file byte-for-byte,
then parses the result and compares it with the rename applied to the parsed value. Where an
old id also appears somewhere this migration does not rename — a key, or an unrelated
string — the file is not written: `--check` keeps exiting `1` and names it, and the rename is
yours. It changes no key, no other value, and nothing in `components` beyond the schedule
name; `contractVersion` and the ledger are the reconcile's to write. It does not rename a
routine already created in a host's scheduler — `delivery-schedule:update` does that from the
renamed selection.
