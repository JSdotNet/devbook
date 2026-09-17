# 6. sync-specs Borrows a Name OpenSpec Uses for Something Else

```meta
date: 2026-09-15
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/domain/devbook/skills.md", ".devbook/domain/devbook/skills.md#sync-specs", ".devbook/domain/devbook/domain.md#spec-converter"]
```

**Remediation state:** identified · **Severity:** low · **Owner:** the maintainer

## The debt

```meta
```

The [devbook skills](../../domain/devbook/skills.md) name the three
converters after OpenSpec's verbs so a reader who has met OpenSpec first needs no translation.
Two of the three earn that: `apply-change` implements an agreed spec there and here, and
`verify-change` is report-only there and here. The third does not. OpenSpec's `sync-specs`
merges the spec *deltas* a proposal already wrote into the main `specs/` folder; it never reads
source. Devbook's `sync-specs` reads source and unit tests and writes the chapter from them —
a move OpenSpec has no skill for at all, because there specs lead and code follows.

So the name says "the specs catch up" in both places and means a different feeder in each. A
reader arriving from OpenSpec expects a merge of something already written and gets a capture
from code; a reader arriving from this plugin's own protocol, which has called the direction
**capture** since it was written, meets a skill that is not called that.

## Origin

```meta
```

Taken on 2026-09-15, in the change that named the three converters. The verb was kept on the argument that
"bring the specs level with what is true" describes both feeders and that a third OpenSpec name
was worth more than an exact one. `capture-specs` — the protocol's own word — was the
alternative on the table and was not taken, so this record holds it rather than losing it.

## Affected components

```meta
```

`devbook`: the skill `sync-specs`, its description, the protocol's two-word vocabulary
(*capture* / *apply*), the five kind files' `## Capturing — sync-specs` sections, the
session-start hook and its twin, `README.md`, and the three devbook chapters that name it.
Nothing outside the plugin: no flow names the skill, and no repository payload carries it.

## Impact

```meta
```

Nothing is broken. The cost is one mismatched expectation per new reader, and the protocol
using a word for the direction that its skill does not use for itself. Neither grows: the
skill's own description says what it does in its first line.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Keep `sync-specs` | Three OpenSpec names, one of them approximate. Costs a sentence in the README and this record |
| Rename to `capture-specs` | The protocol's own word, and no false cognate. Costs a second rename of the same skill inside a week, an `UPGRADING.md` entry, and one OpenSpec name fewer — the direction OpenSpec does not have is then visibly the one it does not have |
| Rename to `capture` | Shortest and the protocol's word exactly, at the cost of the `-specs` / `-change` object pattern the other two names follow |

Decide after the three names have been used in anger for a while. The trigger is a reader —
or the maintainer — reaching for `sync-specs` and expecting a merge, or reaching for
`capture` and finding nothing.

**Trigger:** the first confusion between the two meanings, or the next `UPGRADING.md` entry
for devbook that would carry a rename anyway.
