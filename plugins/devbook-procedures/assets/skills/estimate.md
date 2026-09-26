---
name: estimate
description: "Estimate units of work in story points off the 1/2/3/5/8/13/21 scale, sized against this repository's own reference examples. Use when: estimating, story points, sizing work, 'how big is this', giving a plan entry or an issue its effort, filling a chapter's effort:, or a caller needs points it can divide by a measured pace."
goal: "Return a story-point estimate off the 1/2/3/5/8/13/21 scale for each unit of work, sized against this repository's reference examples rather than in isolation, and name the reference each estimate was compared with."
---

# Estimate Work

Size each unit against finished work, never on its own. **Edit this file** — the reference
table below is an example to replace with this repository's own landed work; the scale and
what comes back are fixed by the wrapper's goal.

Points size work — the amount, the uncertainty, the number of places touched — never time. A
caller divides them by a pace it measures, which only works while a 3 means the same thing in
every plan.

## Reference

<!-- One finished unit per value. Replace every example row with a merged pull request or a
     finished backlog item from this repository, linked, and one line on why it is that size. -->

| Points | Reference | Why it is this size |
| --- | --- | --- |
| 1 | Example: a typo or a copy change in one file | One place, no decision, nothing to test beyond a glance |
| 2 | Example: a new field passed through one layer, with its test | One path, known pattern |
| 3 | Example: a validation rule added to an existing form and its endpoint | Two layers, one decision |
| 5 | Example: a new endpoint with its handler, persistence, and tests | Several layers, a new pattern instance |
| 8 | Example: a feature spanning UI, API, and storage, following an existing one | Many places, some unknowns |
| 13 | Example: a new integration with an external service | New dependency, real unknowns |
| 21 | Example: a new module with its own model and wiring | The largest unit this repository finishes in one piece |

## Compare

1. Read the unit as it is written — its instructions, its scope, its criteria. Do not size
   what it might grow into.
2. Find the one reference closest in kind and reach. Size up when the unit touches more places
   or carries an unknown the reference did not; down when it touches fewer.
3. Stay on the scale. Never 4, never 40. Past 21, say the unit should be split and name the
   seams rather than returning a number.
4. When two units in one call look alike, give them the same value; when one clearly exceeds
   the other, they differ. The table decides, not the order they were asked in.

## Calibrate

When a finished unit's actual size clearly differs from its estimate — reviewers call a 3 an
8 — replace the row it was compared with by finished work that really is that size. Keep one
row per value, all of it landed work. Drift in the table is drift in every pace computed
from it.

## Return

Per unit: the points, the reference row it was compared with, and a one-line reason naming
what made it larger or smaller. A unit too vague to size is returned unsized with what is
missing, never guessed.
