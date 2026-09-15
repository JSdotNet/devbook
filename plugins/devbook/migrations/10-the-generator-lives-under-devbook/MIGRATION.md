# 10 — the generator lives under `.devbook/tools/`

```meta
contractVersion: 10
appliesTo: [arc42, domain, tech, design, ai]
breaking: yes
```

## What

The generator devbook materializes moves from `.github/tools/devbook-meta/` to
`.devbook/tools/devbook-meta/`, and the package scanners from
`.github/tools/devbook-tech/` to `.devbook/tools/devbook-tech/`. Every file the
install wrote that names the old path — the two workflows, the refresh script,
the `AGENTS.md` section — is rewritten to the new one, and so are the stamp keys
under `components.devbook.materialized`. Derived artifacts stamp the new path as
`generatedBy` on their next refresh.

## Why

`.github/` is one host's folder, and the generator is plain Node with no host in
it. `.devbook/` already holds the stack config and the stamp, and is present in
both layouts. The decision is
`.devbook/arc42/adr/68-the-generator-lives-under-devbook.md` in the marketplace.

## What breaks

Nothing reads the old path any more, and there is no fallback. Until this runs:

1. Every skill and flow that runs `node .devbook/tools/devbook-meta/build.mjs --check`
   reports the generator as missing, and the repository as never checked.
2. `devbook-meta.yml` still runs the old path in CI, so the check keeps passing
   against a copy no reconcile refreshes: the copy under `.github/tools/` hashes to
   a 1.0.0 release and is an orphan from 1.1.0 on, reported and never replaced.
3. `build/Update-DevbookIndex.ps1` throws on its generator lookup.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when the repository is clean; it
writes nothing, and it is what CI and the plan phase of `devbook:install` call.
Drop the flag to apply. Running it twice changes nothing. Both forms take
`--root <path>`, defaulting to the working directory.

## What the script does, and does not

It moves each tool folder whole, creating `.devbook/tools/` as needed, and
replaces the old path with the new one in the five files the install owns. It
touches no other file: a repository that named the path somewhere of its own
gets the list of what moved and finishes by hand.

It refuses rather than guesses when a tool folder exists at both paths and the
two differ: one of them was edited, and picking one would discard the edit.
Identical, it deletes the old one.
