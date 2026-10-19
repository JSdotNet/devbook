# 10. The C4 Rules Run Ahead of This Devbook

```meta
date: 2026-10-20
severity: low
status: planned
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/c4-model.md", ".devbook/arc42/building-blocks/devbook.md#c4-model", ".devbook/arc42/adr/README.md", ".devbook/arc42/tdr/README.md"]
```

**Owner:** the maintainer

## The debt

```meta
```

`devbook-arc42.md` now states the [C4 model record](../adr/c4-model.md): a `workspace.dsl`,
views embedded as `c4:<key>`, a three-column History table headed `Date | Change | Why`, and a
debt record carrying `severity` and a `status` on its own ladder. This repository's own devbook
keeps only part of that yet:

- It has no `workspace.dsl`, so its building blocks and runtime chapters still draw their
  structure in Mermaid.
- Every decision record but the C4 model record keeps the two-column `Date | Change` table.

The `032-c4-workspace` migration moved every debt record's severity and remediation state
into its `meta` block, as the [index](README.md#severity-and-state-live-in-meta) explains.

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

Adopt the C4 model in this devbook once the check reads it: run the migration that ships with
the check, write the workspace, embed the views, and split each History row's reason into its
own column. The trigger is the check accepting the C4 fields, and the plan that delivers the
model already carries that step.
