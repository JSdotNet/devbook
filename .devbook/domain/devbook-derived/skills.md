# Devbook Derived

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/skills.md"]
```

> Four skills: the install that puts the tools where CI and the other three expect them,
> and the three procedures that run a tool — the check, the sweep, the `.tech` refresh.
> Nothing in devbook runs any of them; a devbook skill says "run the check the repository's
> `AGENTS.md` names", and this context's section of that file is what names it.

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

## check

```meta
type: feature
related: [".devbook/domain/devbook-derived/domain.md#index-generator", ".devbook/domain/devbook/domain.md#reconciler", ".devbook/domain/devbook/skills.md#install"]
```

The check-only counterpart of devbook's install. It runs this context's checker and asks
devbook's two further questions — is the migration ledger current, does the stamp still
describe what is on disk — reading devbook's reconcile protocol for both, then repairs what it
can prove and hands every other write back to `devbook:install`. The daily `devbook-check`
schedule's target.

Two writers for one file is how a reconcile stops being idempotent, which is why this skill is
deliberately narrow.

## annotation-sweep

```meta
type: feature
related: [".devbook/domain/devbook-derived/domain.md#fence-writer", ".devbook/domain/devbook/domain.md#annotation", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md"]
```

Delete every resolved annotation fence in one chapter and nothing else — the last step of the
lifecycle, where `resolved` lives only the rest of the branch and gone is the resting state.
Chapter-scoped, so a person sees what is about to go before it does. Here rather than in
devbook because the fence writer is, and devbook names no tool.

## tech-update

```meta
type: feature
related: [".devbook/domain/devbook-derived/domain.md#tech-inventory", ".devbook/domain/delivery/skills.md#flow-spec"]
```

Refresh a repository's technology graph from this context's deterministic package
inventories, then analyse the repository for what appears in no package manifest — runtimes,
services, platforms, protocols, tooling — and hand the authoring to the folder's own write
path. It runs the check and never the writer: refresh is the schedule's.
