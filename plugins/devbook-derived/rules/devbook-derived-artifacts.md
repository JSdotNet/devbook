---
name: devbook-derived-artifacts
description: Convention for derived index artifacts — where generated, machine-readable views of canonical Markdown live, how they are named, what every such file must declare, how CI and scheduled refresh keep them current, and how a consumer reads one without going stale.
---

# Derived metadata artifacts (`_meta/`)

Devbook folders keep **Markdown canonical and derived data generated**.
Generated, machine-readable views of that Markdown — graphs, outlines, rollups
— are *derived metadata artifacts*, and they all follow one convention so a new
one can be added anywhere without inventing placement or naming rules again.

This convention is deliberately generic: it applies to any current or future
generated artifact, not just the reference graph.

## Location

A derived artifact lives in an `_meta/` subfolder **of the thing it
describes**:

```
.devbook/tech/_meta/graph.json     # derived from .tech only
.devbook/domain/_meta/graph.json   # derived from .domain only
.devbook/_meta/graph.json          # rollup: spans multiple source folders
```

- **Scoped artifact** — derived from exactly one folder: it belongs in that
  folder's own `_meta/`. Co-locating it means the folder stays
  self-contained, and moving or removing the folder takes its derived data
  with it.
- **Cross-cutting artifact** — derived from two or more source folders: it
  belongs in `.devbook/_meta/`, beside the folders it spans. Nothing derived
  ever lands at the repository root.

Never nest `_meta/` deeper than one level below its scope, and never put a
derived artifact anywhere other than an `_meta/` folder.

The underscore prefix marks the folder as tooling machinery rather than
readable content — see `devbook-naming.md`.

## File naming

```
<artifact>.<format>
```

- **`<artifact>`** — kebab-case, describing *what the artifact is*, not what
  produced it or what it covers. The enclosing folder already states the
  scope, so `.devbook/tech/_meta/graph.json` — not `tech-graph.json`.
- **`<format>`** — the real file extension (`json`, `ndjson`, `csv`).
- Files inside `_meta/` are **not** underscore-prefixed again; the folder
  already carries that signal.
- Use the same `<artifact>` name for the same kind of artifact in every scope,
  so tooling can glob `**/_meta/graph.json` across scopes.

## Required envelope

Every derived JSON artifact carries the same top-level envelope before its
payload:

```jsonc
{
  "schemaVersion": 1,
  "generatedBy": ".devbook/_tools/devbook-meta/build.mjs",
  "scope": ".tech",
  "sources": [".tech"]
  // ...artifact-specific payload
}
```

- **schemaVersion** (required) — integer, incremented whenever the payload
  shape changes, so consumers can detect drift.
- **generatedBy** (required) — repo-relative path to the generator, so anyone
  finding the file knows how to regenerate it. A generator resolves its own
  location against the repository root rather than hardcoding one, because a
  repository that vendors it somewhere other than `.devbook/_tools/` would
  otherwise stamp a path that resolves to nothing. Where the generator sits
  outside the repository it is indexing — a plugin install, or `--root` — it
  falls back to the conventional location: an absolute path would break
  determinism, and a `../..` climb out of the repository is not repo-relative.
- **scope** (required) — the folder this artifact describes, or `"."` for a
  repository-wide artifact.
- **sources** (required) — the folders actually read to produce it.

## Rules

- **Derived artifacts are generated, never hand-edited.** Treat any manual edit
  as a bug; the generator is the only writer.
- **Committed to source control.** They are checked in so they can be read
  without a build step, reviewed in diffs, and consumed by tooling that has no
  Node.js available.
- **Deterministic output.** No timestamps, no random ordering, no absolute
  paths. Running the generator twice on unchanged input must produce a
  byte-identical file, so CI can diff the committed artifact to detect
  staleness.
- **One generator, one artifact per scope.** A generator that produces several
  scopes writes each to its own `_meta/`; it does not merge them into one
  file.
- **CI blocks on source errors, warns on staleness.** Every derived artifact
  needs a workflow, and that workflow fails on anything wrong in the *authored*
  Markdown — an unresolvable reference, a block that violates the schema — because
  those are real errors that do not fix themselves. It also regenerates the
  artifact and compares it against the committed copy, but reports a difference
  as a warning. Making every pull request carry a regenerated artifact is what
  turns derived files into merge conflicts: two branches that each edit one
  chapter both rewrite the same index, and the only way to resolve the JSON is
  to re-run the generator — busywork on a file whose only correct content is
  whatever the generator emits.
- **Refresh is deliberate.** Because CI no longer forces it, a repository owes
  contributors two ways to refresh: an on-demand command for anyone who wants
  the indexes current in their own branch, and a scheduled job that reconciles
  the default branch by opening a single pull request when the output drifted,
  and doing nothing when it did not. Never regenerate on every devbook edit.
- **Consumers re-check what they read.** A consumer that reads a derived
  artifact at runtime compares each entry's source file against the artifact
  itself and re-reads the entries that are newer, rather than trusting the
  artifact wholesale. One `stat` per entry, not a re-parse of the corpus. This
  is what makes a warning-only freshness check safe: an edit made between
  refreshes is never displayed stale.
- **Generators live in `.devbook/_tools/<tool-name>/`** with a `README.md`
  documenting usage and output shape. That is devbook's own folder, beside the
  stack config: a generator is plain Node with no host in it, and `.github/` is
  one host's folder.

## Adding a new derived artifact

1. Decide the scope: one folder (scoped) or several (the `.devbook/_meta/` rollup).
2. Add the generator under `.devbook/_tools/<tool-name>/`, with a README.
3. Emit the required envelope and keep the output deterministic.
4. Write it to `<scope>/_meta/<artifact>.<format>`.
5. Add a CI workflow that runs the generator's validation and fails on it, and
   that regenerates-and-diffs the artifact but only warns when it differs.
6. Wire it into both refresh paths: the on-demand command a contributor runs in
   their branch, and the scheduled job that reconciles the default branch.
7. Reference it from the instructions file of the folder it describes.

## Consuming a derived artifact

A derived artifact used to be a convenience for tooling. Once something reads
one at runtime — an app drawing a panel, a viewer listing a folder — it becomes
load-bearing, and the freshness rules above only hold up if the consumer holds
up its end.

**Read the index, then verify each entry against its source.** For every entry
the consumer is about to present, compare the modification time of the entry's
`path` against that of the artifact file. When the source is newer, re-read
that one source and use what it says; when it is not, trust the entry.

```text
for each entry in artifact.entries:
    if mtime(entry.path) > mtime(artifact):
        re-read entry.path      # this one drifted
    else:
        use entry               # index is authoritative
```

- **One `stat` per entry, never a re-parse.** The point of the index is to
  avoid opening every source document. A staleness check that reads the files
  it is checking has given that back.
- **Re-read the drifted entries only.** A single edited chapter must not force
  a full rebuild; the whole design is that the common case touches nothing.
- **Fail soft on a missing or unreadable artifact.** A repository that has
  never run the generator, or a scope it does not adopt, is a normal state —
  fall back to reading the sources rather than erroring.
- **Compare strictly newer.** A fresh clone stamps sources and artifact with
  the same checkout time; treating a tie as stale re-reads the entire corpus on
  first launch for no gain.

Also honour `schemaVersion`: a consumer that does not recognise the value must
fall back to the sources rather than guess at the payload shape.

## Devbook artifacts

The devbook-meta generator produces these, one set per devbook folder the
repository actually adopts, plus a repository-wide rollup:

| Path | Scope | Contents | Generator |
|---|---|---|---|
| `.devbook/_meta/graph.json` | repository-wide | reference graph | `.devbook/_tools/devbook-meta/build.mjs` |
| `.devbook/_meta/index.json` | repository-wide | ordered reading outline | same |
| `.devbook/_meta/annotations.json` | repository-wide | open notes, from the `annotation` fences | same |
| `.devbook/arc42/_meta/*.json` | `.arc42` | all three of the above, scoped | same |
| `.devbook/domain/_meta/*.json` | `.domain` | all three of the above, scoped | same |
| `.devbook/tech/_meta/*.json` | `.tech` | all three of the above, scoped | same |
| `.devbook/design/_meta/*.json` | `.design` | all three of the above, scoped | same |
| `.devbook/ai/_meta/*.json` | `.ai` | all three of the above, scoped | same |

`annotations.json` is derived like the other two: the notes themselves are
authored Markdown in the chapters, so deleting this file loses nothing. Write a
note with `annotations.mjs`, never into this index.

`index.json` carries the **reading order** of an area, which a viewer uses
instead of sorting filenames alphabetically. It is generated from the folder
convention — each directory's root document first, then the sequence that
folder's instructions file documents — plus what a document says about itself:
its `number`, and whether its `index` field makes it the directory's entry point
or keeps it out of the outline. No document declares the order of its siblings.
See `devbook-chapter-metadata.md`.
