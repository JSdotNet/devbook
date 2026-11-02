# 002 — three schedules leave the catalog, from 1.32.0

```meta
appliesTo: [delivery-schedule]
breaking: no
```

## What

Three catalog entries are retired, and their targets with them:

| Schedule | Target | Where it went |
| --- | --- | --- |
| `devbook-pull-sweep` | `schedule-devbook-sweep`, `direction: pull` | Backlog's `backlog-tools:devbook-sweep`, one local routine per repository |
| `devbook-push-sweep` | `schedule-devbook-sweep`, `direction: push` | The same routine |
| `morning-brief` | `schedule-morning-brief` | Removed |

`schedule-week-starter`, `schedule-weekly-cost-analysis`, and `schedule-review` leave as well.
No catalog entry named them, so no selection can.

A repository that selected a retired schedule still lists it under `components.schedule`, and
its routine still fires a skill that is gone. `delivery-schedule:update` drops the name from
`enabled` and `overrides` in its step 1, disables the routine in its step 6 by the title the
contract's *Retired Schedules* keeps, and writes the stamp without it in step 7. A retired name
is never a failure, and wins over `001-weekend-cadence`'s re-time of `morning-brief`.
`migrate.mjs --check` exits `1` while `enabled` or `overrides` names one, and prints what
`update` drops. Without `--check` it prints the same plan and writes nothing: the stamp has
one writer.

## Why

The sweeps need a direction per sync unit, and since contract 38 no chapter states one. The
tool that keeps the direction runs the sweep. A morning brief reads best across every
repository at once, which one repository's routine cannot do. The decision is
`.devbook/arc42/adr/chapter-schema.md`, under *Schedules and sync*.

## What breaks

Nothing in the repository. A machine that never runs `update` again keeps a routine that fires
a missing skill and stops at the preamble's rule 2. Deleting a disabled routine is done on the
host's own page.
