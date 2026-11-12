# 038 — the scenario runner becomes the repository's own

```meta
contractVersion: 38
appliesTo: [domain]
breaking: no
```

## What

devbook 1.37.0 stops shipping the scenario runner. `.devbook/_tools/scenarios/` loses
`setup.ts`, and `setup.mjs` keeps only what the reporter reads: the effective configuration,
not the setup hook's call order. devbook now points at a journey's spec and leaves running it
to the repository.

This migration moves the runner a repository's specs import into the repository:

| Before | After |
| --- | --- |
| `import { scenario, shot } from '…/.devbook/_tools/scenarios/setup'` | `import { scenario, shot } from '…/scenario-runner/setup'` |
| `.devbook/_tools/scenarios/setup.ts`, `setup.mjs` | `<folder>/scenario-runner/setup.ts`, `setup.mjs`, `package.json` |

`<folder>` is the deepest folder holding every file that imports the runner, or the one `--to`
names. The moved runner is the repository's own copy, customizations included, with its
imports of `parse.mjs`, `playwright.mjs`, and `shot` pointed back at
`.devbook/_tools/scenarios/`, which still ships them. The runner devbook last shipped, frozen in
`runner/` beside this script, is moved instead when the repository's copy imports a name those
tools no longer export, as a runner from before contract 32 does, or when the reconcile has
already replaced the folder. Each moved file opens with a two-line comment saying where it came from.

It writes nothing else. `scenarioHook` and `scenarioFolder` in the Playwright config keep
working, because the moved runner still declares them.

## Why

The runner gave every journey spec the same structure: one `test.describe.serial` group per
journey and one test per part. That structure belongs to the repository's suite, not to
devbook. The record is `.devbook/arc42/adr/journey-specs.md` in the marketplace. Reconcile
never deletes, and replaces `.devbook/_tools/scenarios/` whole, so without this migration a
spec would import a runner that no longer exists.

## What breaks

Nothing. Every spec runs as before, against the moved copy. From here the repository may change
the runner, or drop it and write its specs another way. The spec header, the part titles, the
`shot()` labels, and the reporter in the Playwright config are what devbook still reads.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while any source file imports `.devbook/_tools/scenarios/setup`, and `0`
when none does or `domain` is not adopted; it writes nothing. Drop the flag to apply. Running
it twice changes nothing. It skips `node_modules`, build output, and a nested checkout.

It stops with exit `2` and writes nothing when a file already sits where the runner would go,
or when a customized runner imports a module beside it that this migration cannot point back.
Pass `--to <folder>` for the first; move the runner by hand for the second. Every form takes
`--root <path>`, defaulting to the working directory.
