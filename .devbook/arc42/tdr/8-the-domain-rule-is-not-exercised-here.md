# 8. The Domain Rule Is Not Exercised Here

```meta
date: 2026-09-21
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/building-blocks/README.md", ".devbook/arc42/tdr/7-the-decision-set-predates-the-concern-rule.md", ".devbook/arc42/adr/chapter-schema.md"]
```

**Remediation state:** identified · **Severity:** medium · **Owner:** the maintainer

**2026-09-22.** The trigger fired and the debt was re-accepted rather than remediated.
Contract 14 gave a bounded context `requirements.md` and `invariants.md` — two chapter kinds
with a template each, four chapter types, two file types, three coverage warnings, and a typed
`related` pairing — and nothing in this repository has ever written one. That is a larger
surface than the changes this record was written about, which were edits to a rule whose shape
already existed, so the severity rises from low to medium. None of the three options below was
taken: the first still depends on a repository outside this one, the second still buys the
exercise with a folder that exists to be checked, and the third is still false. What did
change is the weight of the second, for the reason the impact section now records.

## The debt

```meta
```

On 2026-09-21 this repository dropped `.devbook/domain/` and folded every bounded context into
one building block per plugin under [`arc42/building-blocks/`](../building-blocks/README.md),
the shared kernel into [chapter 8](../08-crosscutting-concepts.md), and the terms into the
[glossary](../12-glossary.md). The fold was right: a plugin marketplace has no aggregates, the
bounded contexts mapped one to one onto plugins, and what `domain/` genuinely carried — a
boundary, a skills list, and dependency tables — is a building-block whitebox by another name.

The cost is that `plugins/devbook/rules/devbook-domain.md` — the largest rule devbook ships,
with `actors.md`, `context.md`, split files, feature flags, settings, and the ubiquitous
language — is now kept by no folder in the repository that ships it. The same is true of four
of the six converter kinds: `aggregate`, `domain-service`, `feature`, and `setting` dispatch on
a `type` field `arc42/` forbids, so only `building-block` and `design-component` can run here.
The `aliases` rung of counterpart resolution has no chapter to read either; a block file
carries its aliases as an "Also called" line the converters do not parse.

## Origin

```meta
```

Taken knowingly, the same day as the fold. [Debt record 7](7-the-decision-set-predates-the-concern-rule.md)
had already made the point: this repository's own devbook is the first place a reader looks to
see a rule kept, and a rule kept only by a consumer is a rule whose next change lands untried.

## Affected components

```meta
```

`plugins/devbook/rules/devbook-domain.md`, the four kind files under
`plugins/devbook/assets/spec-kinds/`, the two domain migrations under
`plugins/devbook/migrations/`, and the `domain` branches of `devbook:init` and `devbook:update`. Nothing a
consumer installs is wrong; the gap is that a change to any of these is exercised by the
checker's unit fixtures and by a consuming repository, never by this one.

[Contract 14](../adr/chapter-schema.md) widened that list. A bounded context now states its
behaviour in `requirements.md` and `invariants.md`, and everything those two files brought with
them is `domain/`-only: the `requirements`, `requirement`, `invariants`, and `invariant`
chapter types and the two file types in `metadata.mjs`; the `Requirement:`, `Invariant:`, and
`Scenario:` heading shapes, the one heading prefix this convention allows; the `Enforced at:`
line; the three coverage warnings over a rule chapter; and the typed `related` pairing
`graph.mjs` resolves between a behaviour chapter and the prose chapter it belongs to. Each is a
template a person has to be able to follow, and none has been followed here.

## Impact

```meta
```

Nothing breaks. A change to the domain rule or a domain kind ships from here without a chapter
in this tree to try it on, and a regression in one of them is found by a consumer. The
checker's own tests carry domain fixtures, which catches a schema regression but not a rule
that has stopped making sense.

Those tests are also weaker cover than the sentence above reads as.
[`repo-checks.yml`](../../../.github/workflows/repo-checks.yml) runs `check-assets.mjs`,
`build.mjs --check`, and `claude plugin validate`, and nothing else; every `*.test.mjs` under
`plugins/devbook/tools/devbook-meta/` — `behaviour-files.test.mjs` among them — is run by hand,
as that folder's README says. So what stands between a `domain/` schema regression and a
consumer is a person remembering to run a file. Putting those tests in the workflow is cheap
and independent of every option below: it would make the cover this record already credits
real, without making the rule exercised, which is the thing this record is about.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Try every domain rule change in a consuming repository before it is released | Costs nothing here and depends on a repository outside this one being reachable at release time |
| Keep one small `domain/` fixture under the plugin's tests, shaped to the rule, and check it in CI | A folder that exists to be checked, which the install skill warns against; but the rule's shape is then asserted where the rule lives, and a fixture written to the templates is the one thing that proves they can be followed |
| Adopt `domain/` again for one plugin whose model has aggregates worth the folder | None does today; the fold happened because none did |

**Trigger:** the first change to `devbook-domain.md` or a domain kind file after this fold.
**Fired 2026-09-22**, when contract 14 added the two behaviour files and edited all four domain
kind files; re-accepted at medium rather than remediated, per the note at the top. Next
trigger: the first `domain/` defect a consumer reports, or the next contract that adds a
chapter kind this repository cannot write — either settles the second option above without
further argument.
