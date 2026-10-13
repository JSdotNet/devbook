---
name: chapter-handoff
description: 'Hand a devbook chapter to a named reviewer with the brief they start from — what changed, what to judge, which neighbouring chapters to read. Writes nothing into the chapter. Use when: asking someone to review a chapter, passing devbook work to another person or session, parking a chapter on a decision you cannot make ("hand off this chapter").'
---

# chapter handoff

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Request a review of one chapter and hand back the brief that carries the ask.
This is the author's half of the pass; `chapter-review` is the reviewer's.

The chapter records no review state, per `devbook-chapter-metadata.md`: the ask lives in the
brief and wherever the user sends it, and what is still open in the chapter's annotation fences.

## Steps

1. **Resolve the chapter.** Take a `<path>#<slug>` address, or resolve a
   description to one. A heading with no `meta` block is not addressable — give
   it one before handing anything off.

2. **Pick the reviewer.** Ask who, and take a handle, a name, or a role. Never
   invent one and never default to the author. If nobody can say who owes the
   answer, resolve that first rather than sending a brief addressed to nobody.

3. **Leave the chapter as it is.** Write no field for the request, and leave
   every open note from an earlier pass where it is; a finding is resolved by
   answering it, not by handing the chapter on.

4. **Build the brief** and give it to the user as the message to send. Five
   parts, in this order, and nothing else:

   | Part | Content |
   |---|---|
   | The ask | The reviewer, the chapter address, and the one judgment being asked for |
   | What changed | The commits touching this chapter since its last `approved-at`, or since it was created |
   | Context to load | The chapters reachable in one step through `related` and `depends-on`, by address |
   | Evidence | The chapter's `tests` entries, and any claim in it that has none |
   | Still open | Its open annotation fences, by ordinal, author, and body |

   Walk the graph for the third row; never search the folder.

5. **Report** the chapter, the reviewer, and the brief, and stop. There is
   nothing to commit. Do not notify anyone, open an issue, or post the brief
   anywhere — handing the brief back is the deliverable, and the user chooses
   where it goes.

Never review the chapter in the same pass: requesting and answering are moves by different
people, and doing both is how a chapter gets approved by the person who wrote it.
