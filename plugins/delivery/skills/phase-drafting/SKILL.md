---
name: phase-drafting
description: "Drafting phase of flow-spec: writes the chapter, decision record, or debt record scope settled, through the folder's agent and instruction files. flow-runner only."
---

# Phase: Drafting

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**
- Drafts the chapter through the folder's agent
- Links decision and debt records instead of restating them

**Doesn't**
- Set the approved status
- Touch code

`flow-spec`, after `phase-scope`, and again whenever the ready check or a gate's `revise` sends
the run back. It runs delegated, per `resources/phase-resolution.md`, resolved under
`phase-drafting:<folder>` — the folder scope derived — then `phase-drafting`, then the
session. No agent resolved: the flow-runner drafts inline under the same files.

## Context

Loads the brief: the scope record — folder, chapter kind, goal — and its chapter list, plus the
open items on a retry round. Then the instruction files that govern the target path, read
directly because a rule fires only when a host opens a matching file and a new chapter has
none yet: `.agents/rules/devbook-<folder>.md`, `devbook-chapter-metadata.md`, and
`devbook-writing.md`. Never a folder whole, an `annotation` fence, anything under `_meta/`, or
source code.

## Steps

1. **Write to the kind scope settled.** For `arc42/`, a proposal is a decision record in
   `proposed` status, never a loose document.
2. **Follow the folder's instruction files** for structure, template, and status, and write
   each touched chapter's `meta` block in the same edit.
3. **Link, never restate,** a decision or debt record. Keep terms to the ubiquitous language
   in `domain/` where the repository keeps one.
4. **Cite what lies outside the repository.** For `arc42/` and `tech/`, when a claim about an
   external technology, API, or standard decides the draft — a decision record's options, a
   rating — ask the `research-brief` skill when it is available and carry its citations into
   the chapter. Without it, cite the primary source for each such claim or mark it unverified.
5. **On a retry round,** fix exactly the open items the brief names, nothing else.
6. **Leave the decision rung alone.** `approved` is a person's answer at a gate.

## Output

Return the changed files with one line each on what changed, and every status the draft set.
Make no surface calls: the flow-runner reports the `Drafting` stage and renders the draft, per
**Reporting Contract** in `resources/surface-contract.md`. Its place in the order:
`resources/flow-phases.md`.
