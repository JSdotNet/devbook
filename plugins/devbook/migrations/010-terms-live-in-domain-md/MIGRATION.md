# 010 — a term is a chapter or an alias

```meta
contractVersion: 10
appliesTo: [domain]
breaking: yes
```

## What

`naming.md` is no longer a `domain/` file kind, and `naming` is no longer a
file `type`. A bounded context keeps its vocabulary in `domain.md`: a term that
is already a chapter — an aggregate, an entity, a value object, an enum, a
domain service, a domain event, an actor — carries its surface names in that
chapter's `aliases` field, and only a term with no chapter to sit on is a
`term` chapter, under the `## Ubiquitous Language` grouping at the end of
`domain.md`.

This migration moves every `term` chapter a context still keeps in `naming.md`
under that grouping, creating the grouping where the context has none, deletes
the file, and rewrites every reference that pointed into it.

## Why

The ubiquitous language is the model. A registry that names what the model
already names is a second copy, and it goes stale on the side nobody reads —
which is what the merge behind record 45 found: twenty-eight of seventy-three
terms restated a chapter beside them. Record 45 made the file optional and
stopped using it; this finishes the move, so that resolving a term never has
to ask which of two layouts a context picked. The decision is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

A `domain/<context>/naming.md` fails validation: `naming` is not a file type
the generator knows, and the file sits outside the reading order. Every
`related` reference and Markdown link that resolved to
`.devbook/domain/<context>/naming.md#<term>` resolves to nothing until this runs.

A context that already keeps its terms in `domain.md` — every context in a
repository that adopted devbook at 1.0.0 or later, unless it wrote the file by
hand — is untouched.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when the repository is clean; it
writes nothing, and it is what CI and the plan phase of `devbook:update` call.
Drop the flag to apply. Running it twice changes nothing. Both forms take
`--root <path>`, defaulting to the working directory.

## What the script does, and does not

For every `<context>/naming.md` it finds, it takes each `##` chapter, demotes
it and every heading under it by one level, and appends them to the context's
`domain.md` — after the existing `## Ubiquitous Language` grouping when there
is one, or under a new grouping carrying `type: ubiquitous-language` when there
is not. The file's own title, file-level `meta` block, and leading blockquote
are dropped: the grouping already says what follows. It then deletes the file
and, in every Markdown file under every devbook folder, rewrites
`<context>/naming.md#<anchor>` to `<context>/domain.md#<anchor>` — in `meta`
references and in links alike — and a bare `naming.md#<anchor>` link inside
the context's own folder the same way.

It does not fold a term into the chapter it duplicates. Whether a term is a
restatement of an aggregate beside it is a reading, not a rewrite, and the
moved chapters are exactly as they were; fold them by hand, through the
folder's flow, when the context is next open.
