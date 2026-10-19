# 10. The C4 Rules Run Ahead of This Devbook

```meta
date: 2026-10-20
severity: low
status: in-progress
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/c4-model.md", ".devbook/arc42/building-blocks/devbook.md#c4-model", ".devbook/arc42/adr/README.md", ".devbook/arc42/tdr/README.md"]
c4: ["marketplace.devbook.c4-model"]
```

**Owner:** the maintainer

## The debt

```meta
```

`devbook-arc42.md` now states the [C4 model record](../adr/c4-model.md): a `workspace.dsl`,
views embedded as `c4:<key>`, a three-column History table headed `Date | Change | Why`, and a
debt record carrying `severity` and a `status` on its own ladder. This repository's own devbook
follows all of it but the History table: every decision record but the C4 model record keeps
the two-column `Date | Change` table.

The rest landed. `workspace.dsl` models the marketplace as the system and each plugin as a
container, chapters 3, 5, and 6 and every building block embed its views, and each record
names the elements it is about in `c4`. The `032-c4-workspace` migration moved every debt
record's severity and remediation state into its `meta` block, as the
[index](README.md#severity-and-state-live-in-meta) explains.

## Origin

```meta
```

Taken knowingly. The rules land first in the plan that delivers the C4 model, and the check
that accepts the new fields lands after them. Until it does, `severity` is reported as an
unrecognized field and a debt rung in `status` is refused, so the records cannot follow the
rule yet. The History rows need judgment to split, because each one carries its reason inside
the change text.

## Impact

```meta
```

A reader of this repository sees the rule and an example that disagree with it. An agent that
copies a sibling record copies the old shape.

## Affected components

```meta
```

This repository's `.devbook/arc42/`: every record under `adr/` and `tdr/`, and the building
blocks and runtime chapters that will embed views.

## Remediation options

```meta
```

Split each decision record's History rows into `Date | Change | Why`, moving the reason each
change text carries into its own column. The check accepts the C4 fields now, so nothing waits
on tooling; the split needs a person's judgment row by row, which is why it did not ride along
with the migration. Once it lands, this record is resolved.
