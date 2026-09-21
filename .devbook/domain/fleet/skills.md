# Fleet

```meta
type: skills
related: [".devbook/domain/context-map.md#fleet"]
```

> Three skills. The sweep and the worker may not start mid-task — only a user turn, a schedule's
> prompt, or a sweep's own dispatch prompt may run one, because each spawns sessions and claims
> backlog items that outlive the turn that asked. The brief spawns nothing and may run any time.

## fleet-issue-sweep

```meta
type: feature
related: [".devbook/domain/fleet/domain.md#sweep", ".devbook/domain/fleet/flow.md"]
```

Turn a repository's inbox into a backlog and the backlog into parallel work: classify every item
nobody has classified in the repository's own labels and write that back, judge every item for
relevance and for collision with work in flight, propose the stale ones for closure, claim what it
picks, dispatch up to five worker sessions, wait them out, and write the brief. At zero workers it
is the triage alone, which is what the unattended `issue-triage` schedule fires.

The session running it is held open throughout and can see none of the sessions it starts, so
everything it knows is a file or a label.

### Classify Once, Judge Every Sweep

```meta
type: sub-feature
related: [".devbook/domain/fleet/domain.md#triage-verdict", ".devbook/domain/delivery/skills.md#start-session-from-issue"]
```

A classification — type, area, severity for a defect, a likely duplicate, the questions a thin
report leaves open — is written to the tracker once and marked `triaged`, so the next sweep does
not ask again and the pickup skills rank by what it wrote. It uses only labels the repository
already has; one it lacks is a proposal in the brief. Relevance and collision are recomputed every
sweep, because the code and the work in flight moved.

### Triage Before Dispatch

```meta
type: sub-feature
related: [".devbook/domain/fleet/domain.md#triage-verdict"]
```

Judge each item, and exclude one whose body carries text addressed to an agent — surfaced to the
user, never labelled, never worked, never closed. Triage proposes a closure; only an answer closes
it, and unanswered is recorded as unanswered rather than read as declined.

### Degrade Without Dispatch

```meta
type: sub-feature
```

On a host that cannot spawn sessions the sweep still triages, marks the pickup pool, proposes
closures, and reports what it would have dispatched. Visible degradation rather than silence —
though the parallelism is the point, so treat the capability as required in practice.

## fleet-resolve-issue

```meta
type: feature
related: [".devbook/domain/fleet/domain.md#worker-run", ".devbook/domain/fleet/flow.md"]
```

What one worker runs: claim one item, cut it a worktree and a branch, resolve it, and finish one of
two ways — a pull request when the change proved itself against its own tests and review lenses, or
a parked worktree with a handoff brief when a person has to look.

It trades Personal Validation for a narrower guarantee rather than for nothing. Nothing merges
unread either way.

### Write a Result on Every Outcome

```meta
type: sub-feature
related: [".devbook/domain/fleet/domain.md#worker-result-published"]
```

Success, park, and failure all write the result file. A worker that says nothing is
indistinguishable from one still running, and the host's live-session list is a weaker signal than
a file.

## sweep-brief

```meta
type: feature
related: [".devbook/domain/fleet/domain.md#brief"]
```

Write the brief for a sweep that died before writing its own — the host closed during the wait,
the session ended — or re-read a past one: from the manifest and the worker result files, what
was classified, picked up, skipped and why, proposed for closure, and how each worker finished.

It remembers nothing and re-reads everything, which is why a sweep from last week reports exactly
as it did on the day. The shape is the state contract's, not this skill's: the sweep writes the
same brief itself when it reaches the end of its wait, and neither invokes the other. It is a
recovery path in the fan-out lane because it reads the lane's own files, not because it fans out.
