# Delivery Schedule

```meta
type: skills
related: [".devbook/domain/context-map.md#delivery-schedule"]
```

> Seventeen skills in two halves: fourteen entry points that pick their own input, and three that put a
> trigger in the scheduler and read it back. Every one of them is also runnable by hand, which is
> how a cadence gets proved before it is trusted.

## schedule-devbook-check

```meta
type: feature
related: [".devbook/domain/devbook/skills.md#check", ".devbook/domain/devbook-derived/skills.md#install", ".devbook/arc42/adr/checks-and-indexes.md"]
```

Run `devbook:check` over every adopted folder, fix what it reports in the chapters, refresh the
committed indexes where `devbook-derived` keeps them, and land one pull request — or a
schedule-report issue when the ledger or the stamp needs a person. The daily `devbook-check`
trigger's target: the catalog names a schedule skill, never a foundation skill directly.

## schedule-instruction-review

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/plugin-authoring/domain.md#skill", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

Read every instruction asset a model loads — repository instructions, rules, skills, agents,
prompts, contracts — and cut what changes nothing: a sentence the model does by default, a rule
stated twice, a hedge, a prohibition with a positive form. It lands as a draft pull request with
one commit per file and a ledger of every cut, because no check proves a rewritten instruction
and a reviewer must be able to drop one file without losing the rest. A file the previous run's
rejected pull request touched is skipped: a rejection is an answer, and the run converges on what
the repository will accept. It adds nothing but a pointer that replaces a duplicate.

## schedule-issue-sweep

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/delivery-schedule/skills.md#schedule-morning-brief", ".devbook/domain/delivery/skills.md#start-session-from-issue", ".devbook/arc42/adr/plugin-boundaries.md"]
```

Classify every open issue nobody has classified in the repository's own labels and write that
back; close what high-confidence evidence shows already resolved, with the evidence in the
comment; resolve up to N of the rest one at a time, each on its own branch, each a draft pull
request whose body says what could not be proved; and publish one brief, needs-you first. The
weekday `issue-sweep` trigger's target, timed before the morning brief because the brief ranks
by the labels it writes.

### Classify Once, Judge Every Sweep

```meta
type: sub-feature
```

A classification — type, area, severity for a defect, a likely duplicate, the questions a thin
report leaves open — is written once and marked `triaged`, so the next sweep does not ask again
and the pickup skills rank by what it wrote. It uses only labels the repository already has; one
it lacks is a proposal in the brief. Relevance and collision with work in flight are recomputed
every sweep, because the code moved.

### Close on Evidence, Draft Everything Else

```meta
type: sub-feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

The one closure an unattended run may take: an issue already fixed, obsolete, or a duplicate, at
high confidence, with a commit, file, pull request, or sibling issue named in the closing
comment. Every other stale verdict is a proposal with its command. Every pull request is a draft
— the one that proved itself and the one that did not alike — because personal validation
happens on the pull request and nothing is ready for review until a person says so.

### One Session, One Issue at a Time

```meta
type: sub-feature
```

Resolution is sequential in the session the schedule gave it: a worktree cut and removed per
issue, the resolution run through the host's workflow tool as sub-agents, never a second session.
A scheduled run has hours and nobody to hand a parked worktree to, so it neither fans out nor
parks — what did not reach a draft pull request is a comment on the issue and a row in the brief.

## schedule-merge-review

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Review every pull request waiting on a reviewer and leave one comment per pull request. It reviews
and never approves — approving is a decision, and no unattended run takes one.

## schedule-morning-brief

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/delivery-schedule/skills.md#schedule-weekly-update"]
```

Report what changed in this repository since yesterday and what needs a person today, in one
screen, needs-you first. It is triage, read once: the weekly update is the record. Both read the
same sources over different windows, stated once in the plugin's change window contract.

## schedule-package-update

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/delivery/skills.md#flow-update-packages"]
```

Update what is outdated, verify the build, and open a pull request. The shipped trigger restricts
it to minor and patch, because a major version is a decision rather than an update.

## schedule-performance-review

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Score ten performance findings and implement the best one, landing as a pull request. Ten scored
and one implemented is the shape: an unattended run that fixed all ten would be ten unreviewed
changes in one branch.

## schedule-review

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Sweep TODOs, open suggestions, and the code review checklist, and report the findings — optionally
as issues.

## schedule-security-review

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Check dependencies, secrets, CI hardening, and code, and open one issue per new high finding. New
is the operative word: a run updates what its previous run left open rather than re-reporting it.

## schedule-tech-update

```meta
type: feature
related: [".devbook/domain/devbook/skills.md#tech-update", ".devbook/arc42/adr/checks-and-indexes.md"]
```

Run `devbook:tech-update` over every `tech/` layer and land what moved as one draft pull
request, never a merge — a rating is a person's decision. The weekly `tech-update` trigger's
target.

## schedule-week-starter

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Digest what the tracked topics published this week, as one report.

## schedule-weekly-cost-analysis

```meta
type: feature
related: [".devbook/domain/delivery-surface-dashboard/domain.md#telemetry"]
```

Read the week's token telemetry from the run surface and report the cost. It reads measured
numbers or it reports none — a surface that does not capture telemetry leaves this empty rather
than estimated.

## schedule-weekly-update

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point", ".devbook/domain/delivery-schedule/skills.md#schedule-morning-brief"]
```

Report the repository's week as one update a stakeholder can read — shipped, in flight, issues,
releases, what the schedules landed, and what carries over — with the numbers beside the
narrative. One per week, kept as the record of everything that changed.

## schedule-whats-new

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#entry-point"]
```

Report what changed in the tracked repositories since the last run, over a stated window.

## install

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#schedule-selection", ".devbook/domain/delivery-schedule/flow.md"]
```

Create or update the selected schedules through whatever scheduler the live session exposes,
disable the deselected, and record the selection under this component's stamp.

### Refuse What Would Not Run

```meta
type: sub-feature
```

A cloud session loads this marketplace only if the repository's committed host settings enable it
and the plugins the target needs. A schedule that would start without its skill is refused rather
than created.

### Match by Name

```meta
type: sub-feature
```

Entries are matched by `<owner>/<repo> · <title>`, so a second sync updates rather than duplicates
— and no scheduler id has to be written into the repository, which is what keeps anything personal
out of it.

## schedule-status

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#scheduler-resolution"]
```

List the schedules with their last runs, what each published, and the log where one failed.

## schedule-run

```meta
type: feature
related: [".devbook/domain/delivery-schedule/domain.md#scheduler-resolution"]
```

Fire one schedule now and report the run. The first run is the proof, not the creation: a cadence
that has never fired is a guess about somebody else's environment.
