# 6. Flat Devbook Folders Only

```meta
date: 2026-09-03
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/adr/78-one-layout-under-devbook.md"]
```

The convention permits two layouts: five root-level dot-folders, or all five nested under one
`.devbook/` parent with the dots dropped. A repository picks one and never mixes them.

The generator understands only the flat one. `DEVBOOK_FOLDERS` lists `.arc42`, `.domain`,
`.tech`, `.design`, `.ai`, and every reference in the corpus is a path starting with one of
them, so a `.devbook/domain/…` address resolves to nothing.

**Closed, 2026-09-04, in `devbook` 1.2.0.** The fix was the one this decision named: the
folder resolution now recognizes both prefixes. `folderKindForPath` strips an optional
`.devbook/` and matches the five names either way, discovery probes both spellings and reports
which layout it found, and everything downstream works off the path it is handed — so scopes,
`_meta/` output paths, and references inside the generator needed no change. Contract version
7, additive, no migration. `nested-layout.test.mjs` holds the same corpus written both ways
and asserts the two produce the same nodes and the same edges.

It cost more than the prose suggested in exactly one place: a repository containing *both*
layouts. The generator now indexes both and raises an error saying addresses will not agree
until one is moved, rather than silently indexing half a corpus — which is what the old code
did to this repository, and why the gap went unnoticed.

What that gap actually hid is the argument for having closed it. The first real run over
`.devbook/` found eleven defects nothing had ever reported: two invalid `status` values, eight
missing `type` fields, and one `type` naming a kind the schema had no word for. A convention
that cannot check the repository that ships it will accumulate exactly that, and reading is not a
substitute — every one of those files had been read several times.

Amended 2026-09-09. Everything that spelled the five root dot-folders literally *outside*
the generator did need changing, and each was found on its own long after this was closed:
the instruction globs in `devbook` 1.3.1, which applied every folder rule to nothing on a
nested repository, and the CI path filter of `assets/workflows/devbook-meta.yml` in 3.1.1,
which left one with no gate at all. Both fail the same way, which is why both went
unnoticed — a glob matching nothing is indistinguishable from a quiet branch. What this
decision should carry forward is the list of places that still name a folder literally, not
the claim that the generator's own indifference to the layout settled it everywhere.

**Superseded on 2026-09-17 by [record 78](78-one-layout-under-devbook.md).** The list of
places that named a folder literally was the cost of two layouts; there is now one, under
`.devbook/`, and the flat spelling is reported as an error rather than indexed.
