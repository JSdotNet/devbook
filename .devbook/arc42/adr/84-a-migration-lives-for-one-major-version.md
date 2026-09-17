# 84. A Migration Lives for One Major Version

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/adr/83-a-term-is-a-chapter-or-an-alias.md", ".devbook/arc42/adr/56-payload-only-components-carry-no-contract-version.md", ".devbook/domain/plugin-authoring/domain.md#migration", ".devbook/domain/devbook/domain.md#reconciler"]
```

A migration folder ships in a minor release and lives until the next major. A major release
raises `MINIMUM_CONTRACT_VERSION` in `tools/devbook-meta/graph.mjs` to the contract the previous
major last reached and deletes every `migrations/` folder at or below it. A reconcile whose stamp
sits below the floor stops in phase 1 and says to upgrade through the previous major's last
release first; it never runs the migrations it still has over the gap. Ledger ids are still never
rewritten or removed: an entry outlives its folder, and the floor is what makes the missing
folder harmless rather than a hole.

The question was where migrations should live so that `devbook` stops growing by one folder per
breaking change forever. Three moves were on the table and none of them is the answer:

**A separate plugin saves nothing.** Every plugin in this marketplace is a folder of the same git
checkout, so `devbook-migrations` would sit on every machine `devbook` sits on, byte for byte.
And a migration is written against one exact contract version of the generator beside it, so
the two plugins would have to release together every time — the coupling
[record 44](44-one-plugin-one-bounded-context.md) exists to keep out of the marketplace.

**One script instead of one folder per change is the same lines in one file**, minus the
`MIGRATION.md` that says what breaks. Nothing loads `migrations/` into a session — only
`devbook:install` phase 4 and `devbook-check` step 4 execute it — so the folder costs no
context, and a body budget is not what it strains.

**Fetching migrations on demand from a tag** adds a network dependency to an operation that
otherwise works from the checkout, to save disk that the checkout already spent.

What grows without bound is not the folder but the promise: every shipped migration must keep
working against every intermediate repository state, forever. That is the thing to cap, and
[record 64](64-1-0-0-is-the-first-release.md) already capped it once, dropping `006`, `008`, and
`009` because no repository was in the states they moved between. This record makes that
one-off the rule, on the schedule every migration framework a consumer already knows uses: a
Django, Rails, or EF Core project skipping a major passes through the last release before it.

Consequence: **a contract bump that ships its migration is a minor release.** The upgrade is
automatic, so nothing a consumer does changes; the major is reserved for the release that raises
the floor, which is the one act that can strand a repository. Contract 10 and
`010-terms-live-in-domain-md` therefore ship in 1.1.0, not 2.0.0, and the three
`>=1.0.0 <2.0.0` dependency ranges hold.

Consequence: **the floor starts at 9**, where 1.0.0 shipped. Nothing published sits below it,
so the first refusal a consumer can meet is at 2.0.0, and only if it skipped every 1.x.

Consequence: **the window is one major's breaking changes**, and breaking changes are rare by
construction — the contract moves only for a schema shape, ten numbers over the whole history,
three of them ever shipped as folders. The folder is bounded; the promise is bounded; the
ledger is untouched.
