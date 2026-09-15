---
name: tech-update
title: Technology graph refresh
cadence: weekly
cron: "0 4 * * 3"
target: devbook:devbook-tech-update
requires: [devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `devbook-tech-update` over every `.tech` layer the repository has. If there is no `.tech`
folder, say so and stop.

The skill routes its edits through the `.tech` flow, which ends at a gate nobody here can pass.
When `flow-spec` is available, run it and park at the gate: the change goes up as a draft pull
request carrying the handoff brief. When it is not, apply the edits directly under
`devbook-tech.md`, regenerate the indexes with `--scope .tech`, and open the pull
request as a draft — every chapter it touched needs a person's read either way.

Title it `docs(tech): weekly technology graph refresh <YYYY-MM-DD>`. Leave the temporary
inventory JSON out of the commit unless the repository documents it as durable evidence.
