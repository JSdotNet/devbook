# 8. The Domain Rule Is Not Exercised Here

```meta
date: 2026-09-21
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/building-blocks/README.md", ".devbook/arc42/tdr/7-the-decision-set-predates-the-concern-rule.md"]
```

**Remediation state:** identified · **Severity:** low · **Owner:** the maintainer

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
`plugins/devbook/migrations/`, and the `domain` branches of `devbook:install`. Nothing a
consumer installs is wrong; the gap is that a change to any of these is exercised by the
checker's unit fixtures and by a consuming repository, never by this one.

## Impact

```meta
```

Nothing breaks. A change to the domain rule or a domain kind ships from here without a chapter
in this tree to try it on, and a regression in one of them is found by a consumer. The
checker's own tests carry domain fixtures, which catches a schema regression but not a rule
that has stopped making sense.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Try every domain rule change in a consuming repository before it is released | Costs nothing here and depends on a repository outside this one being reachable at release time |
| Keep one small `domain/` fixture under the plugin's tests, shaped to the rule, and check it in CI | A folder that exists to be checked, which the install skill warns against; but the rule's shape is then asserted where the rule lives |
| Adopt `domain/` again for one plugin whose model has aggregates worth the folder | None does today; the fold happened because none did |

**Trigger:** the first change to `devbook-domain.md` or a domain kind file after this fold.
