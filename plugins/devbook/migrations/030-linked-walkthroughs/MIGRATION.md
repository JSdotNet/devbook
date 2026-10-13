# 030 — a walkthrough a `Proved by:` case plays becomes a linked walkthrough

```meta
contractVersion: 30
appliesTo: [domain]
breaking: no
```

## What

A demo walkthrough is free or linked. A linked one names the scenario page part it plays with
`part`, embeds that part's step text, and carries the page `signature` the text was copied at;
a requirement the part proves derives it as a `demo` entry. Before linking existed, the
walkthrough that played a `Proved by:` case was written free, under the case's slug, with its
own step text that nothing kept level with the page.

For every `*.demo.html` under `.devbook/domain/`, this migration takes each free walkthrough
whose `id` is the slug of a `#### Scenario:` holding one `Proved by:` line that resolves, and
rewrites it to linked form, in the demo's `demo-model` and nowhere else:

| Value | Written from |
| --- | --- |
| `part` | The `Proved by:` line, as written where it resolves from the demo to the same page, else as the page's repository path |
| `signature` | The page's current signature |
| each step's `step` | Its position, counted from 1 |
| each step's `text` | The part step it now names, copied by `tools/scenarios/demo-sync.mjs`, keeping a leading keyword where the old text had one |

The slug is matched both ways a requirement's walkthrough id is: the heading's own anchor and
the case's name without `Scenario:`. A demo inside a change's `devbook-delta/` is not read.

Two walkthroughs the rule matches are left free, and each run lists them `not-applicable`
with the reason:

- its step count differs from the part's, so no step maps to a part step by position;
- its slug is the slug of `Proved by:` cases naming more than one part.

Link either by hand with `/prototype`, or rename it if it plays something else. A listed
walkthrough is never work left: the migration cannot move it, and nothing records it beyond
the run's output.

## Why

`verify-change` compares a linked walkthrough with the part rather than a test file, and the
checker reports its text drifting from the page; a free one under a `Proved by:` slug gets
neither, and the requirement's derived `demo` entry misses it. The record is
`.devbook/arc42/adr/demos.md` in the marketplace.

## What breaks

Nothing. A repository without `domain/` adopted records `not-applicable` in the ledger, per
`assets/reconcile-protocol.md`, and adopting it later re-evaluates the migration. A requirement
whose `demo` field names a walkthrough this migration linked keeps resolving; the checker then
warns that the entry is written by hand, since the `Proved by:` line derives it — remove it.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while any walkthrough the rule matches is still free and can be linked,
and `0` once each is linked or listed `not-applicable`, or `domain` is not adopted; it writes
nothing. Drop the flag to apply. Running it twice changes nothing. Both forms take
`--root <path>`, defaulting to the working directory, and `--scenario-folder <dir>`,
defaulting to `.devbook/scenarios`, where a page's data sets are hashed into its signature.
