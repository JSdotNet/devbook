# 013 — the decision rungs are `domain/`'s

```meta
contractVersion: 13
appliesTo: [arc42, tech, design, ai]
breaking: yes
```

## What

`approved` and `accepted` are rungs on `domain/`'s ladder and on no other, and their six
record fields — `approved-by`, `approved-at`, `approved-hash`, `accepted-by`, `accepted-at`,
`accepted-hash` — are `domain/`'s vocabulary with them.

This migration finds every chapter and file block **outside** `.devbook/domain/` that states
`status: approved` or `status: accepted`, or carries any of the six fields, and takes the
record off:

- In `arc42/` and `design/`, whose resting value is `active`, the `status` line is deleted.
  Absence is how those folders write `active`, so the chapter lands back at rest.
- In `tech/` and `ai/`, where `status` is a required rating with no resting value, the
  original rating was overwritten when the rung was written and **cannot be recovered**. The
  migration does not invent one: it deletes the six fields, leaves `status` in place, and
  reports the chapter so a person rates it. `--check` keeps exiting `1` until they do.
- The six fields are deleted wherever they appear outside `domain/`, in every folder.

Inside `.devbook/domain/` nothing is touched.

## Why

The two rungs record that a person agreed the model, and then that what was built satisfies
it. That question is asked of the domain model; an `arc42/` chapter records a standing
structure and a `tech/` or `ai/` chapter rates a technology or a way of working with one, and
a decision rung stacked on those put two unrelated statements in one field. The rung shipped
on all five ladders from contract 6 because it was cheaper to add it once than to decide where
it belonged; deciding is this change. The record is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

A chapter outside `domain/` holding `status: approved` no longer validates — the value is off
its folder's ladder — and the six fields are reported as unrecognized for that folder. Both
are errors from the checker on the first run after the upgrade, so a repository that used the
rung outside `domain/` fails its check until this migration runs.

For `tech/` and `ai/` the repair is not fully mechanical. The rating the chapter had before it
was approved is not in the file, so no script can restore it; the migration says which
chapters need one and stops short of guessing. A repository that never wrote the rung outside
`domain/` — which is every repository that only ever approved model chapters — sees
`nothing to do`.

## How to verify

```bash
node migrate.mjs --check
```

Exits `0` when no block outside `domain/` states either rung or carries any of the six fields,
and `1` while any remains, naming each one.
