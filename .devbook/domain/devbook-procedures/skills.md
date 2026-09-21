# Devbook Procedures

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-procedures", ".devbook/domain/devbook/skills.md"]
```

> One skill: the install that puts the adopted procedures and their wrappers in place. The
> four procedures themselves are the repository's skills once they land, and this context
> runs none of them.

## install

```meta
type: feature
related: [".devbook/domain/devbook-procedures/context.md#dependencies", ".devbook/domain/devbook-procedures/domain.md#procedure", ".devbook/domain/devbook/skills.md#install"]
```

Materialize `.agents/skills/<name>.md` and a wrapper per host for every name in
`components.devbook-procedures.adopted`, asking which of the four to adopt only when no stamp
answers, then stamp. Payload-only: hash-matching is its whole migration mechanism, per
devbook's reconcile protocol. A present body this component never stamped — a `start` an
earlier engine seeded — is asked about once and kept as the repository's own or replaced; a
wrapper is replaced without asking. A name dropped from `adopted` orphans its three files,
reported and never deleted.
