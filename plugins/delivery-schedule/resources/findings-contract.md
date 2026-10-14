---
name: findings-contract
description: What the review entry points share — the review checklist, the severity words, the one ranked findings table, the key a finding is deduplicated by, and the issue a finding opens. Read by schedule-review, schedule-security-review, schedule-performance-review, and schedule-merge-review.
---

# Findings Contract

## The Review Checklist

Six lenses over a diff or a scope: **correctness** — an unhandled branch, off-by-one, or empty
case, an ignored return value, a resource not closed; **behaviour** — a public contract changed
without every caller, a default moved, an error swallowed or turned into a success;
**concurrency** — shared state written without a lock, a call not awaited, a cancellation
ignored; **security** — untrusted input at a public entry point, a string-built query, missing
authorization, a secret in source or a log line; **tests** — new behaviour untested, a test
bent to pass, a suite skipped; **readability** — a name weaker than the one it replaced, dead
code, a comment the code no longer matches. A review procedure the repository ships in its own
skills folder runs beside it.

## Severity

One word per finding, ranked `blocking` > `high` > `medium` > `low`. `blocking` is wrong or
unsafe now; `high` is wrong in a case the code will meet or reachable from untrusted input;
`medium` costs something real; `low` is better, not wrong. A layer that scores differently
maps onto these four and names its own word nowhere else.

## The Key

A finding's key is `<layer>:<file>:<kind>` — `kind` a short kebab-case slug of what is wrong
(`sql-injection`, `unpinned-action`, `todo`). No line number: lines move, the key must not. Two
hits with one key are one row, at the higher severity, every line listed.

## The Ranked Table

Every layer merges into the report's *Findings* table, severity first, then file:

| Severity | Layer | Where | Finding | Issue |
| --- | --- | --- | --- | --- |

`Where` is `<file>:<line>`; `Finding` is own words, twelve at most; `Issue` links the issue
the finding opened or updated, or `—`.

## The Issue

A finding at or above the skill's threshold is tracked as one issue, never two. First list the
open issues carrying the skill's label and `automated`, and match the title
`[<Prefix>] <key>`:

- **Open already** — comment only when the severity rose; otherwise leave it.
- **None** — `gh issue create --title "[<Prefix>] <key>" --label <label> --label automated
  --label <severity> --body-file <file>`. The body holds the layer, every `<file>:<line>`, the
  severity, the evidence described in own words, and the recommended action.

The issue never holds a secret value: the kind of credential, its location, and the
instruction to rotate it before removing it from the tree.
