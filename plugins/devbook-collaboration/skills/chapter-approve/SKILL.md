---
name: chapter-approve
description: 'Run the approval decision on a devbook chapter — show the chapter itself with its open annotation fences, flags first and any note raised since approved-at named as such, take approve, revise, or decline from a person, and on approval write devbook''s own status: approved rung with approved-by and approved-at while clearing the collaboration state. Use when: approving a chapter, signing off a specification before it becomes work, recording who approved what, weighing objections raised after an approval, or lifting an approval that has gone stale. Triggers on: "approve this chapter", "sign off on this", "record the approval", "is this approved", "the approval is stale", "what was raised since the approval".'
---

# chapter approve

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Turn a cleared review into devbook's recorded decision, or refuse to. This is
the one place `status: approved` is written, and it is never written without a
person choosing it in this session.

`status`, `approved-by`, and `approved-at` are devbook's fields, and so are
the `review`, `reviewer`, and `review-at` this skill clears — see
`devbook-chapter-metadata.md`. So is the annotation fence a finding is written
as: `devbook-annotations.md`.

This file exceeds the 40-line body budget on purpose. Most of what is over is
the confirmation before a recorded decision and the three outcomes it can take,
which the authoring rules exempt from terseness: a fragment here is what turns
"nobody answered" into an approval.

## Steps

1. **Show the chapter itself**, not a summary of it, together with its current
   `review` state and every open note on it — `annotations.mjs list --chapter
   <path#slug> --status open`, each with its author, date, kind, and body,
   ordered by kind: questions, then flags, then suggestions and comments. When
   the chapter carries `approved-at`, mark every note dated after it as
   **raised since the approval** — those are the objections the approval never
   saw. Read the chapter, never `_meta/annotations.json`: the index is
   refreshed on a schedule, so the note written on this branch an hour ago is
   exactly the one it lacks. A summary is not what is being approved, and a
   person cannot approve what they have not read.

2. **Say plainly what stands in the way**, if anything:

   | Condition | Say |
   |---|---|
   | An open `kind: question` fence remains | Which questions are open, and that this chapter **cannot** be approved over one — devbook's check reports that as an error. Answer and resolve it first |
   | An open `kind: flag` remains | Which flags, verbatim. A flag is the loudest remark a note can be and the first reason to choose revise; it does not block, because only a question outranks `status` |
   | Another open fence remains | Which notes are open, and that approving now approves a chapter somebody has remarked on |
   | `review` is absent or `requested` | Nobody has reviewed this yet |
   | `status: approved` already, with open notes dated after `approved-at` | The approval stands over objections it never saw. List them; the decision is whether it still stands — see step 3 |
   | `status: approved` already, unchanged since `approved-at`, nothing raised since | It is already approved; there is nothing to decide |

   Only the first row blocks the decision, and it blocks it because an open
   question means the chapter is not agreed, whatever `status` says. The rest
   are what the person weighs. State them and let them choose.

   **Unchanged** in the last row is established, not assumed: where the chapter
   carries `approved-hash`, compare it with `chapter-hash.mjs <path#slug>` —
   equal is unchanged, different is a lapsed approval and step 4 is a new
   decision. Where it carries none, say that you are reading the file's history
   rather than the chapter's content, and that a chapter in a busy file reads
   as changed when it is not.

3. **Ask for the decision** and wait for it. Three outcomes, and no default:

   | Outcome | Do |
   |---|---|
   | approve | Step 4 |
   | revise | Leave `status` alone. Record what they want changed as one annotation fence each, `--author` the person who asked, set `review: changes-requested`, `reviewer` to the author, `review-at` to today, and stop |
   | decline | Leave the chapter as it is. Report the reason to the user and stop; declining records nothing on the chapter, because a chapter nobody approved is the ordinary case |

   On a chapter already approved with notes raised since, the same three
   outcomes mean: approve — the approval stands, write nothing and say so;
   revise — lift the approval per **Lifting a stale approval** below and, in
   the same change, set `review: changes-requested`, `reviewer` to the author,
   `review-at` to today, over the notes as they are; decline — leave the
   chapter as it is, approval and notes both, for whoever answers them.

   Never infer approval from silence, from a cleared review, or from the
   chapter looking fine. If nobody answers — an unattended run, a scheduled job
   — stop and report the chapter as awaiting approval. That is the whole point
   of the gate.

4. **Write the approval** in one change:

   ```text
   status: approved
   approved-by: @jsdotnet
   approved-at: 2026-09-03
   approved-hash: sha256:2e153b20
   ```

   `approved-by` is the person who just chose it, never the reviewer by default
   and never you. Write `approved-hash` where the repository's other approved
   chapters carry one, taking the value from
   `chapter-hash.mjs <path#slug>` and never computing it yourself; omit it
   where they do not. In the same change, delete `review`, `reviewer`, and
   `review-at` from the chapter and sweep its resolved notes —
   `annotations.mjs sweep --chapter <path#slug>`. The decision is now the
   record, and both the review state and an answered note are stale by
   construction on an approved chapter; devbook's check refuses review state
   on an approved chapter.

5. **Report** the chapter, who approved it, and the day. Commit the chapter with
   its metadata, and stop.

## Lifting a stale approval

An approval is of what was read. When the chapter's content changed after
`approved-at`, the rung is no longer true and devbook's own rule is that it
comes out. Drop `status` back to the chapter's ordinary rung, delete
`approved-by`, `approved-at`, and `approved-hash` in the same change, and say
what changed since the approval. The same lift is the revise outcome on an approval a person has
chosen not to let stand over notes raised since it. Do not re-approve it here —
that is a new decision, and it starts at step 1.

An acceptance stands on the approval, so lifting one lifts the other: where the
chapter also carries `status: accepted`, say so before lifting, and delete
`accepted-by`, `accepted-at`, and `accepted-hash` in the same change. Accepting
again is `chapter-accept`, over the re-approved content.

## Do not

- Do not approve on your own judgment, however clear the chapter is.
- Do not write `approved-by` or `approved-at` without `status: approved`, or the
  rung without both — devbook reports either half left alone.
- Do not leave review fields or resolved notes behind on an approved
  chapter, and never sweep an open note to clear the way for an approval.
- Do not approve a chapter to unblock a flow. An unapproved chapter parks the
  run; that is the designed outcome, not a failure to route around.
- Do not refuse over a flag. Only an open question blocks; a flag is shown,
  first, and weighed by the person.
