# Devbook Derived

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/skills.md"]
```

> Two skills: the install that puts the refresh paths and the canvas in place, and the refresh
> a person runs when this branch has to be current. Everything else this context does at run
> time is a workflow or a script passing `--write` to devbook's checker.

## install

```meta
type: feature
related: [".devbook/domain/devbook-derived/context.md#dependencies", ".devbook/domain/devbook/skills.md#install", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

Materialize the on-demand refresh script, the nightly refresh and drift-warning workflows
where GitHub Actions is present, the `devbook-derived-artifacts.md` rule as a trio per host,
and this plugin's own marker-fenced section of `AGENTS.md`; then stamp `components.derived`. Payload-only: hash-matching is its
whole migration mechanism, per devbook's reconcile protocol.

Refuses to run until devbook's stamp names an adopted folder and devbook's checker is
materialized, and ends by running that check — a run that ends on a failing check is reported
as failing, never as installed.

## refresh

```meta
type: feature
related: [".devbook/domain/devbook-derived/domain.md#refresh", ".devbook/arc42/adr/checks-and-indexes.md"]
```

Rewrite the committed indexes from the chapters on this branch and say which files moved. The
one session-time way to write a derived file, and the deliberate exception to the rule that
a session never regenerates: only when a person asks for this branch to be current, never
inside a flow, never beside a chapter edit, and committed on its own.
