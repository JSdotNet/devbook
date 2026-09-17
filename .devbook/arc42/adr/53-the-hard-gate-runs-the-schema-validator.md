# 53. The Hard Gate Runs the Schema Validator

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md#index-generator", ".devbook/domain/devbook/domain.md#chapter"]
```

`validateDocument` is the only implementation of the per-block metadata rules — the status
ladders, the value shapes, the unrecognized-field sweep, a heading carrying no `meta` block —
and nothing on the `build.mjs --check` path called it. Its only callers were the tests and the
editor extension. The graph build collected reference and containment problems, so an
out-of-ladder `status`, a chapter reference pasted into `feature-flag`, and a heading with no
block all exited `0` and merged. [The Index Generator](../../domain/devbook/domain.md#index-generator)
already claimed to decide error from warning across the whole schema; it decided it across two
fields.

`buildGraph` now calls the validator once per file and folds its issues into the returned
problems with their own severity intact, so a warning stays a warning and only an error fails
a pull request.

**The seven per-block lint loops the graph ran itself are removed rather than kept beside the
validator.** It covers every one of them at file and chapter level both, so keeping both would
report each violation twice — and a gate that says everything twice is a gate people stop
reading. The cost is that a message now anchors on `## Heading (line 42)` instead of the node
id `<path>#<slug>`; the problem record still carries `path`, and a line number locates the
block more precisely for whoever has to fix it.

What the first full run over this repository found: **zero errors and 140 warnings, every one
of them the same category** — a heading with no `meta` block. All 140 are legitimate structural
headings. So no chapter needed correcting; the drift was wholly in the tool, and the sentence
in `#index-generator` saying a blockless heading is "reported and tolerated" describes the
behaviour only from here on.

Consequence: that warning class cannot be driven to zero, because the validator cannot know
which headings a folder means to be addressable — clearing it would mean adding `meta` blocks
to headings that must not have them. It costs about 280 console lines per green run, counted
once for the rollup scope and once for the folder's, and it is persisted into the `problems`
array of every committed `graph.json`. It is kept because it is one of the three cases the gate
was asked to report and it fails nothing; demoting it to an editor-only nudge is the obvious
follow-up if the noise outweighs the catch.
