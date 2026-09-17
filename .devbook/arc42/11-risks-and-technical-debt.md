# Risks and Technical Debt

```meta
number: 11
related: [".devbook/arc42/tdr/README.md", ".devbook/arc42/09-architecture-decisions.md"]
```

What this repository owes, and what it is exposed to. Records live in
[`tdr/`](tdr/README.md) and are linked from here rather than restated, the same way
[chapter 9](09-architecture-decisions.md) relates to [`adr/`](adr/README.md).

## Technical Debt

```meta
related: [".devbook/arc42/tdr/README.md"]
```

| Record | Logged | Severity | State | In one line |
| --- | --- | --- | --- | --- |
| [1. The body budgets are unenforced](tdr/1-body-budgets-unenforced.md) | 2026-09-04 | Low | in-progress | AGENTS.md states three body budgets and `check-assets --budgets` reports against them; 8 of 79 budgeted assets meet them, and the kinds that are long by nature are exempted by decision rather than trimmed. |
| [2. fleet names the Claude CLI directly](tdr/2-fleet-names-the-cli-directly.md) | 2026-09-03 | Medium | identified | `fleet` names a host's CLI although no asset here may name one, so on any other host a sweep dispatches nothing — and its manifest does not say so. |
| [3. The devbook asset rename ships no migration](tdr/3-devbook-rename-has-no-migration.md) | 2026-09-05 | Medium | identified | The `knowledge-*` -> `devbook-*` rename moved payload paths with no migration to carry them, so a re-synced repository grows a second spelling of the same tooling. |
| [4. delivery depends on devbook](tdr/4-delivery-depends-on-devbook.md) | 2026-09-07 | Medium | identified | `delivery` declares no dependency, yet five of its flows are named after devbook folders, restate devbook's schema rules, and run devbook's installed generator by path — and one binding has already drifted unnoticed. |
| [5. The derived index is not optional](tdr/5-derived-index-is-not-optional.md) | 2026-09-08 | Medium | identified | devbook ships the derived `_meta/` index as foundation although nothing here reads it, its one consumer is another repository's app, and six foundation skills run the writer against the rule that forbids it. |
| [6. sync-specs borrows a name OpenSpec uses for something else](tdr/6-sync-specs-borrows-a-name-openspec-uses-for-something-else.md) | 2026-09-15 | Low | identified | OpenSpec's `sync-specs` merges spec deltas a proposal wrote and never reads source; devbook's reads source and writes the chapter, the direction OpenSpec has no skill for — `capture-specs`, the protocol's own word, is held here for later. |
| [7. The decision set predates the concern rule](tdr/7-the-decision-set-predates-the-concern-rule.md) | 2026-09-17 | Medium | identified | `devbook-arc42.md` now keeps one record per technical concern, updated in place; this repository's own `adr/` is seventy-six numbered per-decision files, a fifth of them about a name or a word, and the fold into concern records is owed as one change. |

Records 1 and 2 were carried out of chapter 9, where they had been written as decisions. Neither is one:
each ends in options rather than a choice, which is the test for whether a record belongs
[here instead](tdr/README.md).

## Risks

```meta
```

No standing risk register. Risks that are real here are consequences of decisions and stay
written where the decision is, because a risk restated away from its cause loses the reason it
is acceptable — see the consequence paragraphs in
[chapter 9](09-architecture-decisions.md), several of which are exactly that.

Open one when a risk exists that no decision produced. Nothing has needed it yet, and an empty
register invites the scaffolding this convention asks authors not to write.

## Known Gaps in This Chapter Set

```meta
related: [".devbook/arc42/adr/README.md"]
```

None open. This section held one until 2026-09-09: `adr/` did not exist, and every decision sat
inline in [chapter 9](09-architecture-decisions.md), which the convention describes as a chapter
that links out and does not restate.

Both halves of the trigger it named had fired. Three decisions carried a supersession note —
one outright, two in part — so the chain the split was being held for existed; and the count
had grown faster than the file's readability, past forty-five to forty-six while this section
still said forty-five. All forty-six moved out that day, six further decisions were written,
and three more argued on `main` in parallel landed as files on the merge — fifty-five records,
numbered, with this chapter's shape as the model:
[`adr/README.md`](adr/README.md) introduces the set, and chapter 9 is a table of links.

Keep this section, and reopen it the moment either chapter starts restating what its record
folder holds.
