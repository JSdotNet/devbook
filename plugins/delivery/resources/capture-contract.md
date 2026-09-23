---
name: capture-contract
description: What evidence a flow captures for the feature being built, when it is required, what shape comes back, and how the Validation phase gets it with or without a capture skill or a QA provider bound. Engine-owned; the procedure that produces it is the repository's.
---

# Capture Contract (Engine-Owned)

Evidence is what a reviewer looks at instead of taking a run's word for it. **The phase owns
this contract, not the QA provider**, so a repository with no QA plugin, no `qa.run` binding
and no capture skill still gets every rule below. The engine says *what* is captured and
*when*; the repository says *how*.

## Who captures

Resolved in order, first hit wins, named once in the stage output:

1. **The repository's `capture` skill**, its own at `.agents/skills/capture.md`, reached by
   name through the host's wrapper. The normal case.
2. **The `qa.run` provider**, when one is bound and offers capture of its own.
3. **The phase itself**, driving the browser server directly per this contract.

Neither a capture skill nor a QA plugin is a dependency. A missing one changes *who runs
capture*, never whether it runs.

## When it is required

| Change kind | Capture |
| --- | --- |
| New functionality | **Required**, per checkpoint and per failure |
| Bug fix, or a change to existing behaviour | On failure, or when the user asks |
| Dependency, package, or SDK update | Not required unless it introduces user-facing behaviour |
| Nothing runnable | None; the phase is `skipped` |

The user asking for evidence outranks every row: an explicit request makes capture required
at any depth.

## What comes back

One entry per captured checkpoint and per failure: the scenario, what it shows, the form, and
the path. Paths resolve **relative to the git worktree root**; one outside it is rejected, so
a sub-agent in its own checkout copies evidence back before reporting it. These entries are
what the phase passes as `scenarios[].evidence`, and what Personal Validation shows the
person, per **Step 4** of `skills/phase-personal-validation/SKILL.md`.

## Name the form honestly

**A screenshot sequence is never reported as a video or a trace.** Browser servers differ in
what they can record and a given version may expose no tracing tools at all, so the form is
resolved from the live tool list per run, not assumed. Report the form actually produced.

A browser snapshot, an accessibility tree, or smoke output is **not** capture. Where a
selected depth allows a degraded result they may be cited as fallback render evidence, named
as such; they never satisfy required evidence.

## When capture is unavailable

One live preflight decides it: navigate to a target page and capture one frame before
scenarios begin. If that fails, capture is unavailable for the run.

- Where capture is **required**, the phase is `blocked` — never `done`, never `skipped`.
  Name the missing server or tool and the action that would fix it, and stop before Personal
  Validation, the pull request, the work-item update, and the Summary.
- Where it is **not required**, record the limitation in the stage output and continue.

Completing a required-capture phase through a manual or narrated substitute is the one
failure mode this contract exists to prevent.
