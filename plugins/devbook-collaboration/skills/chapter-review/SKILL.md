---
name: chapter-review
description: 'Review one devbook chapter and record the verdict on the chapter itself — check it against its folder''s rules, the neighbours it links to, and the evidence it claims, then write each unresolved finding as an annotation fence beside the passage it is about and set the review state. The reviewer''s half of a hand-off. Use when: reviewing a devbook chapter, answering a review request, checking whether a chapter is still true, or resolving findings someone left on one. Triggers on: "review this chapter", "review the domain model", "is this chapter still accurate", "answer the review", "resolve the open findings".'
---

# chapter review

## Purpose

Review one chapter and leave the verdict where the next reader will find it: in
the chapter's own `meta` block. Findings are recorded, not merely reported, so
an unanswered question survives the session that raised it.

State keys and the three review states are in
`../../rules/chapter-collaboration.md`. A finding is an annotation fence, not a
key — devbook's `devbook-annotations.md` has its schema and lifecycle, and
`tools/devbook-meta/annotations.mjs` is the only thing that writes one. Read
both first.

This file exceeds the 40-line body budget on purpose: the lens table in step 3
is one row per thing a chapter can be wrong about, and a review that skips a
lens is a review that misses the finding.

## Steps

1. **Load the chapter and its neighbours.** Read the chapter, then the chapters
   one step away through `related` and `depends-on`. Walk those edges; never
   search the folder. Load nothing else — a review is scoped to what the chapter
   claims and what it leans on.

2. **Read the existing notes.** List them, and take every open one as input to
   this pass, exactly as a pull request's unresolved comments would be —
   questions to answer, never facts about the domain:

   ```
   node .github/tools/devbook-meta/annotations.mjs list --chapter <path#slug>
   ```

   Whoever raised one, it counts. A question somebody else left open is still a
   hole in the chapter.

3. **Review through each lens** that applies to the chapter's folder:

   | Lens | Ask |
   |---|---|
   | Truth | Does the chapter still describe what the code and the product actually do? |
   | Evidence | Does every claim that could be proven carry a `tests` entry, and does the named test still exist? |
   | Edges | Does every `related` and `depends-on` target resolve, and is each one a real relationship rather than a stale one? |
   | Vocabulary | Are the terms the ones `domain.md` defines, used the way it defines them? |
   | Status | Does `status` match reality — a `draft` that shipped, a `deprecated` still in use, a `.tech` rating nobody has revisited? |
   | Scope | Does the chapter say one thing, or has a second subject grown inside it that wants its own chapter? |
   | Gaps | What does a reader need that the chapter does not say? |

   Report every finding with its severity, the evidence for it, and the change
   that would settle it. Skip style — a review that files a wording preference
   next to a wrong invariant has buried the invariant.

4. **Resolve what you can.** Fix what is unambiguously wrong and within the
   chapter, in the same change. For each note you actually settled, `reply` with
   the answer and then `resolve` it — the reply is what makes the exchange
   readable in the pull request that raised it. Leave a note that needs a
   decision, needs the author, or needs work outside the chapter: one you read
   but did not act on stays open for whoever raised it.

5. **Write each remaining finding as a fence**, one per objection, `--author`
   yourself, `--after` naming the passage when it is about one:

   ```
   node .github/tools/devbook-meta/annotations.mjs add --chapter <path#slug>        --after "<the passage>" --kind question --author <you> --body "<the finding>"
   ```

   `--kind question` when the chapter cannot be judged until somebody answers;
   `suggestion` or `flag` otherwise.

6. **Write the verdict** into the chapter's `meta` block. Set `review-at` to
   today and `reviewer` to yourself as the reviewer of record:

   | Outcome | Write |
   |---|---|
   | An open fence remains | `review: changes-requested` |
   | None does | `review: cleared` |

   `cleared` says the chapter is ready for a person to approve. It is not the
   approval — see `chapter-approve`.

7. **Report** the findings, the verdict, and what you changed. Commit the
   chapter, its notes, and its metadata together, and stop.

## Do not

- Do not write `status: approved` from here. A review that could approve itself
  is not a gate, and the rung is `chapter-approve`'s to write.
- Do not treat a note as chapter content, and do not carry one into a change
  brief, a specification, or any other chapter. An open question is a reason to
  stop, not a line item to implement.
- Do not close a finding you did not settle, and do not sweep a resolved one
  here — the answer has to survive into the pull request that raised the
  question. Sweeping is `devbook:annotation-sweep`, before the branch merges.
- Do not widen the review to the folder. One chapter and its neighbours; a
  folder-wide sweep is `chapter-review-queue`.
