# 3. The devbook Asset Rename Ships No Migration

```meta
date: 2026-09-05
severity: medium
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/08-crosscutting-concepts.md#devbook-folder", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
c4: ["marketplace.devbook.reconciler"]
c4-touches: ["repository"]
```

**Owner:** the maintainer

## The debt

```meta
```

The `knowledge-` to `devbook-` rename of 2026-09-05 — the
[devbook folder](../08-crosscutting-concepts.md#devbook-folder) term says why —
renamed six materialized paths. Five of them are things `devbook-install` copies into a consuming
repository and records in the stamp:

| Old key in `materialized` | New key |
| --- | --- |
| `.github/tools/knowledge-meta` | `.github/tools/devbook-meta` |
| `.github/tools/knowledge-tech` | `.github/tools/devbook-tech` |
| `.github/workflows/knowledge-meta.yml` | `.github/workflows/devbook-meta.yml` |
| `.github/workflows/knowledge-meta-nightly.yml` | `.github/workflows/devbook-meta-nightly.yml` |
| `build/Update-KnowledgeIndex.ps1` | `build/Update-DevbookIndex.ps1` |

The nine `knowledge-*.instructions.md` files move the same way wherever a repository installs
instruction files.

No migration folder moves them. Reconcile detects a materialized path by its key, so an
already-adopted repository resolves every new key as *absent* and creates it, while the old
files stay on disk unmanaged and still referenced by the workflows and the wrapper script that
were installed with them.

## Origin

```meta
```

Taken knowingly in the rename itself. The migration id is `<contractVersion>-<slug>`, and
`CONTRACT_VERSION` is already 7 — shipped, additive, with no migration folder, which the
convention describes as normal. So this migration is `008-…` and carries a contract bump for a
change that alters no schema. Whether the ledger should move for an asset rename at all is a
question about the contract's meaning, not a mechanical step, and the rename was not allowed to
answer it.

**2026-09-08. The numbering above is spent.** `CONTRACT_VERSION` is 9, not 7:
`008-config-to-devbook` and `009-install-skill-ids` took both ids for other changes while
this record sat open. The migration it proposes is `010-devbook-names` at contract 10, and
the options table below has been renumbered to match. Nothing else about the debt moved.

**2026-09-17. Spent again.** `010-terms-live-in-domain-md` took contract 10 for
[the chapter schema record](../adr/chapter-schema.md). The proposal is `011-devbook-names`
at contract 11; the table below says so.

**2026-09-21. Spent a third time.** `011-context-md` took contract 11 the next day. The
proposal is `012-devbook-names` at contract 12; the table below says so.

**2026-09-22. Spent a fourth and fifth time.** `012-no-checkout-overlay` took contract 12,
and `013-decision-rungs-are-domains` took 13 for
[the chapter schema record](../adr/chapter-schema.md). The proposal is `014-devbook-names`
at contract 14; the table below says so. Four slots in five days is the debt itself: a rename
that waits for a free contract number never gets one, because every real schema change takes
the next.

**2026-09-23. Spent a sixth time.** `015-openspec-verbs` took contract 15 for the skill
renames in [the install record](../adr/install.md), after 14 shipped without a migration. The
proposal is `016-devbook-names` at contract 16; the table below says so.

**2026-09-24. Spent a seventh time.** Contract 16 went to a bounded context's `deployment`
field in [the chapter schema record](../adr/chapter-schema.md), with no migration. The
proposal is `017-devbook-names` at contract 17; the table below says so.

**2026-09-25. Spent an eighth and a ninth time.** `017-invariants-under-domain` took contract
17, and `018-behaviour-titles` took 18, both in
[the chapter schema record](../adr/chapter-schema.md). The proposal is `019-devbook-names` at
contract 19; the table below says so.

**2026-09-27. Spent a tenth time.** Contract 19 went to the shared groupings' invariants
pairing in [the chapter schema record](../adr/chapter-schema.md), with no migration. The
proposal is `020-devbook-names` at contract 20; the table below says so.

**2026-09-28. Spent an eleventh time.** Contract 20 went to a repository's own status ladder
in [the chapter schema record](../adr/chapter-schema.md), with no migration. The proposal is
`021-devbook-names` at contract 21; the table below says so.

**2026-09-28. Spent a twelfth time.** `021-no-review-triad` took contract 21 in
[the annotations record](../adr/annotations.md). The proposal is `022-devbook-names` at
contract 22; the table below says so.

**2026-09-28. Spent a thirteenth time.** Contract 22 went to `design/`'s `requirement` type in
[the chapter schema record](../adr/chapter-schema.md), with no migration. The proposal is
`023-devbook-names` at contract 23; the table below says so.

**2026-09-28. Spent a fourteenth time.** Contract 23 went to the change folder in
[the chapter schema record](../adr/chapter-schema.md), with no migration. The proposal is
`024-devbook-names` at contract 24; the table below says so.

**2026-09-28. Spent a fifteenth time.** Contract 24 went to the decision rungs on a change's
`proposal.md` in [the chapter schema record](../adr/chapter-schema.md), with no migration. The
proposal is `025-devbook-names` at contract 25; the table below says so.

**2026-09-27. The paths above are the 2026-09-05 shape.** The layout has been `.devbook/_tools/`
since [the chapter schema record](../adr/chapter-schema.md) closed the second one, and the
skills are `init`, `update`, and `validate`. The table records what the rename moved then;
the migration owed is the same one under today's names.

## Affected components

```meta
```

`devbook`, and every repository that ran `devbook-install` before this release. `devbook-check`
reports the new paths missing and says nothing about the old ones. Migration `006-drop-backlog`
is unaffected: it runs before the rename and was taught both workflow spellings rather than
being rewritten.

## Consequences

```meta
```

**A re-synced repository ends up with two spellings of the same tooling**, and nothing warns
it will: the plugin README does not mention the rename. Both workflows fire,
both point at a generator, and the stale copy is the one nothing updates again.

Nothing fails loudly. The new tooling works; the old tooling keeps working until the schema it
was built against moves, and then it fails against a corpus the new generator accepts.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Ship `025-devbook-names`: move the six paths, rewrite references inside them, rekey the stamp's `materialized` map, bump `CONTRACT_VERSION` to 25 | The complete fix, and the mechanism already exists. Costs a contract bump that records no schema change, weakening `contractVersion` as a statement about the schema |
| Let reconcile carry a rename table — old key to new key, consulted during Detect — and leave the contract alone | Keeps `contractVersion` meaning only the schema. Adds a second mechanism beside migrations for the thing migrations exist to do |
| Leave it, and document the manual delete in the plugin README | Cheapest, and honest for a one-maintainer adopter set. Every future asset rename inherits the same manual step |

Take the first unless the contract's meaning is being settled separately, in which case the
second is what that settlement should produce.

**Trigger:** before the next `devbook` release is offered to a repository that already adopted
it — the rename is invisible until somebody re-syncs. **Fired twice, unrepaired:** devbook
2.0.0 and 3.0.0 have both shipped since this was logged, each with its own migration, and
neither carried the rename.
