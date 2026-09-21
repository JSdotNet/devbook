# Fleet

```meta
type: domain
related: [".devbook/domain/context-map.md#fleet", ".devbook/arc42/adr/plugin-boundaries.md"]
```

## Sweep

```meta
type: aggregate
aliases: [issue sweep, triage pass, fan-out]
related: [".devbook/arc42/05-building-block-view.md#fan-out-state"]
```

One pass over a repository's open items: what was triaged, what was claimed, what was proposed
for closure, which workers were dispatched, and the brief written once they finished. It is the
consistency boundary because the claim and the dispatch must agree — an item marked claimed with
no worker behind it is a backlog item nobody will ever pick up again.

Its state lives in files outside every repository it acts on, because the sessions it
coordinates cannot see each other's conversations. That is not an implementation detail: the
files *are* the coordination surface, and anything not written to one did not happen.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| At most five workers run at once | dispatch | untested |
| One worker resolves exactly one item, in its own worktree | dispatch | untested |
| An item is claimed before it is dispatched, and the claim is visible from the tracker alone | claim | untested |
| An item colliding with work already in flight is skipped, never worked twice | triage | untested |
| An item whose body carries text addressed to an agent is surfaced and excluded from pickup — never worked, never closed | triage | untested |
| Triage proposes a closure; only an answer closes it, and unanswered is recorded as unanswered | closure approval | untested |
| A worker writes a result file on every outcome, failure included | worker completion | untested |
| The sweep waits for its workers before writing the brief | brief | untested |
| A sweep never starts mid-task — only a user turn, a schedule's prompt, or a sweep's own dispatch prompt may | entry | untested |

### Worker

```meta
type: entity
aliases: [background session, resolver]
```

One spawned session resolving one item in its own worktree, identified inside the sweep by
number. It has identity because its outcome is recorded and read back individually, and because
a missing result file has to be told from a worker still running — which the host's list of
live background sessions is what answers.

A worker cannot talk to the sweep or to another worker. Everything it has to say, it writes.

### Closure Proposal

```meta
type: entity
related: [".devbook/domain/fleet/domain.md#triage-verdict"]
```

An item triage judged no longer relevant, put forward for closing with the reason. It is an
entity rather than a value because it outlives one sweep: unanswered, it is recorded as
unanswered and re-proposed next time, which is a different thing from being declined.

### Triage Verdict

```meta
type: value-object
aliases: [relevance judgement]
```

What one pass concluded about one item: how it is classified when nothing had classified it
yet, and whether it is relevant and pickable, colliding with work in flight, stale enough to
propose for closure, or excluded. Equal by value and recomputed every sweep — nothing here is
remembered from the last one except the closure proposals nobody answered and the
classification, which is written to the tracker under the `triaged` label and never asked
again while the label stands.

### Pickup State

```meta
type: enum
related: [".devbook/domain/fleet/domain.md#claim"]
```

`ready-for-pickup`, `in-progress`, `needs-validation` — carried as labels on the tracker rather
than in this context's own files. That is deliberate: a claim has to be legible from the tracker
alone, by a person who has never heard of this plugin and has no access to any session.

## Worker Run

```meta
type: domain-service
related: [".devbook/domain/fleet/domain.md#park", ".devbook/domain/delivery/domain.md#run"]
```

What one worker does with its item: claim it, cut a worktree and a branch, run the resolution
stages, and finish one of two ways — a pull request when the change proved itself against its
own tests and review lenses, or a parked worktree with a handoff brief naming exactly what a
person has to look at.

Invocation semantics: command-invoked, once per worker session, by the sweep's dispatch prompt
or by hand. It is a service rather than behaviour on [Sweep](#sweep) because it runs in a
session the sweep cannot reach: the only thing they share is a file.

It trades Personal Validation for a narrower guarantee rather than for nothing. The pull
request is the review surface, and a change that cannot demonstrate itself never reaches one.

## Brief

```meta
type: domain-service
aliases: [report, sweep brief]
```

Reads a sweep back from its manifest and its worker result files and writes the report: what was
classified, what was picked up, what was skipped and why, what was proposed for closure, and how
each worker finished. Its shape is the state contract's, and two writers follow it: the sweep
itself at the end of its wait, and the standalone brief skill when the sweep could not.

Invocation semantics: query-oriented, and runnable long after the sweep — it re-reads files
rather than remembering anything, which is why a sweep from last week reports exactly as it did
on the day.

## Issue Claimed

```meta
type: domain-event
related: [".devbook/domain/fleet/domain.md#pickup-state", ".devbook/domain/plugin-authoring/domain.md#tracker"]
```

Published when triage takes an item for this sweep, as a label change on the tracker. The
tracker is the transport on purpose: a claim that lives only in a coordination file is invisible
to the person who opens the backlog and starts working the same item by hand.

### Payload

- The item's `ready-for-pickup` label, replaced by `in-progress`
- The sweep that claimed it, so a stale claim can be traced back to the pass that made it

### Consumers

- **The next sweep**, which reads the labels to detect collision with work in flight.
- **Anyone reading the tracker**, which is the reason this event exists at all rather than being
  a field in the manifest.

### Published language rules

- **The label is the claim.** A file that says an item was claimed and a tracker that does not
  is a claim nobody outside this plugin can see.
- **A claim is released or completed, never abandoned silently.** `needs-validation` is what a
  parked worker leaves behind, and it is a different statement from an item that was never
  picked up.

## Worker Result Published

```meta
type: domain-event
related: [".devbook/domain/fleet/domain.md#worker", ".devbook/domain/delivery/domain.md#run-finished"]
```

Published when a worker finishes, as one result file written into the sweep's folder. It is the
only thing a worker says to the sweep, and it is written on every outcome — success, park, and
failure alike.

### Payload

- `issue` — which item this worker took
- `outcome` — a pull request opened, a worktree parked, or a failure
- `pullRequest` or `worktree` — where the result is, depending on which of the two it was
- `note` — for a parked outcome, what a person has to look at

### Consumers

- **The sweep**, which waits on these files and writes the brief from them.
- **[Brief](#brief)**, re-reading a past sweep long after every session involved has ended.

### Published language rules

- **Every outcome writes a file, failure included.** A sweep that cannot tell a crashed worker
  from a slow one cannot aggregate anything, and the host's live-session list is what
  distinguishes the two only when the file is genuinely absent.
- **A parked worktree is a result, not a non-result.** It carries a note naming what a person
  must check, which is what makes parking an honest outcome rather than a quiet failure.
- **The file is written before the session ends**, because a session that ends without one has
  said nothing and there is no second chance to say it.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — plugin,
> layer, tracker, gate — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language).

### Park

```meta
type: term
date: 2026-09-08
aliases: [handoff, needs-validation]
related: [".devbook/domain/fleet/domain.md#worker-run", ".devbook/domain/delivery/domain.md#personal-validation"]
```

What a worker does when its change cannot prove itself: commit it, leave it in its worktree,
label the item `needs-validation`, and write a brief naming exactly what a person has to look at.

Parking is what an unattended run does wherever a gate would be. It is neither approval nor
failure, and the distinction matters — a parked change is finished work waiting on a judgement,
not broken work waiting on a fix.

### Claim

```meta
type: term
date: 2026-09-08
aliases: [pickup, in-progress]
related: [".devbook/domain/fleet/domain.md#pickup-state", ".devbook/domain/fleet/domain.md#issue-claimed"]
```

Taking an item for this sweep, recorded as a label on the tracker rather than in this context's
own files. The tracker is the transport because a claim has to be legible to a person who has
never heard of this plugin — a claim only the coordination folder knows about is not a claim.
