# 2. Deliver

```meta
status: trial
type: stage
```

Carrying a change end to end: from a request to a validated commit, in one session or across
several.

## Flow Skills

```meta
status: trial
type: skill
stage: [specify, code, verify]
evidence: none
related: [".devbook/arc42/08-crosscutting-concepts.md#flow-skill"]
date: 2026-09-02
```

A change routes to the flow named for what it changes, which runs it end to end.

- **Used for** — every change to a repository that has the engine enabled: `delivery` ships two
  flows, `flow-code` for the code, a dependency move and a new project included, and `flow-spec`
  for the five devbook folders. An edit to `.devbook/` routes through `flow-spec` and a code
  change through `flow-code`.
  `.claude/settings.json` enables five plugins for every session here — `devbook`,
  `devbook-derived`, `delivery`, `delivery-schedule`, and `devbook-config` — and the stamps in
  `.devbook/config.json` record what they materialized: `devbook` 1.19.0, contract 29, over
  `arc42`, `tech`, `design`, and `ai`; `delivery` and `schedule` 1.18.0; `devbook-derived`
  1.18.0, with its refresh script, its nightly and drift workflows, its rule trio, and its
  `AGENTS.md` section. No procedure is adopted: the procedures are this marketplace's product,
  kept as seeds in `devbook`, and a repository with no application to run has none of its own.
  A surface is enabled per person: a run reports into every one bound — `delivery-surface-backlog`
  where it is enabled, `delivery-run-view` drawing the same run files inside Claude Code — and
  resolves its phases from the phase maps in `.devbook/config.json`, one per flow: the GitHub
  tracker, `devbook:validate` before `phase-update-base` in both flows, `devbook:verify-change`
  as the skill of `flow-code`'s `phase-spec-check`, and an approval gate before `create-pr`. No
  phase names an agent, a model, or an MCP server, so every phase runs on the session's model as
  the engine contract's *Runs by default* column says — inline, forked, or delegated.
- **Adopted by** — nobody yet. Every change to this repository so far was carried by hand under
  `CLAUDE.md`, including the ones that built the flows.
- **Evidence** — none yet. A specialist is the agent a phase's entry names in the config, never
  a plugin named in a skill, so nothing dangles and nothing resolves either: the seven
  specialists that once ran `scope`, `implement`, `verify`, and the drafting of each folder
  [left the marketplace](../arc42/adr/plugin-boundaries.md).
  A flow run here therefore runs every phase inline unless the specialist marketplace is
  installed and a phase names one of its agents. What is untested is the routing itself.
- **Moves up when** — a change here has been carried by a flow end to end, reporting into one
  of those surfaces.
- **Limits** — a session loads the released `jsdotnet-devbook` marketplace from its GitHub
  clone, so a flow changed on a branch is not the one that runs here until it is released or
  the working copy is enabled by path — `claude plugin marketplace add . --scope local`, per
  *Trying a change* in `AGENTS.md`.

## Fan-Out

```meta
status: candidate
type: skill
stage: [decide, code]
evidence: none
depends-on: [".devbook/tech/hosts.md#claude-code-cli"]
related: [".devbook/arc42/building-blocks/delivery-schedule-entry-points.md#schedule-issue-sweep", ".devbook/arc42/adr/plugin-boundaries.md"]
date: 2026-09-21
```

The issue sweep classifies the inbox, closes what evidence shows already resolved, and works
the top of the backlog one issue at a time into draft pull requests, with nobody watching. It
replaced `fleet`, which did the working part five sessions at a time, on 2026-09-21.

- **Used for** — nothing here yet. This repository's backlog is small enough that the one-issue
  lane has never been the constraint.
- **Adopted by** — nobody. A sweep opens draft pull requests nobody asked for if the triage is
  wrong, which is not a thing to try on the repository that ships it.
- **Evidence** — none yet. `candidate` rather than `trial` because the honest first use is
  somebody else's repository. The thing to watch when it is tried is what the pull request
  bodies say could not be proved: a sweep whose every draft names something to validate is the
  design working, and reading that as a failure is how the bar gets lowered.
- **Moves up when** — the sweep runs against another repository and a person keeps one of its
  draft pull requests.
- **Limits** — the resolution runs through the host's workflow tool, which is the same
  host-capability divergence the schedule plugin already records.

## Scheduling

```meta
status: trial
type: skill
layer: [upkeep]
evidence: partial
related: [".devbook/arc42/08-crosscutting-concepts.md#schedule", ".devbook/arc42/adr/plugin-boundaries.md"]
date: 2026-10-06
```

`delivery-schedule` fires an entry point, a check, or a refresh on a cadence, as a local
routine on the maintainer's machine with nobody watching, and lands a change as a pull request and its report as the run's last message.

- **Used for** — three of the sixteen catalog schedules are enabled against this repository,
  per the stamp in `.devbook/config.json`: `devbook-validate`, `tech-update`, and
  `merge-review`. `package-update` and `devbook-pull-sweep` were dropped from the selection at
  the 1.19 update; the sync sweeps run elsewhere first, and no chapter here sets a sync
  direction. The issue sweep is not among them yet.
- **Adopted by** — this repository, where a draft pull request nobody asked for costs a
  glance, not a rebase.
- **Evidence** — the fact the design first rested on came back false on 2026-09-28: a cloud
  session did not load the marketplace from the repository's committed settings, and the
  Backlog issue sweep stopped at its first rule without its skill. Every schedule has been a
  local routine since, running with the plugins installed on the machine. The first local runs
  of `devbook-validate` ran their target and published here: one pull request a day on
  2026-09-30, 2026-10-01, and 2026-10-02 (#187, #199, #210), each merged the day it opened.
  Keep watching two things: whether the idempotence rule holds — one open pull request per
  schedule, updated rather than doubled — and whether a parked run's draft carries enough
  brief to resume by hand.
- **Moves up when** — the other selected schedules, `tech-update` and `merge-review`, have
  published here too.
- **Limits** — one platform: the scheduler is resolved from the live tool list and only one
  host has one, so on the other the prompts print and a person pastes them. No schedule fires
  a flow; see [the decision](../arc42/adr/plugin-boundaries.md).
