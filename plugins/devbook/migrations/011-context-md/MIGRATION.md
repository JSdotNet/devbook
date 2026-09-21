# 011 — a bounded context opens with `context.md`

```meta
contractVersion: 11
appliesTo: [domain]
breaking: yes
```

## What

Every bounded context has a `context.md`, its root document: the boundary
prose — what the context is responsible for, inside, outside — followed by the
chapters that describe the context as a whole rather than its model. Two of
those are new chapter types: a `feature-flag`, a switch decided at release
from configuration, and a `setting`, a value a person chooses at runtime —
whether it turns a capability on or shapes it — each carrying `key` as the
code spells it. The
actor chapters and the dependency tables live there too until they outgrow it.

With the catalog inside the repository, a feature's `feature-flag` field
changes shape: a `<path>#<slug>` reference to the switch's chapter instead of a
bare application key, beside a new `setting` field of the same shape. Both
resolve, produce an edge — `gated-by` for a flag, `configured-by` for a
setting — and are held to the target's type.

This migration writes each context's `context.md` from the boundary prose its
`domain.md` opened with, hands `index: root` from `domain.md` to the new file,
and turns every bare `feature-flag` key into a `feature-flag` chapter in
`context.md` plus a reference to it.

## Why

A flag could be named from a feature but never described: no owner, no
default, no retirement, and two features could spell one key two ways with
nothing to report it. A setting a user chooses had no place at all. Both are
context-scoped, named in the ubiquitous language, and made addressable by a
plain identifier — what `role` already is for an actor — so they belong in
`domain/`, on the file that holds what the context is before what it models.
That file also takes the small chapters that each cost a file of their own, so
a context's outline shrinks to what a reader opens. The decision is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

A bounded context with no `context.md` has no root document by convention, and
a `domain.md` still declaring `index: root` beside one is a second root. A
`feature-flag` field holding a bare key is an error naming this migration, and
one holding a reference to anything but a `feature-flag` chapter is an error on
the gate path.

A context that already has a `context.md` is untouched — the script keys on the
file's existence, not on its `type` — and so is a feature whose `feature-flag`
entries are all references.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when the repository is clean; it
writes nothing, and it is what CI and the plan phase of `devbook:install` call.
Drop the flag to apply. Running it twice changes nothing. Both forms take
`--root <path>`, defaulting to the working directory.

## What the script does, and does not

For every `<context>/` under the domain folder without a `context.md` whose
`domain.md` carries a file-level `meta` block, it writes one: the context's title from `domain.md`, a file-level block with
`index: root`, `type: context`, and the `status` `domain.md` declared, then
the paragraphs `domain.md` had between its block and its first `##` chapter —
the boundary prose — leaving any leading blockquote behind, since that
describes `domain.md` itself. It removes `index: root` from `domain.md`'s
block, and moves nothing else out of it.

For every bare key in a `feature-flag` field of `features.md` or `skills.md`,
it appends a `## <key>` chapter to the context's `context.md` — `status:
draft`, `type: feature-flag`, `key: <key>`, `related` pointing at the feature
— once per distinct key, and rewrites the field entry to that chapter's
address. The heading is the key because the script cannot know the switch's
name in business language; rename it, through the folder's flow, when the
context is next open, and the reference with it.

It does not fold `actors.md` or `dependencies.md` into `context.md`. A context
that keeps either file is still valid — a kind lives in its own file or in
`context.md`, never both — and whether a context is small enough to fold is a
reading, not a rewrite. It writes no `setting` chapter: a setting is captured
from code, with `sync-specs` and the `setting` kind, never invented.
