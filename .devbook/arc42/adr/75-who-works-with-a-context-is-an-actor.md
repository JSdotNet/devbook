# 75. Who Works With a Context Is an Actor

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/55-a-bounded-context-says-who-works-with-it.md", ".devbook/domain/devbook/domain.md#chapter-type", ".devbook/domain/devbook/domain.md#spec-converter"]
```

`stakeholders.md` is `actors.md`, its file type is `actors`, and its chapters carry one of
three types — `user`, `organisation`, `technical` — plus, on a `user`, a `role` field naming
what the authorization layer checks. Record 55 kept the word *stakeholder* on the argument that
it was the correct umbrella and a rename would ripple; both halves of that argument failed in
the one repository that lived with the file.

**The word was wrong.** A stakeholder is anyone with an interest in the outcome. The chapter
lists only who acts — who issues a command, who the context corresponds with — and a reader who
takes the heading at its word files the interest-holders there too: the council that funds the
service, the regulator that audits it. Neither acts, and neither belongs. That repository
renamed the file to *actors*, the EventStorming and use-case term for exactly the set the
chapter holds, and this record follows it. *Persona* is still not used, for record 55's reason.

**The ripple was the cost of a rename measured against nothing.** The reading order, the status
ladder, and the context index all follow the file list in one place each — the folder rule and
the generator's convention table — so a rename is one edit in each, and the file was installed
nowhere a script would need to find it.

**Three kinds, not two.** The use-case definition of a business actor is a person, an external
system, or a timer that triggers a use case from outside, and record 55 pushed the last two
wholesale to `dependencies.md`. That left the scheduler that closes the month, the inbound
callback that starts a case, and the system account an audit trail records named nowhere: they
are not dependencies, because nothing depends on them, and yet they issue commands. So `type`
carries three values: a `user` is a person with an account who operates the context and holds
a right; an `organisation` is a person or body the context acts toward without operating it; a
`technical` actor is a system or timer that triggers a use case. The exclusion rule of record
55 stands unchanged and is the load-bearing half here too — another bounded context or a module
is a dependency, never an actor, and a `technical` actor is named for what it triggers while
its contract stays in `dependencies.md`. Nor is it the actor-model actor: a mailbox object or a
grain is an implementation building block and belongs in `.arc42`.

**`type`, not a second classifier.** The consuming repository spells its classifier `kind`,
under an older convention; devbook's `type` is the same field, and the rule that the heading
carries the name while `type` carries the kind already exists. One field, three values, flat
`##` chapters: generalisation — every Consultant is an Employee — is a sentence in the first
beat and never a nested chapter, because nesting would put a structural claim on the heading
level that the fourth beat then has to repeat.

**`role` is the fourth beat made addressable.** A `user` chapter already states which right it
needs; `role` carries the name the code checks for it — a claim, a group, an attribute value —
as a plain identifier, a string or a list, producing no graph edge. That is what lets
`sync-specs` resolve an authorization attribute it finds to the actor that holds it, and
`apply-change` carry the actor's right into a brief, instead of both matching prose. It is
scoped to the three actor types and refused elsewhere, because a `role` on a feature chapter
would be the authorization rule the domain rule says `features.md` never states. It is the RBAC
role a right is granted to, never the role a domain object plays in a relationship.

The plugin stays at 1.0.1, `contractVersion` stays at 9, and no migration ships, as records 68
and 72 did: the file is installed nowhere a script would need to find it. A repository that
wrote a `stakeholders.md` by hand renames the file, sets the file type to `actors`, and
rewrites `actor` to `user` and `party` to `organisation` itself.
