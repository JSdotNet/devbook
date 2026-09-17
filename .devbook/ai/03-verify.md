# 3. Verify

```meta
status: candidate
type: stage
```

Checking that an asset does what it says: that a skill triggers when it should, that an agent
loads, that a chapter parses.

## Plugin Evaluation

```meta
status: candidate
type: practice
stage: [test]
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
date: 2026-09-02
```

`claude plugin eval` runs a suite against a plugin's skills.

- **Used for** — nothing here yet. It is the only way to check an asset actually triggers when
  it should, which no amount of reading the description settles.
- **Adopted by** — nobody. What is checked today is the loadable half, and since 2026-09-09
  `.github/workflows/repo-checks.yml` runs three of it on every pull request: `claude plugin
  validate --strict` over the marketplace and every plugin manifest, `tools/check-assets.mjs`
  over the manifests, agents, and hooks, and the generator's `--check` over `.devbook/`. The
  Node suites under `plugins/*/tools/` are the half nothing runs — by hand or otherwise.
- **Evidence** — none yet. The first plugin to get a suite is the first thing to evaluate; the
  candidates are the `flow-*` and `devbook-*` skills, whose descriptions are the triggers a
  session routes on.
- **Limits** — an eval exercises a skill's trigger and output, not the load-time shape both
  hosts reject; those stay with the validator, the checker, and the review rules in
  `AGENTS.md` and `.agents/rules/`.
