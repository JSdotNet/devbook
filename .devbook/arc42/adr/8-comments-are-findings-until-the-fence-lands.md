# 8. Comments Are Findings Until the Fence Lands

```meta
date: 2026-09-04
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/plugin-authoring/domain.md#extension-namespace", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md"]
```

`devbook-collaboration` records a comment as one single-line finding in the chapter's
`ext.devbook-collaboration.open-<n>` key. No author, no replies, no quoted passage, no thread.

The design it implements has a richer answer: a second fenced `annotation` block in the chapter
body, carrying `author`, `date`, `kind`, `quote`, and a `replies` list, anchored by position and
swept when resolved. That block is an L0 feature — it belongs to `devbook`, and `devbook` has
not built it. Two ways to reach it were open, and both were refused. Building the fence from
here would put a schema element into `devbook`'s files from a plugin above it, which is the one
thing the layering forbids. Building a threaded store inside `ext` instead would be a rival
implementation of a mechanism already designed, with a migration owed to every repository that
adopted it.

So the third option: record the smallest thing that survives a session. A finding is one key
because the block grammar splits a bracketed list on every comma, including inside quotes — a
sentence written as a list entry comes back in pieces — and one key per finding gives each its
own line and its own diff hunk, which is what the fence design wanted from threads anyway.

Consequence: a question here loses who asked it and cannot be replied to in place; the exchange
happens in the pull request, and only the unresolved residue stays on the chapter.

**Superseded in part, 2026-09-04.** `devbook` 3.1.0 ships the fence: the schema and placement
rule in `devbook-annotations.md`, the parse and lint in `metadata.mjs`, the
derived `_meta/annotations.json`, and `annotations.mjs` as the one writer. So the premise this
decision rested on — that L0 has not built it — no longer holds, and the reason to keep findings
in `ext` is gone with it.

**Closed, 2026-09-09, in `devbook-collaboration` 0.5.0.** The L1 half moved, and the migration
was the one this decision already named: every `open-<n>` becomes one fence with `body` set
from the line and `author` unknown, placed against the chapter rather than a passage, because a
finding never recorded which passage it was about. The namespace keeps `review`, `reviewer`,
and `review-at` and has no fourth key; `UPGRADING.md` carries the conversion for a repository
that already has findings on disk.

Two things the single-line key could not do arrive with the fence, and both are behaviour, not
presentation. An open `kind: question` on an `approved` chapter is an error in `devbook`'s own
check, so an approval standing over an unanswered finding now fails the gate instead of being
silent. And a resolved note has to be swept, which
[record 60](60-the-annotation-lifecycle-ends-in-devbook.md) puts in `devbook` rather than here.

Two divergences from the design were taken deliberately. It says "knowledge-base is at 0.14.0;
this is the next minor — or devbook 0.1.0, if the rename wave lands first"; the rename landed
and the plugin was already at 1.0.0, so the next minor here is 1.1.0. And it closes with
"nothing under `.arc42` and no plugin file changes until the direction is agreed" — the
direction was agreed in the session that asked for the build, and this paragraph is the record
of that.
