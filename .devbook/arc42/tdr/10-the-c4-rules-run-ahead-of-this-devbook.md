# 10. The C4 Rules Run Ahead of This Devbook

```meta
date: 2026-10-20
severity: low
status: resolved
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/c4-model.md", ".devbook/arc42/building-blocks/devbook.md#c4-model", ".devbook/arc42/adr/README.md", ".devbook/arc42/tdr/README.md", ".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/devbook-skills.md#dependencies", ".devbook/arc42/06-runtime-view.md#authoring-an-asset"]
c4: ["marketplace.devbook.c4-model"]
```

**Owner:** the maintainer

## The debt

```meta
```

`devbook-arc42.md` now states the [C4 model record](../adr/c4-model.md): a `workspace.dsl`,
views embedded as `c4:<key>`, a three-column History table headed `Date | Change | Why`, and a
debt record carrying `severity` and a `status` on its own ladder. This repository's own devbook
still breaks it in two places:

- Every decision record but the C4 model record keeps the two-column `Date | Change` table,
  and the check reports each one as a warning.
- Four Mermaid flowcharts still draw between elements the workspace defines: the opening
  pictures of [devbook](../building-blocks/devbook.md) and [delivery](../building-blocks/delivery.md),
  which draw their nested blocks, the [devbook-skills](../building-blocks/devbook-skills.md#dependencies)
  dependency picture, and the authoring flowchart in
  [chapter 6](../06-runtime-view.md#authoring-an-asset).

The rest landed. `workspace.dsl` models the marketplace as the system and each plugin as a
container, chapters 3, 5, and 6 and every building block embed its views, and each record
names the elements it is about in `c4`. The `033-c4-workspace` migration moved every debt
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
with the migration. Replace each of the four flowcharts with a view of the workspace, or drop
it where the block's component view already shows the same thing. Once both land, this record
is resolved.

## Resolution

```meta
```

Resolved 2026-10-20 by the remediation the record named. Every decision record under
[`adr/`](../adr/README.md) now heads its History `Date | Change | Why`: a reason a change cell
stated as a clause of its own moved into the Why column with only its connective dropped, and
a row whose cell gave no reason reads an em dash rather than one written after the fact. A
reason woven into the decision, such as why a release is a patch, stays in Change. No decision was
reworded, and the check no longer warns about any History header.

Of the four flowcharts, two are gone, one became a view, and one was cut down. The opening pictures of
[devbook](../building-blocks/devbook.md) and [delivery](../building-blocks/delivery.md) drew
nothing their component views under *Structure* do not, so each now points there. The
[devbook-skills](../building-blocks/devbook-skills.md#dependencies) dependency picture is the
`devbook-skills-dependencies` container view. In [chapter 6](../06-runtime-view.md#authoring-an-asset)
the `authoring-an-asset` dynamic view already drew the two hosts, so the Mermaid there keeps
only the authoring steps and their loop. Those happen inside the marketplace, so the
Mermaid now stays inside one element, as `devbook-writing.md` asks.
