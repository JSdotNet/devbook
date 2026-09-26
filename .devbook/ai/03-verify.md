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

## Procedure Skills

```meta
status: trial
type: skill
stage: [code, test]
depends-on: [".devbook/tech/hosts.md#claude-code-cli"]
related: [".devbook/arc42/building-blocks/devbook-procedures.md"]
date: 2026-09-26
```

`start`, `show`, `capture`, and `debug` under `.agents/skills/` say how a change here is tried,
shown, evidenced, and debugged, for a repository with no application to run.

- **Used for** — trying a branch from this working copy: `start` adds it as the
  `jsdotnet-devbook` marketplace by path at local scope and enables what the branch touches;
  `show` walks the diff, the changed asset invoked from the working copy, and the checks;
  `capture` takes the three checks `repo-checks.yml` runs as text logs under `.wip/evidence/`;
  `debug` reproduces a checker, hook, or MCP server failure outside the host first.
- **Adopted by** — nobody yet; the four landed here on 2026-09-26 and no session has
  invoked one. Each body was rewritten from its seed on
  its first edit, so the stamp marks all four `managed: false` and `devbook-procedures:update`
  reports them as customized. `estimate` is not adopted.
- **Evidence** — none yet. `trial` because the procedures are written and nothing has invoked
  them. Promote once a pull request here cites a `.wip/evidence/` capture and a walk `show`
  took from an enabled working copy.
- **Limits** — every walk runs on Claude Code; the Copilot side of a dual-host asset is named as
  not walked. Whether a local-scope path declaration wins over the committed GitHub source of
  the same marketplace name is what `start`'s health check is there to catch, and has not been
  observed yet.
