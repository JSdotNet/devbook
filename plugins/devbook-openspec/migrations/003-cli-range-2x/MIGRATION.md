# 003 — OpenSpec CLI 2.x, from 1.38.0

```meta
appliesTo: [changes]
breaking: no
```

## What

The default CLI range takes OpenSpec 2.x:

| Before | After |
| --- | --- |
| `components.openspec.cli` of `>=1.13.2 <2.0.0` | `>=1.13.2 <3.0.0` |

The script rewrites only that value, and only when it is still the old default. A range a
person gave `init` is theirs and stays as it is; widen it by hand when 2.x should pass.

## Why

OpenSpec 2.1.0 runs the whole change lane unchanged — `schema validate`, `new change`,
`status --json`, `validate`, and `archive --skip-specs` — so the old ceiling refused a CLI that
works. The run that settled it is the `devbook-openspec` building block's constraints in the
marketplace's devbook.

## What breaks

Without it, `devbook-openspec:update` and `devbook-config:doctor` refuse an installed 2.x CLI.
2.0 also removes OpenSpec's `/opsx:*` command files and installs skills only:
`openspec update .` deletes the commands and moves Copilot's skills to `.agents/skills/`. Invoke
the skills by name — `openspec-propose`, `openspec-apply-change`, and the rest.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when nothing is left; it writes nothing. Drop
the flag to apply. Running it twice changes nothing. Both forms take `--root <path>`,
defaulting to the working directory. `devbook-openspec:update` runs it before it checks the CLI.
