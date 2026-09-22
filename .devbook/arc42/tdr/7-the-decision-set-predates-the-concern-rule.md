# 7. The Decision Set Predates the Concern Rule

```meta
date: 2026-09-17
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/README.md", ".devbook/arc42/09-architecture-decisions.md"]
```

**Remediation state:** resolved · **Severity:** medium · **Owner:** the maintainer

## The debt

```meta
```

`plugins/devbook/rules/devbook-arc42.md` now says a decision record holds a choice whose
reversal would cost a migration — of code, of data, or of the model's language — and that there is
one record per concern, updated in place, with a history table carrying the individual
decisions. This repository's own [`adr/`](../adr/README.md) is the shape the rule replaced:
seventy-six numbered files, one per decision, a fifth of them about a name, a word, or a line a
skill must carry — choices a find-and-replace reverses, which the rule now keeps out of the
folder altogether.

The devbook rule is what this repository ships, and its own devbook is the first place a reader
looks to see the rule kept. Here it is not.

## Origin

```meta
```

Taken on 2026-09-17, in the change that wrote the concern rule. The rule came out of this set:
a folder that grew by one file per argued choice, until the number stopped meaning anything
(the index spends two paragraphs on that) and a reader could not tell which choices still stood
without opening each file. Rewriting seventy-six records in the same change as the rule was
not done, because which files fold into which concern, and which lose their record and give
their reason to the rule or chapter that states the choice, are decisions of their own.

## Affected components

```meta
```

`.devbook/arc42/adr/` and its index, chapter 9's table, and every path that names a record by
number: `AGENTS.md`, `.agents/rules/plugin-rules.md`, `context-map.md`
and the bounded contexts under `.devbook/domain/`, and the `related` lists of other records.
Nothing a consumer installs: the rule is right, and the debt is in this repository's own copy.

## Impact

```meta
```

Nothing breaks. The cost is a folder that contradicts the rule shipped beside it, and a reader
who has to open files to learn what stands. The cost grows with every decision taken before the
fold: each one is either a seventy-seventh file under the old shape or the first concern record
beside seventy-six that are not.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Fold the set into concern records | Roughly ten files — hosts, configuration, derived indexes, hooks, surfaces, the flow engine, plugin layout, chapter metadata, releases and migrations — each with the standing choice and a history row per folded record. Every record's argument survives as history; every path that named a number is rewritten. Days of work, all of it judgment |
| Grandfather the set and start concern records at the next decision | Costs nothing today and leaves the folder in two shapes for as long as the old one is cited, which is indefinitely |
| Fold only the records that are technical, and move the reasons of the rest into the files that state them | The same rewrite as the first option for the technical records, plus one sentence each in a rule, a README, or a chapter for the naming and process decisions. The folder ends up in one shape and smaller |

The third option is the one the rule describes. It is a single change, made once, and not
begun until it can be finished, because a folder half in each shape is worse than either.

**Trigger:** the next decision that would open a seventy-seventh numbered file.

## Resolution

```meta
```

Resolved 2026-09-17, the same day, by the third option: eleven concern records under
[`adr/`](../adr/README.md), each folding its records into a standing choice and a history row
per decision, and eleven records whose reason moved into the file that states the choice.
The [index](../adr/README.md) says which number went where, so a citation written against the
old set still resolves.
