---
name: chapter-approve
description: 'Run the approval decision on a devbook chapter — show the chapter itself with its open annotation fences, take approve, revise, or decline from a person, and on approval write devbook''s own status: approved rung with approved-by and approved-at while clearing the collaboration state. Use when: approving a chapter, signing off a specification before it becomes work, recording who approved what, or lifting an approval that has gone stale. Triggers on: "approve this chapter", "sign off on this", "record the approval", "is this approved", "the approval is stale".'
---

# chapter approve

## Purpose

Turn a cleared review into devbook's recorded decision, or refuse to. This is
the one place `status: approved` is written, and it is never written without a
person choosing it in this session.

`status`, `approved-by`, and `approved-at` are devbook's fields — see
`devbook-chapter-metadata.md`. So is the annotation fence a finding is written
as: `devbook-annotations.md`. The three collaboration keys this skill clears are
in `../../rules/chapter-collaboration.md`.

This file exceeds the 40-line body budget on purpose. Most of what is over is
the confirmation before a recorded decision and the three outcomes it can take,
which the authoring rules exempt from terseness: a fragment here is what turns
"nobody answered" into an approval.

## Steps

1. **Show the chapter itself**, not a summary of it, together with its current
   `review` state and every open note on it — `annotations.mjs list --chapter
   <path#slug> --status open`, each with its author, kind, and body. A summary
   is not what is being approved, and a person cannot approve what they have not
   read.

2. **Say plainly what stands in the way**, if anything:

   | Condition | Say |
   |---|---|
   | An open `kind: question` fence remains | Which questions are open, and that this chapter **cannot** be approved over one — devbook's check reports that as an error. Answer and resolve it first |
   | Another open fence remains | Which notes are open, and that approving now approves a chapter somebody has remarked on |
   | `review` is absent or `requested` | Nobody has reviewed this yet |
   | `status: approved` already, unchanged since `approved-at` | It is already approved; there is nothing to decide |

   Only the first row blocks the decision, and it blocks it because an open
   question means the chapter is not agreed, whatever `status` says. The rest
   are what the person weighs. State them and let them choose.

3. **Ask for the decision** and wait for it. Three outcomes, and no default:

   | Outcome | Do |
   |---|---|
   | approve | Step 4 |
   | revise | Leave `status` alone. Record what they want changed as one annotation fence each, `--author` the person who asked, set `review: changes-requested`, `reviewer` to the author, `review-at` to today, and stop |
   | decline | Leave the chapter as it is. Report the reason to the user and stop; declining records nothing on the chapter, because a chapter nobody approved is the ordinary case |

   Never infer approval from silence, from a cleared review, or from the
   chapter looking fine. If nobody answers — an unattended run, a scheduled job
   — stop and report the chapter as awaiting approval. That is the whole point
   of the gate.

4. **Write the approval** in one change:

   ```text
   status: approved
   approved-by: @jsdotnet
   approved-at: 2026-09-03
   ```

   `approved-by` is the person who just chose it, never the reviewer by default
   and never you. In the same change, delete every
   `ext.devbook-collaboration.*` key on the chapter and sweep its resolved
   notes — `annotations.mjs sweep --chapter <path#slug>`. The decision is now
   the record, and both the review state and an answered note are stale by
   construction on an approved chapter.

5. **Report** the chapter, who approved it, and the day. Commit the chapter with
   its metadata, and stop.

## Lifting a stale approval

An approval is of what was read. When the chapter's content changed after
`approved-at`, the rung is no longer true and devbook's own rule is that it
comes out. Drop `status` back to the chapter's ordinary rung, delete
`approved-by` and `approved-at` in the same change, and say what changed since
the approval. Do not re-approve it here — that is a new decision, and it starts
at step 1.

## Do not

- Do not approve on your own judgment, however clear the chapter is.
- Do not write `approved-by` or `approved-at` without `status: approved`, or the
  rung without both — devbook reports either half left alone.
- Do not leave collaboration keys or resolved notes behind on an approved
  chapter, and never sweep an open note to clear the way for an approval.
- Do not approve a chapter to unblock a flow. An unapproved chapter parks the
  run; that is the designed outcome, not a failure to route around.
