# 3. Verify

```meta
rating: candidate
type: stage
```

Checking that an asset does what it says: that a skill triggers when it should, that an agent
loads, that a chapter parses.

## Plugin Evaluation

```meta
rating: candidate
type: practice
stage: [verify]
evidence: none
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
date: 2026-09-02
```

`claude plugin eval` runs a suite against a plugin's skills.

- **Used for** — nothing here yet. It is the only way to check an asset actually triggers when
  it should, which no amount of reading the description settles.
- **Adopted by** — nobody. What is checked today is the loadable half, and since 2026-09-09
  `.github/workflows/repo-checks.yml` runs it on every pull request: `claude plugin
  validate --strict` over the marketplace and every plugin manifest, `tools/check-assets.mjs`
  over the manifests, agents, and hooks, and the generator's `--check` over `.devbook/`. Since
  2026-09-27 it also runs the Node suites under `plugins/*/tools/` through `node --test`.
- **Evidence** — none yet. The first plugin to get a suite is the first thing to evaluate; the
  candidates are the `flow-*` and `devbook-*` skills, whose descriptions are the triggers a
  session routes on.
- **Moves up when** — the first plugin gets a suite and it runs on a pull request here.
- **Limits** — an eval exercises a skill's trigger and output, not the load-time shape both
  hosts reject; those stay with the validator, the checker, and the review rules in
  `AGENTS.md` and `.agents/rules/`.

## Journeys

```meta
rating: candidate
type: practice
stage: [verify]
evidence: none
related: [".devbook/arc42/building-blocks/devbook.md#scenario-tools"]
date: 2026-10-08
```

A journey written once in its context's `scenarios.md`, its Playwright spec derived from it by
a skill, and its run committed beside the file — `devbook:scenario-write`, `scenario-derive`,
and `scenario-run`.

- **Used for** — nothing here yet. This repository ships the three skills and the tools under
  them, but adopts no `domain/` folder and has no application to drive, so there is no journey to
  write and nothing to run.
- **Adopted by** — nobody. The first adopter is spec-manager, with its pilot journeys; Backlog
  reads the runs after it.
- **Evidence** — none yet. The tools' own suites under `plugins/devbook/tools/scenarios/` prove
  the parser, the signature, the reporter, and the coverage check, not that a model derives a
  spec a person keeps.
- **Moves up when** — a repository with an application writes, derives, and runs a journey and
  commits its run.
- **Limits** — a derived spec leaves every step body the journey cannot say to the implementer, so
  the skill produces a shape, not a passing test; and the journey is only as good as its steps,
  which no tool here judges.
