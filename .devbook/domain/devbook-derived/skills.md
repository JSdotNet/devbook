# Devbook Derived

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/skills.md#devbook-check"]
```

> One skill. The tool is run by devbook's skills and by CI; what this plugin adds as a
> procedure is only putting the tool where they expect it.

## install

```meta
type: feature
related: [".devbook/domain/devbook-derived/dependencies.md", ".devbook/domain/devbook/skills.md#install", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

Materialize the checker and generator under `.devbook/_tools/devbook-meta/`, the CI check and
nightly refresh workflows where GitHub Actions is present, the on-demand refresh script, the
`devbook-derived-artifacts.md` rule as a trio per host, and this plugin's own marker-fenced
section of `AGENTS.md`; then stamp `components.derived`. Payload-only: hash-matching is its
whole migration mechanism, per devbook's reconcile protocol.

Refuses to run until devbook's stamp names an adopted folder, and ends by running the check
it just installed — a run that ends on a failing check is reported as failing, never as
installed.
