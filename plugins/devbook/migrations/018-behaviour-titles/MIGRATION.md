# 018 — behaviour files are titled by kind

```meta
contractVersion: 18
appliesTo: [domain]
breaking: no
```

## What

A bounded context's behaviour files are titled by what they hold, not by the context:

| File | Title |
| --- | --- |
| `requirements.md`, `requirements.<name>.md` | `# Requirements` |
| `domain.invariants.md`, `domain.<name>.invariants.md` | `# Invariants` |

The script rewrites the `#` title of each one that says anything else. Every other `domain/`
file keeps the context name.

The same contract takes `#### Scenario:` off an `### Invariant:`. An invariant is a claim in
the domain's words, its rejection code in parentheses where there is one, an optional sentence
of why, and `Enforced at:`, proved by the `unit` test in `tests`. The script does not touch
scenarios: one an older invariant carries stays, and the checker no longer asks for one.

## Why

A menu that lists pages by title showed the context name three times — the context, its
requirements, its invariants — with nothing to tell them apart. The folder already names the
context. Given/When/Then under an invariant restated the claim in event terms, and the unit
test already names the case. The record is `.devbook/arc42/adr/chapter-schema.md` in the
marketplace.

## What breaks

Nothing. A file's title is not an address — a file is referenced by its path — so no
reference changes, and an old title still validates. The migration exists because reconcile
never rewrites an authored chapter, so without it the old titles would stay.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while a behaviour file carries another title and `0` when none does. It
writes nothing. Drop the flag to apply. Running it twice changes nothing. Both forms take
`--root <path>`, defaulting to the working directory.

## What the script does, and does not

It reads each context folder under `.devbook/domain/`, finds the four file shapes above, and
replaces the first `#` heading outside a fence. It writes each file back with the line endings
it had. It skips a file with no `#` title, the legacy `invariants.md` that
`017-invariants-under-domain` moves, and `_meta/`. It never removes a scenario.
