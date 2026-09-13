# Devbook Collaboration

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-collaboration"]
```

> Five skills. Four move one chapter through a review, and one of those four writes nothing at all;
> the fifth sits outside the pass and installs the contract. Deleting the answered notes is
> `devbook:annotation-sweep`, in the plugin that owns the fence.

## chapter-handoff

```meta
type: feature
related: [".devbook/domain/devbook-collaboration/domain.md#chapter-review", ".devbook/domain/devbook-collaboration/flow.md"]
```

Name the reviewer, set the chapter to `requested`, and produce the brief to send them. The request
survives the conversation it was made in, which is the whole point of writing it into the chapter.

## chapter-review

```meta
type: feature
related: [".devbook/domain/devbook-collaboration/domain.md#finding", ".devbook/domain/devbook/domain.md#annotation"]
```

Read a chapter against its folder's rules and its own evidence, and record the verdict:
`changes-requested` over one annotation fence per objection, or `cleared` over none open.

A verdict and its findings are written in the same change — a verdict with nothing behind it is not
a review. The fences are the evidence, so the two cannot drift without one of them being wrong.

### Clear Without Approving

```meta
type: sub-feature
```

`cleared` says nothing is outstanding. It obliges nobody and grants nothing, which is what lets a
chapter wait for an approver rather than for a reviewer.

## chapter-approve

```meta
type: feature
related: [".devbook/domain/devbook-collaboration/domain.md#approval", ".devbook/domain/devbook-collaboration/domain.md#chapter-approved"]
```

Record that a person read this chapter and approved it, in devbook's own rung with a signature and
a date, and clear this context's namespace and the chapter's resolved notes in the same change.

An open `kind: question` note blocks it outright: devbook's check reports an approval standing over
one as an error, so this is the one condition the skill refuses on rather than states.

It runs only where a person chose it in that session — never from a schedule, never as a
consequence of a cleared review, and never on the strength of a conversation a later session cannot
read.

## chapter-review-queue

```meta
type: feature
related: [".devbook/domain/devbook-collaboration/domain.md#review-queue"]
```

Sweep the adopted folders and report what is awaiting whom, and which approvals have gone stale. It
writes nothing, which makes it the one skill here that is safe to schedule.

## install

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

Put this context's one rule in the repository, with a wrapper per host, and stamp it. From then on
both hosts apply the contract whenever either opens a chapter — rather than only when one of the
four skills above names it by path.

Run it once when the plugin is enabled, and again after an upgrade.
