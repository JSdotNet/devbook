---
name: verify-change
description: 'Check devbook chapters against the code that implements them and report a drift verdict per chapter — aligned, code-ahead, spec-ahead, conflict, or unresolved — for any chapter kind, a page''s click demo included. Writes nothing. Use when: is the chapter still true, did the code drift from the spec, before a review or pull request. DO NOT USE FOR: writing the chapter (capture-specs) or implementing the delta (apply-change).'
---

# verify-change

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`. Nothing in them is repeated here.

**Kind.** Decided as `capture-specs` decides it: the chapter's `type`, or the file where the
folder has none; a `building-block` run checks `workspace.dsl` with its chapters. One kind per
run, however wide the scope — a sync unit or group excepted, per **The sync unit** in the protocol.
A `type: scenario` page is no kind: it is evidence for the requirements whose cases point at it, per **A scenario page is evidence, not a kind** in the protocol — which also says when a page is reported `stale` and when a part a case points at makes its requirement `spec-ahead`.

**Scope.** Any of: one chapter as `<path>#<heading-slug>` or by heading, a sync
unit or group, one file, a bounded context, or a whole devbook folder. A scope wider
than one chapter means every chapter of the run's kind inside it — a folder
given with no kind named takes the kind that folder's chapters carry, and says
which it took. Everything in scope lands in **one** table, `aligned` rows
included: the run's value is the shape of the whole, and a table per chapter
hides it.

**Inputs.** The scope, the bounded context where the kind has one, and the
repository root.

## Steps

1. Load the protocol and the kind's file. Read only the chapters in scope and
   what the kind's file says comes with them. Name the scope and the kind in
   the opening line, so a wide run says what it covered before it says what it
   found.
2. Resolve each counterpart by the protocol's ladder; record the rung.
3. Read the implementation, as the kind's file directs, then for each chapter
   the test files its `tests` field names at the level its type calls for —
   `unit` for an invariant, `e2e` or `integration` for a requirement. Read them
   as files: run no test and do not start the application; the run belongs to
   `capture-specs`. Only code that executes and tests that pass are evidence.
4. Reach exactly one verdict per chapter, with the evidence that settles it,
   specific enough to re-check. Mark it `unagreed` where the chapter's `status`
   says so, per the protocol's status table: a verdict against a draft is a
   verdict about a sketch.
5. Close with the protocol's report table — one table for the run, whatever
   its scope, `aligned` rows included, with its **Sync** and **Sweep** columns
   from `units.mjs` — and stop.
   The `Action` column names what the verdict calls for and nothing is done:
   `code-ahead` calls for `capture-specs`, `spec-ahead` for `apply-change`,
   `conflict` and `unresolved` for the question put to the user.

Write nothing — no chapter, brief, `annotation` fence, `tests` entry, or `status` line — and
settle no `conflict` by picking a side or `unresolved` by guessing.
