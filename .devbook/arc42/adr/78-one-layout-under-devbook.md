# 78. One Layout, Under .devbook/

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/6-flat-devbook-folders-only.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/adr/68-the-generator-lives-under-devbook.md", ".devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md", ".devbook/domain/devbook/domain.md#devbook-folder", ".devbook/domain/devbook-derived/domain.md#index-generator"]
```

A devbook folder lives at `.devbook/<name>/` — `.devbook/arc42`, `.devbook/domain`,
`.devbook/tech`, `.devbook/design`, `.devbook/ai` — and nowhere else. The five root-level
dot-folders (`.arc42/` and its siblings) are no longer a layout: the generator reports one as
an error naming the move and does not index it, every rule glob and workflow filter carries the
one spelling, and the repository-wide rollup is written to `.devbook/_meta/`, beside the
folders it rolls up, rather than to a `_meta/` at the repository root.

**Two layouts cost more than they gave.** [Record 6](6-flat-devbook-folders-only.md) opened the
nested layout on 2026-09-04 and had to be amended twice before the week was out, each time for
a place that spelled the five folders literally and got one layout wrong — the instruction globs,
then the CI path filter — and each time the failure was invisible, because a glob that matches
nothing is indistinguishable from a quiet branch. Its own consequence asked the next reader to
carry forward the list of places that name a folder literally. That list is the cost: rule
globs in `rules.json`, the `<prefix>` in both workflow templates and the `AGENTS.md` section,
the session-start markers, scope names, the dashboard's path classifier, `devbook-config`'s
folder probe, and the outline's convention table — which, it turned out, had never matched a
nested path at all, so no nested repository ever had `shared.md` pinned first or `tooling.md`
last. One layout makes every one of those a single spelling and that class of defect
unwritable.

**`.devbook/` is where everything already was.** [Record 11](11-the-stack-config-lives-in-devbook.md)
put the stack config there, [record 68](68-the-generator-lives-under-devbook.md) the tooling,
and this repository its own chapters. The parent carries the "hidden support directory" signal
once; the five subfolders drop their dots, and the rollup drops its claim on the repository
root. A repository that adopts devbook gains one entry in its root listing, not six.

**The names stay.** A folder is still called `.domain` in every rule, chapter, and
conversation, because the name is the kind and the dot is what says "specification area".
Only the path changed. So a scope may still be spelled `--scope .tech`: `resolveScope` maps
`tech`, `.tech`, and `.devbook/tech` to the one scope the generator uses.

**Version and migration.** The contract version stays at 9: no authored chapter changes shape,
and a chapter's address was already its real path. A repository laid out flat is broken until
it moves five folders and rewrites every reference, which is exactly the case the migration
rule names — and no migration ships, on [record 64](64-1-0-0-is-the-first-release.md)'s rule
that the obligation starts at the first install. The generator's error message is the whole
migration until then. `UPGRADING.md` carries no entry.

Consequence: record 6 is superseded — not back to flat-only, but forward to nested-only, which
is the layout its amendment was struggling to keep in step. Every glob, filter, marker, and
probe that carried two spellings carries one. This repository moves its own root `_meta/` to
`.devbook/_meta/`.
