---
name: chapter-review
description: 'Review one devbook chapter, or one change, against its folder''s rules, its linked neighbours, and the evidence it claims, and post one note per objection through devbook.decision@1 — with no host bound, print the notes and write nothing. Never edits the chapter, approves, or accepts. Use when: reviewing a chapter or a change proposal, answering a review request, checking a chapter is still accurate.'
---

# chapter review

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A finding is a note in the host that keeps the chapter's workflow state, never text in the
chapter. Read `../../resources/decision.md` first: it says how the group resolves, what a note
carries, and what a caller does with no host or two. This file exceeds the 40-line body budget
on purpose: the lens table in step 3 is one row per thing a chapter can be wrong about, and a
review that skips a lens misses the finding.

1. **Load the chapter and its neighbours.** Read the chapter, then the chapters one step away
   through `related` and `depends-on`. Walk those edges; never search the folder.
2. **Resolve the group and read the open notes.** Name the host that answers; with none, say
   so and carry on. `devbook_list_notes` on the chapter's address, and take every open note as
   input — a question somebody else left open is still a hole in the chapter.
3. **Review through each lens** that applies to the chapter's folder:

   | Lens | Ask |
   |---|---|
   | Truth | Does the chapter still describe what the code and the product actually do? |
   | Evidence | Does every claim that could be proven carry a `tests` entry, and does the named test still exist? |
   | Edges | Does every `related` and `depends-on` target resolve, and is each one a real relationship? |
   | Vocabulary | Are the terms the ones the glossary or `domain.md` defines, used as defined? |
   | Rating | In `tech/` and `ai/`, does `rating` still match reality? |
   | Scope | Does the chapter say one thing, or has a second subject grown inside it? |
   | Gaps | What does a reader need that the chapter does not say? |

   Each finding carries its evidence and the change that would settle it. Skip style: a
   wording preference filed beside a wrong invariant buries the invariant.
4. **Post one note per objection**, `devbook_post_note` on `<path>#<slug>` of the passage it is
   about: `question` when the chapter cannot be judged until somebody answers, `flag` when the
   approver should read it first, `suggestion` or `comment` otherwise. Answer an open note you
   can settle with `replyTo`, and `devbook_resolve_note` it only when the chapter as it stands
   answers it. With no host bound, print each note as it would be posted.
5. **Report** the host, the notes posted, and the verdict: an open `question` is changes
   requested, none is nothing outstanding — which is not approval. Never edit the chapter, and
   never call `devbook_approve` or `devbook_accept`: a review that could approve is no gate.

On a change under `openspec/changes/<name>/`, load `proposal.md` and every delta under
`devbook-delta/` in step 1, with each delta's target as it stands and the chapters
`solution.md` names. Run `node .devbook/_tools/devbook-meta/delta.mjs --check <name>`; each
error is a finding. Post each note on the file in the change it is about.
