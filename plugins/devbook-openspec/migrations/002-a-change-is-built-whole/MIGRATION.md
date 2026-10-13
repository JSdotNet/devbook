# 002 — a change is built whole, from 1.25.0

```meta
appliesTo: [changes]
breaking: yes
```

## What

A change is built on one branch, `change/<name>`, and opens one pull request. The repository
no longer chooses a git workflow, and a step no longer records a branch or a pull request:

| Before | After |
| --- | --- |
| `components.openspec.workflow` | gone |
| `Workflow: single-branch` or `Workflow: proposal-first` under an open proposal's title | gone |
| `branch:` and `PR:` lines under a step in an open `tasks.md` | gone |
| `- Tick the step's tasks in the step's own pull request.` under `operations.apply.guidance` in `openspec/config.yaml` | `- Build the change whole unless the caller names one step, and tick a step's tasks in the commit that completes them.` |
| that file's stamped hash, when the file was still as it landed | the hash of the rewritten file |

The script touches only those lines, and never a change under `openspec/changes/archive/`. A
config edited since it landed keeps its stamped hash, so it still reads as the repository's.
In the stamp it rewrites only the `components.openspec` entry.

## Why

Whether a change lands as one pull request or several is decided per case, by whoever plans
the work — a person, or a planning tool such as Backlog's plan with one item per session — and
a repository-wide default chose it for every change ahead of time. The record is
`.devbook/arc42/adr/flow-engine.md` in the marketplace, under its 2026-10-13 history row.

## What breaks

Nothing fails loudly. Until this runs, `openspec/config.yaml` tells `/opsx:apply` to tick each
step in its own pull request while the schema says to build the change whole, and a
`proposal-first` repository's tracker lines name branches the engine no longer cuts. A change
already in flight under `proposal-first` keeps its `step/` and `archive/` branches: the script
reports it and leaves them alone — finish or fold them by hand.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when nothing is left; it writes nothing. Drop
the flag to apply. Running it twice changes nothing. Both forms take `--root <path>`,
defaulting to the working directory. `devbook-openspec:update` runs it before it detects.
