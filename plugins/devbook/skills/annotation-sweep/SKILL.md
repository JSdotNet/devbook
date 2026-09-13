---
name: annotation-sweep
description: 'Delete every resolved annotation fence in a devbook chapter and nothing else, so a branch merges without carrying answered notes in its chapters and its diff. The last step of the annotation lifecycle: open means someone is waiting, resolved means answered and lives only the rest of the branch, gone is the resting state. Use when: clearing resolved notes before a pull request, tidying a chapter after a review, or when a chapter has answered comments still in it. Triggers on: "sweep the annotations", "clear resolved notes", "delete the answered comments", "resolved annotations are still in the chapter", "sweep before merging".'
---

# annotation sweep

## Purpose

Close the loops a branch answered. `resolved` is a waypoint, not a resting
state — it lives for the rest of the branch so a reviewer sees the exchange in
the pull request that raised it, and then it goes, because the prose change is
the record and git holds the rest.

The lifecycle and the rule this enforces are in `rules/devbook-annotations.md`,
under **Resolving a note means deleting it**. Read it before arguing with a
result.

## Steps

1. **Resolve the scope.** One chapter address, `<path>#<slug>`. A path with no
   slug sweeps every chapter in that file. Never sweep a folder: this skill is
   chapter-scoped because a person has to be able to look at what is about to
   go.

2. **List what would go**, and show it — each note's author, date, kind, and
   body, and the reply that answered it:

   ```
   node .github/tools/devbook-meta/annotations.mjs list --chapter <path#slug> --status resolved
   ```

   Report an empty list and stop. Nothing to sweep is the ordinary case.

3. **Sweep**, once the user has seen the list:

   ```
   node .github/tools/devbook-meta/annotations.mjs sweep --chapter <path#slug>
   ```

   It deletes every `status: resolved` fence and no open one. Never delete a
   fence by hand or with an editor pass — this tool is the only writer.

4. **Report** what went and what is left, and say that a tracked file changed.
   Offer the commit; never push, and never commit into someone's branch
   unasked.

## Do not

- Do not resolve a note here. Answering is `annotations.mjs reply` plus
  `resolve`, by whoever answered it; a sweep that could resolve its own targets
  would delete the questions nobody got to.
- Do not sweep an open note to tidy a chapter. An open note is somebody waiting.
- Do not move a swept note into the chapter as prose to preserve it. If the aside
  is worth keeping, that is an edit somebody makes deliberately, in its own change.
