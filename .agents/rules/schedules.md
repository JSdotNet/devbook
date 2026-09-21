---
name: schedules
description: What a schedule catalog entry declares, and the line it never crosses.
paths:
  - "plugins/*/resources/schedules/*.schedule.md"
---

# Schedule catalog entries

The format is authored once, in
[`schedule-catalog-contract.md`](../../plugins/delivery-schedule/resources/schedule-catalog-contract.md):
the frontmatter table, the five-field UTC `cron` at one hour minimum, `requires`, the tool
allowlist, and the four placeholders `delivery-schedule:install` substitutes. Read it before adding or
editing an entry — the contract is the copy, and this wrapper is not a summary of it.

A schedule is a trigger and never a procedure. The body names a schedulable skill and its
inputs — a `schedule-*` entry point, or another plugin's skill that picks its own input and
reports, as `prose-check` does; the steps belong to the skill it names, and the unattended rules belong to
`resources/schedule-preamble.md`, which every prompt already carries. A body that restates
either is the duplication the plugin exists to prevent — see
[The Unattended Lane Is Its Own Plugin](../../.devbook/arc42/adr/plugin-boundaries.md).

Never `target` a `flow-*` skill: no unattended run can pass a flow's gate.
