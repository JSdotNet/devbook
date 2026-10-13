---
name: devbook-openspec-change
description: What an OpenSpec skill does inside openspec/changes/ when the devbook schema is in use — the artifact ids, the folders it never creates, the fields it never writes, how a step records its state, and why a change is archived through devbook-openspec:archive.
---

# OpenSpec inside the change folder

A change here is a devbook change: its shape is `devbook-changes.md`, and OpenSpec's
`/opsx:*` skills write it through the `devbook` schema in `openspec/schemas/devbook/`. This
rule is what they do differently from OpenSpec's defaults.

- **Four artifacts.** `proposal`, `devbook-delta`, `solution`, `tasks`. There is no `specs`
  and no `design`: behaviour is a delta against its bounded context's `requirements.md` or
  `invariants.md`, and how to build the change is `solution.md`. Never create `specs/` — in
  the change or under `openspec/` — and never set `skip_specs` in `.openspec.yaml` to
  anything but the `true` that `openspec new change` writes.
- **No decision.** Never write `approved`, `accepted`, or their `-by`, `-at`, and `-hash`
  fields; the approve and accept gates are the only writers. Any edit to the proposal or a
  delta after a gate lapses that gate, so decide before you change what was decided.
- **A delta is checked by devbook.** `openspec validate` accepts zero deltas for this schema
  and reads nothing in `devbook-delta/`. After every edit to a delta, run
  `node .devbook/_tools/devbook-meta/delta.mjs --check <name>`; it checks scenario pages and
  their `Proved by:` pointers across the corpus with every delta merged.
- **A scenario page is a delta.** A new page goes under `devbook-delta/domain/<context>/` as
  `delta: added`, its parts as `ADDED` entries; on a page that exists, replace a part whole,
  never step by step. A requirement it proves holds `Proved by: <page>.md#<part>` in its
  `#### Scenario:` and no steps of its own — the shape is `devbook-changes.md`'s.
- **A demo is copied in, never written.** A change carries a demo as the standalone prototype
  `/prototype` wrote, copied whole under `devbook-delta/` at the path where it lands and
  trimmed to the agreed variant; the verdict goes in the proposal's `Why`. Never author or
  edit the HTML inside the change — a revision is a new prototype of the current demo.
- **A change is one lane, not the only one.** A demo or a chapter committed straight into
  `.devbook/` in a `flow-spec` pull request is the author's choice: never report it, ask for
  a delta, or treat it as a step of any change.
- **A step records itself.** Under its `## Step N — title` heading, in this order: `delivers:`,
  `owner: me` when a person does it, then the `- [ ]` tasks. Tick a step's tasks in the commit
  that completes them; `devbook-openspec:tracker` reads the state from the ticks. A step names
  no branch and no pull request: a change is built whole, and where a pull request falls is
  decided per case, never in the change.
- **Apply refuses an unapproved change.** Never take a step while `proposal.md` is below
  `approved`, or while its `approved-hash` no longer matches
  `node .devbook/_tools/devbook-meta/chapter-hash.mjs openspec/changes/<name>`.
- **Archive through the bridge.** `openspec archive` moves the folder and merges no devbook
  delta. Run `devbook-openspec:archive`, which checks both gates, merges every delta into its
  chapter, and only then lets `openspec archive` move the folder. Never edit `archive/`.
