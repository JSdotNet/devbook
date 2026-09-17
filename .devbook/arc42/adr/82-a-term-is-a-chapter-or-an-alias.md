# 82. A Term Is a Chapter or an Alias

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/45-a-context-describes-its-skills-and-keeps-its-terms-in-domainmd.md", ".devbook/domain/context-map.md", ".devbook/domain/plugin-authoring/domain.md#migration"]
```

`naming.md` is no longer a `domain/` file kind, and `naming` is no longer a file `type`. A
bounded context has exactly one place for its vocabulary: a term that is already a chapter — an
aggregate, an entity, a value object, an enum, a domain service, a domain event, an actor —
carries its surface names in that chapter's `aliases` field, and only a term with no chapter to
sit on becomes a `term` chapter, under the `## Ubiquitous Language` grouping at the end of
`domain.md`. Contract version 10; migration `010-terms-live-in-domain-md` folds a file a
consumer still carries into `domain.md` and rewrites every reference into it.

This finishes what [record 45](45-a-context-describes-its-skills-and-keeps-its-terms-in-domainmd.md)
started. That record made the file optional and stopped using it here, on the evidence that
twenty-eight of seventy-three terms restated a chapter beside them; it kept the file as a choice
so that no consumer had to move. The cost of the choice was paid everywhere else: every rule,
converter, and resolution rung had to say "in `naming.md`, or in `domain.md` where the context
keeps its terms there", and a reader resolving a term had to search a context rather than open a
file, because nothing outside the context could know which layout it picked. Two layouts for one
concept is a branch every consumer of the graph carries so that the author of one file can keep a
preference.

**The ubiquitous language is the model.** That is the DDD position and the reason the default
already sat in `domain.md`: a glossary that lists the same names the aggregates carry is a second
copy of the model in a file nobody opens while editing the model, and it goes stale on that side.
Putting the synonyms on the chapter makes the aggregate its own glossary entry — `## Order` with
`aliases: [OrderRoot, order_id]` *is* the term *Order* — and every synonym resolves to one
chapter with no second hop. What remains as `term` chapters is exactly what has nowhere else to
live: a role word, a process word, a name a consumer uses for a thing this context never models.

**The word was wrong as well as the file.** `devbook-naming.md` is the rule for file and folder
names; `code-sync-protocol.md` "resolves by naming" when it matches identifiers; and `naming.md`
held neither. Three meanings of one word inside one plugin, and the file was the one that named
an activity rather than the thing it held.

Consequence: **a breaking change after 1.0.0, with the migration
[AGENTS.md](../../../AGENTS.md) requires.** A file that validated under contract 9 does not
under 10, so the script exists rather than a note: it moves each `##` chapter of `naming.md`
under the grouping, creating it where absent, deletes the file, and rewrites
`<context>/naming.md#<anchor>` to `<context>/domain.md#<anchor>` in `meta` references and links
alike. It does not fold a moved term into the chapter it duplicates — that is a reading, and it
happens by hand through the folder's flow. This repository's ten contexts were already in the
target shape, so its ledger records the id and nothing moves.

Consequence: **the proposed `010-devbook-names` of [debt record 3](../tdr/3-devbook-rename-has-no-migration.md)
is spent a second time**, and moves to 011 at contract 11. The debt itself is unchanged.
