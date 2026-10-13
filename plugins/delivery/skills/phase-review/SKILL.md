---
name: phase-review
description: "Review phase of flow-code: one fresh-context reviewer per slice — the repository's rules, then smells, then correctness — every finding cited, never edits. flow-runner only."
context: fork
model: opus
effort: high
---

# Phase: Review

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Does:

- Runs in tandem with implement: the flow-runner alternates the two forks per slice until the slice is clean
- One fresh-context reviewer: the repository's rules, then the smell baseline, then correctness
- Cites every finding (file:line plus rule, smell or failure scenario)
- Sends blockers back to implement within the retry budget

Doesn't:

- Edit code
- Check conformance to the spec (spec-check does)

**Perform this review directly.** Do not invoke any review skill — `/code-review` included — and do not start a sub-agent. A reviewer that delegates recurses.

## Context

Loads the brief's slice and run folder, the diff against the merge base with untracked files, the rule files whose `paths` match the changed files, the guideline ADRs the scope names, `../../resources/smell-baseline.md`, and — read on demand — the callers and tests of changed symbols. On a fix round, also the previous `review.md`. Never loads the spec, the implementer's reasoning, or the run transcript. Refuse a brief that asks for more.

## Steps

1. **Pin the diff.** `git merge-base HEAD <base>` with the base the brief names; diff the working tree against it, and read every untracked file (`git ls-files --others --exclude-standard`) in full — nothing is committed yet. Limit it to the slice's paths. A bad ref blocks; an empty diff returns "nothing to review" with no findings. On a fix round, review only the delta since the previous round, and mark each earlier blocker `fixed` or `open`.
2. **Rules.** The repository's instructions (`AGENTS.md` and its host twins), `.agents/rules/*` matching the changed paths, the named guideline ADRs, and architecture tests. A breach is a `rule` finding, a blocker. Skip what a linter, formatter, or analyzer already enforces.
3. **Smells.** The twelve in `../../resources/smell-baseline.md`, only where step 2 says nothing. A `smell` finding is advisory and carries its fix.
4. **Correctness**, reading callers and tests where a change reaches them. A `bug` names a concrete failure: this input or state, this wrong result. It is a blocker. Plausible without one is a `risk`, advisory.
5. **Cite or drop.** Every finding carries `file:line` and the rule's path and line, the smell's name, or the failure scenario. A finding without one is dropped, not softened.

Run no build and no suite: that is Build & Test's. Whether to loop again is the flow-runner's, against `policy.review.retryBudget` (default `1`). `policy.phases.review: false` turns this phase off, and `phase-implement` runs alone.

## Output

Append this round to `review.md` in the run folder the brief names, under `## <slice> — round <n>`:

- **Blockers** — `rule` and `bug`, each `- [kind] path:line — finding. Cites: …` with `open` or `fixed`.
- **Advisories** — `smell` and `risk`, same shape, a smell with its fix.

Return its path and this round's counts — `rule` open and fixed, `bug` open and fixed, advisories — never the findings' text; the flow-runner reports them as `blockers` under **Quality Facts** in `../../resources/surface-contract.md`, and sends the round's `<n>` as `execution.round` and its open `rule` and `bug` total as `execution.blockers` on the Review stage, per **Stage Counts** there. The flow-runner hands the open blockers to `phase-implement` as its fix brief; Personal Validation's Step 4 presents `review.md` as the code review, in those three groups, and the pull request description carries the same list. Phase order: `../../resources/flow-phases.md`.
