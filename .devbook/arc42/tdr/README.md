# Technical Debt Records

```meta
index: root
related: [".devbook/arc42/11-risks-and-technical-debt.md"]
```

Debt this repository has taken on deliberately: a rule it states and does not keep, or a rule
it breaks knowingly with the fix already named. One record per item, numbered by filename,
each carrying the day the debt was logged.

A record belongs here rather than in
[chapter 9](../09-architecture-decisions.md) when **nothing was decided**. A decision records a
choice somebody made and can defend; a debt record names a gap somebody found and left open,
with what it costs and what would close it. The test is whether the document can end in an
answer. If it ends in two options and no pick, it is debt.

## Remediation state is not `status`

```meta
```

Every record states its remediation state — `identified`, `planned`, `in-progress`, or
`resolved` — as a line in its own body, never in the `meta` block's `status` field.

Those two vocabularies belong to different owners and only one of them governs this folder.
The lifecycle above is the `arc42` plugin's model for a debt record. The `status` field is
devbook's, and under `arc42/` it admits only `draft`, `proposed`, `active`, and `deprecated` —
the two decision rungs are `domain/`'s, and a record claiming `status: identified` would be rejected by the
generator, which is the mistake `status: divergence` already made here once. So `status` stays
at this folder's resting value, written by omitting it, and the debt's own lifecycle is
content.

## The set

```meta
```

| Record | Logged | Severity | State |
| --- | --- | --- | --- |
| [1. The body budgets are unenforced](1-body-budgets-unenforced.md) | 2026-09-04 | Low | in-progress |
| [2. fleet names the Claude CLI directly](2-fleet-names-the-cli-directly.md) | 2026-09-03 | Medium | resolved |
| [3. The devbook asset rename ships no migration](3-devbook-rename-has-no-migration.md) | 2026-09-05 | Medium | identified |
| [4. delivery depends on devbook](4-delivery-depends-on-devbook.md) | 2026-09-07 | Medium | in-progress |
| [5. The derived index is not optional](5-derived-index-is-not-optional.md) | 2026-09-08 | Medium | resolved |
| [6. sync-specs borrows a name OpenSpec uses for something else](6-sync-specs-borrows-a-name-openspec-uses-for-something-else.md) | 2026-09-15 | Low | resolved |
| [7. The decision set predates the concern rule](7-the-decision-set-predates-the-concern-rule.md) | 2026-09-17 | Medium | resolved |
| [8. The domain rule is not exercised here](8-the-domain-rule-is-not-exercised-here.md) | 2026-09-21 | Medium | identified |

None carries a target date. This repository has one maintainer and no release commitment to
schedule against, so a date would be invented rather than agreed. Each record states the
**condition** that should trigger its remediation instead, which is the part a reader can
actually check.
