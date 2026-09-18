---
name: verify-change
description: 'Check a devbook chapter against the code that implements it and report the drift verdict — aligned, code-ahead, spec-ahead, conflict, or unresolved — per chapter, without writing a chapter or a brief. Covers the same six kinds as sync-specs and apply-change: aggregate, domain-service, feature, setting, building-block, design-component. Use when: is the chapter still true, did the code drift from the spec, does the implementation match what we agreed, spec code drift, check before a review or a pull request, which side moved. Reads source and unit tests only; runs nothing and changes nothing. DO NOT USE FOR: writing the chapter (sync-specs) or implementing the delta (apply-change) — it names which of those the verdict calls for.'
---

# verify-change

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`. Nothing in them is repeated here.

**Kind.** Decided as `sync-specs` decides it: the chapter's `type`, or the
file where the folder has none. One kind per run; a scope may hold several
chapters of it — an aggregate with everything it owns, a bounded context's
features, the whole building block view.

**Inputs.** The chapter or chapters as `<path>#<heading-slug>` or by heading,
the bounded context where the kind has one, and the repository root.

## Steps

1. Load the protocol and the kind's file. Read only the chapters in scope and
   what the kind's file says comes with them.
2. Resolve each counterpart by the protocol's ladder; record the rung.
3. Read the implementation and its unit tests, as the kind's file directs.
   Only code that executes and tests that pass are evidence. Do not start the
   application: a `feature` is verified from code and tests here, and the run
   belongs to `sync-specs`.
4. Reach exactly one verdict per chapter, with the evidence that settles it,
   specific enough to re-check.
5. Close with the protocol's report table, `aligned` rows included, and stop.
   The `Action` column names what the verdict calls for and nothing is done:
   `code-ahead` calls for `sync-specs`, `spec-ahead` for `apply-change`,
   `conflict` and `unresolved` for the question put to the user.

## Do not

- Do not write a chapter, a brief, an `annotation` fence, or a `tests` entry.
- Do not resolve a `conflict` by picking a side, or an `unresolved` by guessing.
- Do not touch a `status` line. A verdict is a report about drift, never about
  agreement.
