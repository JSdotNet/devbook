# Devbook Derived

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/skills.md"]
```

> One skill. Everything this context does at run time is a workflow or a script passing
> `--write` to devbook's checker; the one procedure it needs a person for is putting those in
> place.

## install

```meta
type: feature
related: [".devbook/domain/devbook-derived/dependencies.md", ".devbook/domain/devbook/skills.md#install", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

Materialize the on-demand refresh script, the nightly refresh and drift-warning workflows
where GitHub Actions is present, the `devbook-derived-artifacts.md` rule as a trio per host,
and this plugin's own marker-fenced section of `AGENTS.md`; then stamp `components.derived`. Payload-only: hash-matching is its
whole migration mechanism, per devbook's reconcile protocol.

Refuses to run until devbook's stamp names an adopted folder and devbook's checker is
materialized, and ends by running that check — a run that ends on a failing check is reported
as failing, never as installed.
