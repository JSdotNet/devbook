# delivery-pr-lane

```meta
related: [".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/README.md", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/12-glossary.md#pr-lane"]
c4: ["marketplace.delivery.pull-request-lane"]
code: ["plugins/delivery/skills/push-branch", "plugins/delivery/skills/update-pr-branch", "plugins/delivery/skills/fix-pr-checks", "plugins/delivery/skills/pr-merge-ready"]
```

The pull-request lane of the [delivery](delivery.md) engine, a block inside it. Its one responsibility is that
a finished change gets reviewed and merge-ready, whether a flow produced it or not.

**Owns:** the four lane skills.

| Concern | Owner |
| --- | --- |
| Opening the pull request at the end of a run | [`phase-create-pr`](delivery-phases.md#phase-create-pr) |
| Checking out the branch a run works on | [`phase-update-base`](delivery-phases.md#phase-update-base) |
| Raising a pull request by hand | the host's own action |

## Interfaces

```meta
related: [".devbook/arc42/building-blocks/delivery.md#interfaces"]
```

Four skills, each reached by a person, on a change a flow did or did not produce.
`pr-merge-ready` uses the other three as its tools.

### push-branch

```meta
related: [".devbook/arc42/building-blocks/delivery-pr-lane.md#pull-request-lane"]
```

- **Does:** push the current branch, set its upstream, and stop.
- **Never:** opens a pull request.
- **Why:** this step gets commits onto the remote so CI runs.

### update-pr-branch

```meta
related: [".devbook/arc42/building-blocks/delivery-pr-lane.md#pull-request-lane"]
```

- **Does:** bring a pull request branch level with its base, resolve the conflicts, re-validate,
  and push.
- **For:** a branch that is behind, or blocked by a required up-to-date check.

### fix-pr-checks

```meta
related: [".devbook/arc42/building-blocks/delivery-pr-lane.md#pull-request-lane"]
```

- **Does:** read a failing job's logs, reproduce locally, classify the failure, fix it, and push
  until checks go green.

### pr-merge-ready

```meta
related: [".devbook/arc42/building-blocks/delivery-pr-lane.md#pull-request-lane"]
```

- **Does:** score one pull request against the merge-ready checklist and clear its blockers,
  with the other three lane skills.
- **Limit:** one pull request per pass.

## Structure

```meta
related: [".devbook/arc42/building-blocks/delivery.md#model"]
```

One domain service and the enum it holds. The lane takes no part in a run's model: it acts on
the pull request a run leaves behind, or on one no run produced.

![delivery-pr-lane's component](c4:delivery-pr-lane)

### Pull Request Lane

```meta
related: [".devbook/arc42/12-glossary.md#pr-lane"]
```

Getting a finished change reviewed and merge-ready: push the branch, bring it level with its
base, fix the checks that fail, and score it against the merge-ready checklist.

Invocation semantics: command-invoked, and separately from a run. These skills are the one
part of this block routinely used on a change no flow produced.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Raising the pull request is the host's own action, never a skill here | the lane skills | untested |
| The lane runs separately from a run, on a change no flow produced | the lane skills | untested |
| With the `pr-lane` slot unbound, `create-pr` writes file artifacts only and opens nothing | `phase-create-pr` | untested |
| A run works on the branch it was started on and ends in its own pull request; no tracker names a branch or holds a pull request back | `phase-update-base`, `phase-create-pr` | untested |

Whoever starts the run decides per case what one pull request carries, never the engine or a
repository's configuration. It may carry the proposal of a change alone, the whole change, or one
step of a plan such as Backlog's.

## Dependencies

```meta
related: [".devbook/arc42/building-blocks/delivery.md#dependencies"]
```

A part of delivery, shipped and versioned with it. What the plugin as a whole depends on is
[delivery's own table](delivery.md#dependencies).

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| GitHub, through `gh` | Conformist | Pushing a branch, reading a failing job's logs, and scoring a pull request | The `gh` command line | The lane works on a pull request where it lives. |
### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery-phases](delivery-phases.md#phase-update-base) | Same plugin | `phase-update-base` leaves a branch with an open pull request to `update-pr-branch` | The skill name | That a branch under review is the lane's to update. |
| [delivery](delivery.md#start-session-from-issue) | Same plugin | `start-session-from-issue` names `pr-merge-ready` as the next step for finished work | The skill name | That one pull request is taken to merge-ready per pass. |
| [delivery-schedule](delivery-schedule-entry-points.md#schedule-merge-review) | Separate Ways | `schedule-merge-review` reports what `pr-merge-ready` fixes with a person present | The skill name alone | That the attended counterpart exists; the review never fixes anything itself. |
