---
name: chapter-handoff
description: 'Hand a devbook chapter to a named reviewer and produce the brief they start from — what changed, what the reviewer is being asked to judge, and which neighbouring chapters they need. Records the request on the chapter itself so it survives the session. Use when: asking someone to review a chapter, passing devbook work to another person or session, or parking a chapter that needs a decision you cannot make. Triggers on: "hand off this chapter", "ask someone to review", "request review of", "who should review this", "park this for review".'
---

# chapter handoff

## Purpose

Request a review of one chapter and write the request into the chapter, so the
ask outlives the session that made it. This is the author's half of the pass;
`chapter-review` is the reviewer's.

State keys and their meanings are in
`../../rules/chapter-collaboration.md`. Read it first.

This file exceeds the 40-line body budget on purpose: the brief in step 4 is a
four-row lookup, and a reviewer who is handed three of the four rows starts by
asking for the fourth.

## Steps

1. **Resolve the chapter.** Take a `<path>#<slug>` address, or resolve a
   description to one. A heading with no `meta` block is not addressable — give
   it one before handing anything off.

2. **Pick the reviewer.** Ask who, and take a handle, a name, or a role. Never
   invent one and never default to the author. If nobody can say who owes the
   answer, resolve that first rather than recording `unassigned`.

3. **Write the request** into the chapter's `meta` block:

   ```text
   ext.devbook-collaboration.review: requested
   ext.devbook-collaboration.reviewer: @jsdotnet
   ext.devbook-collaboration.review-at: 2026-09-03
   ```

   Overwrite an existing request rather than adding a second — a chapter waits
   on one reviewer. Leave every open note from an earlier pass where it is; a
   finding is resolved by answering it, not by handing the chapter on.

4. **Build the brief** and give it to the user as the message to send. Four
   parts, in this order, and nothing else:

   | Part | Content |
   |---|---|
   | The ask | The chapter address, and the one judgment being asked for |
   | What changed | The commits touching this chapter since its last `approved-at`, or since it was created |
   | Context to load | The chapters reachable in one step through `related` and `depends-on`, by address |
   | Evidence | The chapter's `tests` entries, and any claim in it that has none |
   | Still open | Its open annotation fences, by ordinal, author, and body |

   Walk the graph for the third row; never search the folder.

5. **Report** the chapter, the reviewer, and the brief. Commit the metadata
   change with the chapter, and stop. Do not notify anyone, open an issue, or
   post the brief anywhere — handing the brief back is the deliverable.

## Do not

- Do not review the chapter here. Requesting and answering are different moves
  by different people; doing both in one pass is how a chapter gets approved by
  the person who wrote it.
- Do not write `status: approved` from this skill. Approval is
  `chapter-approve`'s, and only after a review clears.
- Do not record the brief in the chapter. It is transient; the durable residue
  of a hand-off is the three keys in step 3.
