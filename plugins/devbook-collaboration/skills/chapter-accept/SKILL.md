---
name: chapter-accept
description: 'Run the acceptance decision on a devbook chapter, or on a change whose steps are done and verified aligned: show the built work against the chapter, refuse over an open question or a lapsed approval, take accept, send back, or decline from a person, and on accept write the accepted rung. Use when: accepting delivered work against its chapter, signing off at a personal-validation gate, an acceptance went stale.'
---

# chapter accept

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Record that a person saw the implemented work against this chapter or change and accepted it,
or refuse to. Read `../../resources/decision-gate.md` first and follow it at every step: where
the rung may be written, the three outcomes, why silence never accepts, and the fingerprint are
there and are not repeated here. An accepted chapter keeps its approval record beside the
acceptance; the two statements are different, and both are wanted.

This file exceeds the 40-line body budget on purpose: its evidence rule and its condition and
outcome tables are the confirmation before a recorded decision, which the authoring rules
exempt from terseness.

## Steps

1. **Show the chapter and the evidence**, neither summarised. The chapter as it stands, and the
   built work running against it: started through the repository's `run` skill where it has
   one, and the chapter's linked `tests` run through the repository's test command. A summary of
   a test run is not evidence, and a screenshot of a passing suite is not the suite. Where
   neither is available, say so plainly — the person is then accepting on their own reading,
   and should know it.

2. **Say plainly what stands in the way**, if anything:

   | Condition | Say |
   |---|---|
   | An open `kind: question` fence remains | Which questions are open, and that this chapter **cannot** be accepted over one — devbook's check reports it as an error |
   | No `approved-by` or `approved-at` | The chapter was never approved. An acceptance stands on an approval; route to `chapter-approve` first |
   | `approved-hash` no longer matches `node .devbook/_tools/devbook-meta/chapter-hash.mjs <path#slug>` | The approval has lapsed, so there is nothing current to accept against. Re-approve first |
   | The evidence did not run, or ran red | What failed, verbatim. A red suite is not a reason to accept and not a reason to refuse — it is what the person weighs |
   | `status: accepted` already, fingerprint unchanged | It is already accepted; there is nothing to decide |

   Only the first three rows block the decision.

3. **Ask for the decision** and wait for it; never infer it from a green suite, a merged pull
   request, or work that looks finished.

   | Outcome | Do |
   |---|---|
   | accept | Step 4 |
   | send back | Leave `status` at `approved`. Record what does not satisfy the chapter as one annotation fence each, and stop. The chapter is agreed; it is the build that is not done |
   | decline | Leave the chapter as it is, report the reason, and stop |

4. **Write the acceptance** in one change, keeping the approval record, the hash per the gate:

   ```text
   status: accepted
   approved-by: @jsdotnet
   approved-at: 2026-09-20
   accepted-by: @sam
   accepted-at: 2026-09-22
   accepted-hash: sha256:2e153b20
   ```

   `accepted-at` is today and is never before `approved-at`.

5. **Report** the chapter, who accepted it, the day, and what evidence they saw. Commit the
   chapter with its metadata, and stop.

## On a change

A change is accepted as one, on its `proposal.md`, per `devbook-changes.md`:

- **Step 1** shows `proposal.md`, every delta under `devbook-delta/`, and the open notes of
  each, as `chapter-approve` does on a change, beside the evidence.
- **Step 2** adds three rows that block, and on any shows what is left and refuses:

  | Condition | Say |
  |---|---|
  | A step in `tasks.md` is not `done` as the bound tracker's `read_item` reports it — every task ticked in a commit | Each step not done, with its state. With no tracker bound, read the same off its ticks in `tasks.md`; unknown is not done |
  | The last `devbook:verify-change` verdict is not `aligned` for every delta whose target it covers — a chapter or demo of one of its kinds, or a requirement or invariant belonging to one | Each such delta and its verdict. A `code-ahead` reported `covered by change <name>, step N` for a done step is aligned for this purpose; none run is not aligned — run it first. A delta against any other chapter — a decision or debt record, a prose `arc42/` chapter, the glossary — has no code to be measured against, so no verdict is owed: list it as the person's reading alone, and never block on it |
  | `policy["openspec.scenarios"]` is `linked` in the effective stack configuration and a scenario in a delta names no test | Each unverified scenario. Under `advisory` — the default, and what an absent key or config means — list them as what the person weighs, and do not block |

  The approval rows read `approved-hash` against `chapter-hash.mjs openspec/changes/<name>`.
- **Step 4** writes the rung and its record on `proposal.md`'s file block, and nothing on the
  chapters the deltas target. Merging the change is then `delta.mjs --apply <name>`, which
  refuses without this record.

## Lifting a stale acceptance

Lift it per the gate's *The fingerprint*: both records come out in one change, all six fields
deleted.
