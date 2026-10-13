---
name: chapter-accept
description: 'Run the acceptance decision on a devbook chapter, or on a change whose steps are done and verified aligned: show the built work against the chapter, refuse over an open question or a lapsed approval, take accept, send back, or decline from a person, and on accept write the accepted rung. Use when: accepting delivered work against its chapter, signing off at a personal-validation gate, an acceptance went stale.'
---

# chapter accept

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Record that a person saw the implemented work against this chapter and
accepted it. This is the one place `status: accepted` is written, and it is
never written without a person choosing it in this session.

**A `domain/` chapter, or a change**, like the approval under it: both rungs
are on that folder's ladder and on a change's `proposal.md`, per
`devbook-chapter-metadata.md`. A target under `openspec/changes/<name>/` is a
change: follow **On a change** below.

`approved` says the specification is right; `accepted` says what was built
satisfies it. The two are a stack: an accepted chapter keeps its approval
record, and both come off together the moment the content changes. `status`,
`accepted-by`, `accepted-at`, and `accepted-hash` are devbook's fields — see
`devbook-chapter-metadata.md`.

This file exceeds the 40-line body budget on purpose, for the same reason
`chapter-approve` does: what is over is the evidence rule and the three
outcomes before a recorded decision, which the authoring rules exempt from
terseness.

## Steps

1. **Show the chapter and the evidence**, neither summarised. The chapter as it
   stands, and the built work running against it: started through the
   repository's `run` skill where it has one, and the chapter's linked `tests`
   run through the repository's test command. A
   summary of a test run is not evidence, and a screenshot of a passing suite
   is not the suite. Where neither is available, say so plainly — the person is
   then accepting on their own reading, and should know it.

2. **Say plainly what stands in the way**, if anything:

   | Condition | Say |
   |---|---|
   | An open `kind: question` fence remains | Which questions are open, and that this chapter **cannot** be accepted over one — devbook's check reports it as an error |
   | No `approved-by` or `approved-at` | The chapter was never approved. An acceptance stands on an approval; route to `chapter-approve` first |
   | `approved-hash` no longer matches `node .devbook/_tools/devbook-meta/chapter-hash.mjs <path#slug>` | The approval has lapsed, so there is nothing current to accept against. Re-approve first |
   | The evidence did not run, or ran red | What failed, verbatim. A red suite is not a reason to accept and not a reason to refuse — it is what the person weighs |
   | `status: accepted` already, fingerprint unchanged | It is already accepted; there is nothing to decide |

   Only the first three block the decision. The rest are what the person
   weighs. State them and let them choose.

3. **Ask for the decision** and wait for it. Three outcomes, and no default:

   | Outcome | Do |
   |---|---|
   | accept | Step 4 |
   | send back | Leave `status` at `approved`. Record what does not satisfy the chapter as one annotation fence each, `--author` the person who asked, and stop. The chapter is agreed; it is the build that is not done |
   | decline | Leave the chapter as it is. Report the reason and stop; declining records nothing, because a chapter nobody accepted is the ordinary case |

   Never infer acceptance from a green suite, from a merged pull request, or
   from the work looking finished. If nobody answers — an unattended run, a
   scheduled job — stop and report the chapter as awaiting acceptance.

4. **Write the acceptance** in one change, keeping the approval record:

   ```text
   status: accepted
   approved-by: @jsdotnet
   approved-at: 2026-09-20
   accepted-by: @sam
   accepted-at: 2026-09-22
   accepted-hash: sha256:2e153b20
   ```

   `accepted-by` is the person who just chose it, never you. Take
   `accepted-hash` from `node .devbook/_tools/devbook-meta/chapter-hash.mjs <path#slug>` and never compute it
   yourself; leave it out only where the repository's other accepted chapters
   deliberately carry none, and say so — a first acceptance writes it. `accepted-at` is today and is
   never before `approved-at`.

5. **Report** the chapter, who accepted it, the day, and what evidence they saw.
   Commit the chapter with its metadata, and stop.

## On a change

A change is accepted as one, on its `proposal.md`, per `devbook-changes.md`:

- **Step 1** shows `proposal.md`, every delta under `devbook-delta/`, and the
  open notes of each, as `chapter-approve` does on a change, beside the
  evidence.
- **Step 2** adds three rows that block, and on any shows what is left and
  refuses:

  | Condition | Say |
  |---|---|
  | A step in `tasks.md` is not `done` as the bound tracker's `read_item` reports it — every task ticked in a commit | Each step not done, with its state. With no tracker bound, read the same off its ticks in `tasks.md`; unknown is not done |
  | The last `devbook:verify-change` verdict is not `aligned` for every delta whose target it covers — a chapter or demo of one of its kinds, or a requirement or invariant belonging to one | Each such delta and its verdict. A `code-ahead` reported `covered by change <name>, step N` for a done step is aligned for this purpose; none run is not aligned — run it first. A delta against any other chapter — a decision or debt record, a prose `arc42/` chapter, the glossary — has no code to be measured against, so no verdict is owed: list it as the person's reading alone, and never block on it |
  | `policy["openspec.scenarios"]` is `linked` in the effective stack configuration and a scenario in a delta names no test | Each unverified scenario. Under `advisory` — the default, and what an absent key or config means — list them as what the person weighs, and do not block |

  The approval rows read `approved-hash` against
  `chapter-hash.mjs openspec/changes/<name>`.
- **Step 4** writes the rung and its record on `proposal.md`'s file block,
  `accepted-hash` from the same command and always written, and nothing on the
  chapters the deltas target. Merging the change is then
  `delta.mjs --apply <name>`, which refuses without this record.

## Lifting a stale acceptance

An acceptance is of what was read, like the approval under it. When the
content changed, both records come out in one change: drop `status` back to the
chapter's ordinary rung, delete all six fields, and say what changed. Do not
re-accept here — that is a new decision over new content, and it starts at
step 1.

## Do not

- Do not accept on your own judgment, however green the suite is.
- Do not accept a chapter that was never approved, or whose approval has
  lapsed. The rung stands on a record that has to be there.
- Do not write `accepted-*` without `status: accepted`, or the rung without
  them — devbook reports either half left alone.
- Do not delete the approval record when writing the acceptance; the two
  statements are different, and both are wanted.
- Do not accept to close a work item. An unaccepted chapter parks the item;
  that is the designed outcome.
