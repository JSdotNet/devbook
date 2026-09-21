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
stage: [plan, code, test]
related: [".devbook/domain/plugin-authoring/domain.md#flow-skill"]
date: 2026-09-02
```

Task categories route to a `flow-<category>` skill that runs the category end to end.

- **Used for** — every category of change to a repository that has the engine enabled:
  `delivery` ships four flows — the code, the five devbook folders, the dependencies, the
  project — so an edit to `.devbook/` routes through `flow-spec` and a code change through `flow-code`. A run can report into a surface — `delivery-surface-dashboard` or
  `delivery-surface-collector` here, `delivery-surface-canvas` being a Copilot canvas this marketplace does not
  offer — and resolves its points from this repository's `.devbook/config.json`: the GitHub tracker,
  `devbook:check` at session start, `devbook:verify-change` at `verify`, an approval gate
  before `deliver`, and every role and MCP point bound to `null` on purpose. `repo-instructions`
  resolves to `AGENTS.md`, which this repository now keeps as its host-neutral root file, and
  every category takes its default model. `stage-delegation` and `surface` still
  answer, being read from the live session rather than bound.
- **Adopted by** — nobody yet. Every change to this repository so far was carried by hand under
  `CLAUDE.md`, including the ones that built the flows.
- **Evidence** — none yet. Every stage now names the role or service it delegates to rather
  than a plugin, so nothing dangles and nothing resolves either: the seven specialists that
  answered `spec`, `implement`, `validate`, `app.start`, `qa.run`, and five roles
  [left the marketplace](../arc42/adr/plugin-boundaries.md).
  A flow run here therefore runs those stages unbound unless the specialist marketplace is
  installed too. What is untested is the routing itself. Promote to `adopted` once a change
  here has been carried by a flow end to end, reporting into one of those surfaces.
- **Limits** — the plugins loaded in the authoring sessions are older versions from another
  marketplace, so the flows this repository documents are not the ones that run in it until
  the working copy is enabled by path.

## Fan-Out

```meta
status: candidate
type: skill
stage: [plan, code]
depends-on: [".devbook/tech/hosts.md#claude-code-cli"]
related: [".devbook/domain/plugin-authoring/domain.md#fleet-skill", ".devbook/arc42/adr/plugin-boundaries.md"]
date: 2026-09-03
```

`fleet` sweeps a backlog and works it five issues at a time across sessions and worktrees,
instead of one session at a time.

- **Used for** — nothing here yet. This repository's backlog is small enough that the one-issue
  lane has never been the constraint.
- **Adopted by** — nobody. A sweep dispatches workers that open pull requests nobody asked for
  if the triage is wrong, which is not a thing to try on the repository that ships it.
- **Evidence** — none yet. `candidate` rather than `trial` because the honest first use is
  somebody else's repository. The thing to watch when it is tried is the park rate: a sweep
  that parks four of five issues is the design working, and reading that as a failure is how
  the bar gets lowered.
- **Limits** — Claude-only until the `session-spawn` slot lands; see
  [the debt record](../arc42/tdr/2-fleet-names-the-cli-directly.md).

## Scheduling

```meta
status: candidate
type: skill
stage: [operate, monitor]
related: [".devbook/domain/plugin-authoring/domain.md#schedule", ".devbook/arc42/adr/plugin-boundaries.md"]
date: 2026-09-07
```

`delivery-schedule` fires an entry point, a check, or a refresh on a cadence, in a cloud
session with nobody watching, and lands what it produced as a pull request or a report issue.

- **Used for** — four of the ten schedules are enabled against this repository, per the
  stamp in `.devbook/config.json`: `devbook-check`, `tech-update`, `merge-review`, and
  `package-update`.
- **Adopted by** — this repository, where a draft pull request nobody asked for costs a
  glance, not a rebase.
- **Evidence** — none yet. `candidate` because the whole design rests on one unverified fact:
  that a cloud session loads the marketplace from the repository's committed settings. The
  first `schedule-run` answers it; until then a prompt cannot reach its skill and the session
  either stops or improvises. Promote to `trial` once one has run its target and published,
  and watch two things: whether the idempotence rule held — one open pull request per
  schedule, updated rather than doubled — and whether a parked run's draft carried enough
  brief to resume by hand.
- **Limits** — one platform: the scheduler is resolved from the live tool list and only one
  host has one, so on the other the prompts print and a person pastes them. No schedule fires
  a flow; see [the decision](../arc42/adr/plugin-boundaries.md).
