# 55. A Bounded Context Says Who Works With It

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md#chapter-type", ".devbook/arc42/adr/45-a-context-describes-its-skills-and-keeps-its-terms-in-domainmd.md", ".devbook/arc42/adr/75-who-works-with-a-context-is-an-actor.md"]
```

**Superseded in part, 2026-09-17** by [Who Works With a Context Is an Actor](75-who-works-with-a-context-is-an-actor.md):
the file is `actors.md` and its chapters are `user`, `organisation`, or `technical` — the word
*stakeholder* named a larger set than the chapter holds, and the rename cost one edit per index
rather than the ripple argued below. Everything else stands: an actor and not a persona, and
the exclusion rule that keeps another context, a module, and a tenant out of the file.

A context's chapters said what the model is and what the context lets someone do, and nothing
said which role that someone is. `features.md` names "the case worker" and no file defines the
term; `domain.md` records that an action carries one and never says what one may do. The gap
came back from a consuming repository that had filled it locally: four bounded contexts, one
`stakeholders.md` each, and — with no rule to write them against — three incompatible shapes,
one of which listed a neighbouring bounded context as an "external party" that
`dependencies.md` already described properly.

So `stakeholders.md` joins the starter set, carrying `type: actor` and `type: party`.

**An actor, not a persona.** "Which user role works with this boundary" has a DDD-native
answer: the EventStorming and Domain Storytelling actor, the role that issues a command. It is
ubiquitous language, it is stable, and an invariant can depend on one. A persona is a UX
archetype of goals, frustrations, and demographics — none of those things — and belongs in
`.design` where a repository wants one. `.domain` gets no `personas.md`.

**The umbrella keeps its name, and the structure goes inside it.** *Stakeholder* is the correct
word: it covers the party with an interest and no interaction as well as the role that operates
the system. What went wrong in the consuming repository was one page answering three questions
at once, and the third of them — which other system consumes this context — was
`dependencies.md`'s. So the fix is two chapter types inside one file, not a rename and not a
second `actors.md`, which would exist only because the first file was badly structured and
would ripple through the status ladder, the reading order, and every context index.

**The exclusion rule is the load-bearing half.** Another bounded context, a module, or a
technical system is a dependency; a tenant is the administrator role plus its settings. Both
files state the boundary from their own side, because one relationship described in two places
is one description that goes wrong — which is exactly what was found there: a stakeholder page
claiming a neighbour reads by query and never by command, while that context's own
`dependencies.md` said the opposite.

Nothing is removed from any value set, so every repository already on devbook still validates
and no migration is needed — devbook 3.2.0, contract version unchanged. The reading order puts
the file directly after the context's root document: who operates the context, before what the
context lets them do.

Consequence: the feature converters gain the one beat they can establish from code. A role
check or authorization attribute found by `to-spec-feature` is the right an actor needs, and it
now has a chapter to land on instead of being dropped or written into `features.md`;
`from-spec-feature` reads the same chapter from the other end, so authorization is part of the
change rather than a question met after it lands.
