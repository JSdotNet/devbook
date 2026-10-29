# 038 — workflow state leaves the chapter

```meta
contractVersion: 38
appliesTo: [domain, arc42, tech, design, ai]
breaking: yes
```

## What

Contract 38 takes workflow state out of the `meta` block. This migration rewrites every `meta`
block in the adopted folders, and in every open change under `openspec/changes/<name>/` —
`proposal.md` and each file under `devbook-delta/`, never `archive/`:

| Field | What happens |
| --- | --- |
| `status` in `domain/`, `arc42/`, `design/`, a journey, a decision record, a debt record, a `proposal.md` | Deleted |
| `approved-by`, `approved-at`, `approved-hash`, `accepted-by`, `accepted-at`, `accepted-hash` | Deleted |
| `sync`, `issue`, `effort`, `roadmap`, `change` | Deleted |
| `status` in `tech/` and `ai/`, and in a delta landing there | Renamed `rating`, value and line kept |

A block that already carries `rating` loses its `status`, and the report names the two when
they differ. A delta's first block is its header and keeps its `change` and `delta`. Only lines
inside a `meta` fence are read, so a sample in a `text` fence is left alone. `annotation`
fences, `ext.*` keys, every other field, and an empty `meta` fence stay as they are.

It writes no export file. For each block it prints what it took off, value included:

```text
- took off .devbook/arc42/adr/x.md:3 (X): status proposed, sync pull
```

Where `.devbook/statuses.json` exists, it says the check no longer reads it and leaves it in
place.

It also deletes the checker files contract 38 retired, where they are still vendored under
`.devbook/_tools/devbook-meta/`: `statuses.mjs`, `statuses.test.mjs`, `accepted-rung.test.mjs`,
`status-optional.test.mjs`, and `sync-field.test.mjs`. Reconcile never deletes a copy, and the
three tests import what `metadata.mjs` no longer exports.

## Before you run it

Run each host's import first — Backlog, spec-manager — against the default branch. Each reads
the current state and the open notes from the Markdown with its own parser. Once this runs,
the values it strips exist only in git history. Delete `.devbook/statuses.json` once the hosts
have imported its ladders.

A change's fingerprint covers its proposal and every delta, `meta` blocks included, so an open
change this migration rewrites fingerprints anew. An approval or acceptance a host imported at
the old fingerprint no longer matches, and `delta.mjs --apply` refuses it until the change is
decided again. The report names each such change.

## Why

A branch's devbook is true of its code. Workflow state is about a review, not the content, and
committed it put a branch ahead of or behind its own decisions. It now exists for three
subjects — a change proposal, a decision record under discussion, a debt record — and the tool
that runs the workflow keeps it, answering `devbook.decision@1`
(`plugins/devbook/resources/decision.md`). An ordinary chapter is in force once merged, and one
that should no longer be followed is removed by a change's `REMOVED` delta rather than marked
`deprecated`. The direction a sweep levels a unit is Backlog's, the tracker keeps its own
reference to a chapter, an estimate belongs to a proposal's tasks, and `roadmap` and `change`
are dropped. The rating is renamed so `status` no longer means two things. The hosts import
from the default branch, so an export file would be a second format for a single run. The
record is `.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

The checker reports each moved field as an error naming this migration, and a `status` in
`tech/` or `ai/` as renamed `rating`. After the run none is left. `delta.mjs --apply` no longer
reads a decision from `proposal.md` and stamps no `change`: the caller reads the acceptance from
the host and passes the fingerprint it was recorded at as `--accepted-hash`, and the merge
refuses unless it is the change's fingerprint now. `units.mjs` no longer takes `--direction`.

## How to verify

```bash
node migrate.mjs --check
```

Exits `0` when no block carries a moved field or a `tech/` or `ai/` `status` and no retired
checker file is left, and `1` while any remains, listing each. Drop the flag to apply; a second run changes nothing. Both forms
take `--root <path>`, defaulting to the working directory.
