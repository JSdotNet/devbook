---
name: pr-body
description: 'Write a pull request description in three sections — Summary, Evidence (before and after, with tier and validation depth), Merge Danger (one-way or two-way door, blast radius) — inside the repository''s PR template when it has one. Use when: opening a pull request, writing or rewriting its description, landing an unattended run''s draft, "/pr-body".'
---

# PR Body

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The caller's structure wins: the repository's pull request template keeps its sections, and a
caller's ordered body keeps its order. These three fill the sections that match and follow the
rest. No preamble; use the names the code and the glossary use.

## Summary

One view of the change, picked per the `show-me` skill — most often a `diff` of the tree, call
stack, or state it changes. Without `show-me`, the smallest diagram, tree, or diff that makes
the point. Then at most three sentences: why, and what the picture cannot say.

## Evidence

A **Before** and an **After** from the same check, each with its tier:

| Tier | Evidence |
| --- | --- |
| S | A screenshot, when the change is visible and the environment can take one |
| A | A test run or console output: the test that failed before and passes now, named, with counts |
| B | A build, a check, or a lint going green — the proof when nothing runs |

State the depth validation reached. Startup-only says the application started and nothing was
exercised; skipped says nothing ran and why. Evidence that does not exist is written as missing.

## Merge Danger

**Door.** Two-way: a revert undoes it. One-way: a revert leaves something changed. In a
repository with devbook a change is one-way when it ships a migration, renames a
`.devbook/config.json` key or a stamp field, deletes data, or touches a chapter whose `meta`
carries `accepted`. A one-way door links the decision record under `.devbook/arc42/adr/` that
decided it; with none, write `no decision record` — a reviewer reads that as a finding.

**Blast radius.** One word — `local`, `plugin`, `repository`, or `consumers` — then who or what
a bad merge reaches: callers, installed repositories, a running schedule, a layout.

Write the description and stop. Pushing and opening belong to the caller.
