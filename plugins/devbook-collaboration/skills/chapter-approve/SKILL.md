---
name: chapter-approve
description: 'Run the approval decision on a devbook chapter, or on a change''s proposal and deltas: show the chapter with its open annotations, take approve, revise, or decline from a person, and on approve write the approved rung and sweep the notes it answered. Use when: approving or signing off a chapter before it becomes work, weighing objections raised after an approval, an approval went stale.'
---

# chapter approve

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Turn a reviewed chapter or change into devbook's recorded approval, or refuse to. Read
`../../resources/decision-gate.md` first and follow it at every step: where the rung may be
written, the three outcomes, why silence never approves, and the fingerprint are there and are
not repeated here.

This file exceeds the 40-line body budget on purpose: its condition and outcome tables are the
confirmation before a recorded decision, which the authoring rules exempt from terseness.

## Steps

1. **Show the chapter itself** together with every open note on it —
   `node .devbook/_tools/devbook-meta/annotations.mjs list --chapter <path#slug> --status open`,
   each with its author, date, kind, and body, ordered questions, then flags, then suggestions
   and comments. When the chapter carries `approved-at`, mark every note dated after it as
   **raised since the approval** — the objections the approval never saw. Read the chapter,
   never `_meta/annotations.json`: the index is refreshed on a schedule, so the note written on
   this branch an hour ago is exactly the one it lacks.

2. **Say plainly what stands in the way**, if anything:

   | Condition | Say |
   |---|---|
   | An open `kind: question` fence remains | Which questions are open, and that this chapter **cannot** be approved over one — devbook's check reports that as an error. Answer and resolve it first |
   | An open `kind: flag` remains | Which flags, verbatim. A flag is the loudest remark a note can be and the first reason to choose revise; it does not block, because only a question outranks `status` |
   | Another open fence remains | Which notes are open, and that approving now approves a chapter somebody has remarked on |
   | `status: approved` already, with open notes dated after `approved-at` | The approval stands over objections it never saw. List them; the decision is whether it still stands — see step 3 |
   | `status: approved` already, unchanged since `approved-at`, nothing raised since | It is already approved; there is nothing to decide |

   Only the first row blocks: an open question means the chapter is not agreed, whatever
   `status` says. **Unchanged** is established per the gate's *The fingerprint*; a lapsed
   approval makes step 4 a new decision.

3. **Ask for the decision** and wait for it; never infer it from silence or from a chapter that
   looks fine.

   | Outcome | Do |
   |---|---|
   | approve | Step 4 |
   | revise | Leave `status` alone. Record each change wanted as one annotation fence, and stop — the open fences are what the author answers |
   | decline | Leave the chapter as it is, report the reason, and stop |

   On a chapter already approved with notes raised since, the same three outcomes mean: approve
   — the approval stands, write nothing and say so; revise — lift the approval per **Lifting a
   stale approval** below, over the notes as they are; decline — leave the chapter as it is,
   approval and notes both, for whoever answers them.

4. **Write the approval** in one change, the hash per the gate:

   ```text
   status: approved
   approved-by: @jsdotnet
   approved-at: 2026-09-03
   approved-hash: sha256:2e153b20
   ```

   In the same change, sweep the chapter's resolved notes —
   `node .devbook/_tools/devbook-meta/annotations.mjs sweep --chapter <path#slug>` — because an
   answered note is stale by construction on an approved chapter. Never sweep an open note to
   clear the way for an approval.

5. **Report** the chapter, who approved it, and the day. Commit the chapter with its metadata,
   and stop.

## On a change

A change is approved as one review, per `devbook-changes.md`, so the steps above run over the
whole of it and record one decision on its `proposal.md`:

- **Step 1** shows `proposal.md` and every file under `devbook-delta/`, each in full, and the
  open notes of each — `annotations.mjs list --chapter <file> --status open`, no slug — merged
  into one list, questions first across the change, each naming its file.
- **Step 2** adds a row that blocks: `node .devbook/_tools/devbook-meta/delta.mjs --check
  <name>` reports an error. A delta that does not resolve is not something anyone can agree to.
  An open question in any file blocks as on a chapter.
- **Step 3** is the same three outcomes. A revise fence goes on the file the objection is about.
- **Step 4** writes the rung and its record on `proposal.md`'s file block and sweeps resolved
  notes from the proposal and every delta. Write nothing on the chapters the deltas target:
  their decision is the proposal's.

## Lifting a stale approval

Lift it per the gate's *The fingerprint*, deleting `approved-by`, `approved-at`, and
`approved-hash`. The same lift is the revise outcome on an approval a person has chosen not to
let stand over notes raised since it. Where the chapter also carries `status: accepted`, say so
before lifting, and delete `accepted-by`, `accepted-at`, and `accepted-hash` in the same change;
accepting again is `chapter-accept`, over the re-approved content.
