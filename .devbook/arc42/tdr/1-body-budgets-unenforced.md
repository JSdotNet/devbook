# 1. The Body Budgets Are Unenforced

```meta
date: 2026-09-04
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/01-introduction-and-goals.md#quality-goals"]
```

**Remediation state:** in-progress · **Severity:** low · **Owner:** the maintainer

**2026-09-05.** The first option below was taken: the root instruction file carries the
disclosure rule again and points at [AUTHORING.md](../../../AUTHORING.md) — that file is
`AGENTS.md` since 2026-09-07 — and
[AUTHORING.md](../../../AUTHORING.md) states
the reason once for the four kinds that are long by nature. What remains is the assets outside
those kinds, which still owe a trim or a reason line; `tools/check-assets.mjs --budgets` lists
them.

**2026-09-05, later.** The second option was then taken as well, on the assets where it cost
nothing: a repository-wide pass deleted the duplication rather than the substance — checklists
that re-ticked their own file, shared phase and reporting contracts copied into every skill
that points at them, Usage Pattern and Output Expectations sections that renamed the stages
above them, and ALWAYS/NEVER pairs in the arc42 prompts. Roughly 2,900 body lines went. The
counts now:

| Kind | Within budget | Smallest | Median | Largest |
| --- | --- | --- | --- | --- |
| `SKILL.md` | 38 of 113 (was 13 of 116) | 17 | 61 (was 101) | 378 |
| `*.instructions.md` | 19 of 35 (was 12) | 18 | 56 (was 78) | 536 |
| `*.agent.md` | 6 of 10 (was 5) | 47 | 67 (was 75) | 218 |

What is left over budget is mostly the four kinds the decision already exempts — staged
procedures, converters, schema and contract files, the runner agents — plus `fleet`, whose
three skills stay long for the reason the options table gives.

**2026-09-07.** The seven specialist plugins
[left the marketplace](../adr/plugin-boundaries.md),
taking most of the short assets with them, and `spec-conciseness.instructions.md` stayed as
[AUTHORING.md](../../../AUTHORING.md). Nothing was trimmed or grown; the population changed:

| Kind | Within budget | Was |
| --- | --- | --- |
| `SKILL.md` | 11 of 64 | 38 of 113 |
| `*.instructions.md` | 2 of 17 | 19 of 35 |
| `*.agent.md` | 0 of 1 | 6 of 10 |

Counted after the unattended lane merged into `delivery-schedule`, which moved nine budgeted
assets out of `delivery` and added three, one of them within.

The debt is unchanged in substance and now concentrated almost entirely in the exempt kinds
plus `fleet`. The largest four are `devbook`'s chapter-metadata and domain instruction files
and `fleet`'s two sweep skills.

**2026-09-08.** The budgeted kinds changed shape: `*.instructions.md` is now a plugin's
`rules/<name>.md` plus the `resources/` contracts that carry a name and description, and
`AUTHORING.md` states all three. `node tools/check-assets.mjs --budgets` reports against
them on every run, so the "nothing checks" half of this record is closed — what is missing is
enforcement, not measurement.

| Kind | Within budget | Was |
| --- | --- | --- |
| `SKILL.md` | 6 of 61 | 11 of 64 |
| rule or `resources/` contract | 2 of 17 | 2 of 17 |
| `*.agent.md` | 0 of 1 | 0 of 1 |

Skills lost ground because the five folder flows came into `delivery` with the
`devbook-flows` merge, and each is a staged procedure. Eight of seventy-nine assets meet
their budget.

## The debt

```meta
```

As logged, `CLAUDE.md` stated three body budgets — `SKILL.md` 40 lines,
`*.instructions.md` 60, `*.agent.md` 80 — as bare thresholds, and every session-start hook
restated them. Most of the repository did not meet them, and nothing checked. The budgets are
[AUTHORING.md](../../../AUTHORING.md)'s today, no hook repeats them, and `check-assets
--budgets` measures them; see the dated entries above for what that changed.

Measured on 2026-09-04 across the seventeen plugins shipping then, counting body lines after
frontmatter:

| Kind | Within budget | Smallest | Median | Largest |
| --- | --- | --- | --- | --- |
| `SKILL.md` | 13 of 116 | 24 | 101 | 486 |
| `*.instructions.md` | 12 of 35 | 28 | 78 | 629 |
| `*.agent.md` | 5 of 10 | 65 | 75 | 295 |

## Origin

```meta
```

The three numbers came from `spec-conciseness.instructions.md` in the `spec-builder` plugin.
That plugin [left this marketplace](../adr/plugin-boundaries.md)
on 2026-09-07 and the rule stayed, as [AUTHORING.md](../../../AUTHORING.md). It
opens its budget table with "the budget is the trigger for a disclosure decision, not a hard
limit" and closes it with "state the reason in the file when an asset genuinely must exceed its
budget". CLAUDE.md carried the table across and left both sentences behind.

That is the whole defect. A disclosure rule with a threshold is checkable — an asset over
budget either says why or does not. A threshold on its own is only checkable by deleting prose,
so it was never applied.

## Affected components

```meta
```

On that 2026-09-04 population, eleven percent of skills met the budget, and the split between
them says where the rule travelled and where it did not — four of these seven plugins have
since left this marketplace:

| Plugin | Skills within 40 | Median |
| --- | --- | --- |
| `spec-builder` — ships the rule | 5 of 5 | 28 |
| `arc42` | 4 of 8 | 35 |
| `documentation` | 4 of 9 | 41 |
| `delivery` | 0 of 31 | 176 |
| `devbook` | 0 of 13 | 177 |
| `devbook-flows` | 0 of 5 | 164 |
| `fleet` | 0 of 3 | 397 |

The plugin that owns the conciseness rule satisfies it exactly, at a median of 28 lines. The
four stack-native plugins miss it by four to ten times. The budget is therefore reachable; it
was simply never adopted past the boundary the ported assets came across.

## Impact

```meta
```

No runtime impact — nothing fails to load, and no host rejects a long asset. The cost is paid
in two other places.

Every long asset is read on every load, so the median `delivery` skill spends roughly four
budgets' worth of context on each turn of every flow that touches it. And a rule with eleven
percent compliance cannot be cited in review: raising it against one change while a hundred
others stand is how a review spends its credibility on the finding that will be ignored.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Adopt the disclosure rule — restore the two sentences CLAUDE.md dropped, and point at `AUTHORING.md` rather than restating the table | Makes every over-budget asset legal the moment it says why, and makes the ones that cannot say why visible. Cheap, and it is the upstream design. Does not by itself shorten anything |
| Rewrite the stack-native skills to budget | Would delete the tables, worked shapes, and decision criteria that are the reason a flow behaves the same way twice — `fleet-resolve-issue` runs 486 lines because an unattended worker has nobody to ask. `spec-builder` disproves the general form of that defence, so it is a claim to test per asset, not a blanket exemption |
| Say in CLAUDE.md that the numbers are unenforced | Honest and free, but leaves the repository with a stated rule it has agreed not to keep |

The first is recommended, and the third is what to do if it is deferred again.

**Trigger:** the next time the root file's authoring rules are edited for any reason. **Fired
2026-09-07**, when those rules moved to `AUTHORING.md` and the disclosure rule came back with
them — the recommended option, taken. What is left is the trimming, so cite the disclosure rule
in review rather than a bare line count: an over-budget asset that never says why is the
reviewable defect.
