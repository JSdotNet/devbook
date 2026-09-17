# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## 1.1.0: `naming.md` is gone

`naming` is no longer a `.domain` file type and `naming.md` no longer a file the folder
knows. A term that is already a chapter carries its surface names in that chapter's
`aliases` field; only a word with no chapter is a `term` chapter, under `domain.md`'s
`## Ubiquitous Language` grouping. Contract version moves to 10, and
`migrations/010-terms-live-in-domain-md/` folds a `naming.md` a repository still carries
into `domain.md` and rewrites every reference into it — `devbook:install` runs it. A
repository whose contexts already keep their terms in `domain.md` records the id and
nothing moves. The decision is `.devbook/arc42/adr/77-a-term-is-a-chapter-or-an-alias.md`.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
