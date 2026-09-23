# 012 — nothing personal lives in the clone

```meta
contractVersion: 12
appliesTo: [arc42, domain, tech, design, ai]
breaking: yes
```

## What

The stack-config overlay has two layers, both under the user's devbook config directory —
`config.local.json` for every repository and `repos/<id>/config.local.json` for the one whose
committed `id` that is — and no longer a gitignored `.devbook/config.local.json` in the
checkout. `AGENTS.local.md` follows the same rule: the config directory or `repos/<id>/`,
never `.devbook/`. With nothing personal ever written into a repository, the `.gitignore`
block devbook materialized between `# devbook:begin` and `# devbook:end` has nothing to
ignore, and the `.gitignore#devbook` entry under `materialized` in the stamp names an asset
that no longer ships.

This migration removes the block from `.gitignore` while it still hashes to the text devbook
shipped, drops the stamp entry, and moves a checkout-layer `config.local.json` or
`AGENTS.local.md` found under `.devbook/` to `repos/<id>/` under the config directory where
no file is there yet.

## Why

The checkout layer was the overlay's first layer and the reason the user layers were added: a
gitignored file is absent in a fresh worktree, so a session there ran at the team's defaults
without saying so. Once both user layers existed every personal setting had a home outside
every clone, and a layer inside one only kept the reason to ignore files alive. The decision
is `.devbook/arc42/adr/configuration.md` in the marketplace.

## What breaks

`.devbook/config.local.json` is no longer read by the delivery checker or by any flow; a
setting left there is silently not applied until it moves. A reconcile does not know the
`.gitignore#devbook` asset and reports its stamp entry as an orphan until this migration
drops it.

A `.gitignore` whose block no longer hashes to the shipped text is customized: reported and
left alone, and the block is yours to remove. A checkout-layer file whose target under
`repos/<id>/` already exists is not moved: `--check` keeps exiting `1` and names both paths,
and merging them is a reading, not a script. A repository whose committed config carries no
`id` has no `repos/<id>/` to move to; the file is reported and `--check` exits `1` until it
is moved by hand or the repository chooses an `id`.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when the repository is clean; it writes
nothing, and it is what CI and the plan phase of `devbook:update` call. Drop the flag to
apply. Running it twice changes nothing. Both forms take `--root <path>`, defaulting to the
working directory, and read the config directory from `XDG_CONFIG_HOME`, else `APPDATA` on
Windows and `~/.config` elsewhere — the same rule the checker uses.

## What the script does, and does not

It removes the `.gitignore` block, and the one blank line before it, only when the text
between its markers is byte-for-byte what a release shipped; a `.gitignore` left empty is
deleted. It deletes the `materialized[".gitignore#devbook"]` entry from `components.devbook`
in `.devbook/config.json` and changes nothing else in that file: `contractVersion` and the
ledger are the reconcile's to write. It moves `.devbook/config.local.json` and
`.devbook/AGENTS.local.md` to `<config dir>/repos/<id>/` when the target is absent, creating
the folder. It does not merge a moved overlay with one already there, and it does not edit
`AGENTS.md` — the rendered section is re-rendered by the reconcile that runs this.
