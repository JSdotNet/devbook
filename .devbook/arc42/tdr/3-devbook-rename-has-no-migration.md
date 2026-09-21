# 3. The devbook Asset Rename Ships No Migration

```meta
date: 2026-09-05
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/08-crosscutting-concepts.md#devbook-folder", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

**Remediation state:** identified · **Severity:** medium · **Owner:** the maintainer

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
| Ship `011-devbook-names`: move the six paths, rewrite references inside them, rekey the stamp's `materialized` map, bump `CONTRACT_VERSION` to 11 | The complete fix, and the mechanism already exists. Costs a contract bump that records no schema change, weakening `contractVersion` as a statement about the schema |
| Let reconcile carry a rename table — old key to new key, consulted during Detect — and leave the contract alone | Keeps `contractVersion` meaning only the schema. Adds a second mechanism beside migrations for the thing migrations exist to do |
| Leave it, and document the manual delete in the plugin README | Cheapest, and honest for a one-maintainer adopter set. Every future asset rename inherits the same manual step |

Take the first unless the contract's meaning is being settled separately, in which case the
second is what that settlement should produce.

**Trigger:** before the next `devbook` release is offered to a repository that already adopted
it — the rename is invisible until somebody re-syncs. **Fired twice, unrepaired:** devbook
2.0.0 and 3.0.0 have both shipped since this was logged, each with its own migration, and
neither carried the rename.
