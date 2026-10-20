# 032 — journeys move into the context's scenarios.md

```meta
contractVersion: 32
appliesTo: [domain]
breaking: yes
```

## What

Before contract 32 a journey was a page of its own: a `domain/` file typed `scenario` on its
`#` block, its `##` headings the parts, its file name the stem every tool knew it by. From 32 a
journey is a `##` chapter typed `scenario` in its bounded context's `scenarios.md` — or a split
`scenarios.<name>.md` — with its `###` headings the parts. A whole file typed `scenario` is an
error.

For every such page in a bounded context, this migration appends the page to the context's
`scenarios.md` as one journey, creating the file where it is missing, and removes the page:

| From | To |
| --- | --- |
| `# <Title>` and its block | `## <Title>` with the same block; a relative reference that resolved from a nested page's folder is rebased to the context's |
| Every heading below | One level down: a part `##` becomes `###` |
| `Proved by: <page>.md#<part>`, by stem, path, or repository path | `Proved by: <scenarios file>#<part>`, written from the requirement's folder, or as a repository path where the old line was one |
| A `related`, `depends-on`, or other reference entry, or a prose link, naming the page | The journey's address, `<scenarios file>#<journey>`, or the part it named |
| `![…](scenario:<stem>#<label>)` | `![…](scenario:<context>/scenarios.md#<label>)` |
| A demo walkthrough's `part` naming the page | `<scenarios file>#<part>`, from the demo's folder |
| `.devbook/scenarios/<stem>/` | `<context>/scenarios/<journey>/`, its `run.json` rewritten to version 3 with `journey` in place of `page` |
| A spec's `// scenario: <page>` | `// scenario: <scenarios file>#<journey>` |

The journey's signature is the page's: the canonical text reads the same setup fields, parts,
steps, and labels, so every spec's `// signature:` line and every demo's linked `signature`
stay current. `profiles.json` and `data/` stay in `.devbook/scenarios/`.

A page is left where it is, and each run lists it `not-applicable` with the reason, when:

- it sits directly under `.devbook/domain/`, in no bounded context;
- the context's `scenarios.md` already holds its journey's anchor, one of its parts' anchors,
  or one of its screenshot labels — anchors and labels are unique in a scenarios file.

Retitle or rename on one side, or move the page into a context, and run the migration again.
A listed page is never work left. A delta in an open change that still adds a journey page is
not rewritten: rewrite it as a delta of `scenarios.md` by hand.

## Why

A journey proves requirements, so it belongs with them and is addressed like any other
chapter: any number of features and requirements point at it through `related`, and its runs
sit beside the file it is written in. The record is `.devbook/arc42/adr/chapter-schema.md` in
the marketplace.

## What breaks

Every reference to an old page, until this runs. A spec whose header still names a page reads
as `spec-without-journey`, and a run folder under `.devbook/scenarios/<stem>/` is no longer
read. After the run, `_meta/scenarios.json` is schema version 2, listing journeys by address
instead of pages by stem; a reader pinned to version 1 needs updating.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while any journey page can be folded, and `0` once each is folded or listed
`not-applicable`, or `domain` is not adopted; it writes nothing. Drop the flag to apply.
Running it twice changes nothing. Both forms take `--root <path>`, defaulting to the working
directory, and `--scenario-folder <dir>`, defaulting to `.devbook/scenarios`, where the old run
folders are.
