# Building Blocks

```meta
index: root
related: [".devbook/arc42/05-building-block-view.md", ".devbook/arc42/08-crosscutting-concepts.md", ".devbook/arc42/building-blocks/devbook-skills.md", ".devbook/arc42/building-blocks/delivery-phases.md", ".devbook/arc42/building-blocks/delivery-pr-lane.md", ".devbook/arc42/building-blocks/delivery-schedule-entry-points.md", ".devbook/arc42/building-blocks/devbook-code-sync.md", ".devbook/arc42/building-blocks/devbook-procedures.md"]
```

One file per plugin: its responsibility, the interfaces it exposes, the parts inside it, the
flows that cross it, and its dependencies in their actual direction.
[Chapter 5](../05-building-block-view.md) holds what every plugin shares — the landscape, the
folder shape, what an install leaves in a repository — and links here for the rest. The
vocabulary every block is written in is [chapter 8](../08-crosscutting-concepts.md); the terms
one block owns are in the [glossary](../12-glossary.md).

**One plugin, one block.** A plugin is the unit a host installs, versions, and can refuse to
load, so it is already the line a model cannot cross without somebody declaring it. Fourteen
files follow the fourteen plugin folders under `plugins/`, name for name.

**A block that outgrows one sweep nests the next level in.** The pull sweep sets aside any
file past forty chapters, because one agent cannot verify more against the code in one pass.
A plugin that grows past that keeps its own file as the white box and moves a part with its own
responsibility into `<plugin>-<part>.md` beside it, the way arc42 opens a level 2 block inside
a level 1 one. The part's file names its parent in its first sentence and in `related`, and
the parent links to it and restates nothing about it. Five parts have a file today:
[delivery-phases](delivery-phases.md) and [delivery-pr-lane](delivery-pr-lane.md) inside
delivery, [delivery-schedule-entry-points](delivery-schedule-entry-points.md) inside
delivery-schedule, and [devbook-code-sync](devbook-code-sync.md) and
[devbook-procedures](devbook-procedures.md) inside devbook. Raising the cap instead would hand one agent a unit too large to read whole.

**The plugins are the truth.** Each file is one sync unit: when a block and its plugin
disagree, the block is rewritten from what the plugin ships. Chapter 5 set `sync: pull` for
all of them until contract 38 took the direction out of the chapter. It is now Backlog's
direction map for this repository, per the [chapter schema record](../adr/chapter-schema.md#schedules-and-sync).

## The set

```meta
```

| Block | Layer | In one line |
| --- | --- | --- |
| [devbook](devbook.md) | L0 foundation | Addressed Markdown chapters, the `meta` block under them, the check, the reconcile that puts the convention into a repository, and the five procedures every repository has and no plugin can write — `run`, `capture`, `diagnose`, `estimate`, `prototype` — each with a goal devbook fixes and a body the repository owns |
| [devbook-code-sync](devbook-code-sync.md) | Inside devbook | A chapter and the code implementing it brought back into agreement, in whichever direction is behind |
| [devbook-procedures](devbook-procedures.md) | Inside devbook | The five things a repository knows how to do and no plugin can write, each with a goal devbook fixes |
| [devbook-derived](devbook-derived.md) | L1 on devbook | The committed `_meta/` index, its refresh paths, and the canvas that draws the graph |
| [devbook-openspec](devbook-openspec.md) | L1 on devbook | The change lane: OpenSpec installed and configured so a change is a set of deltas against the chapters, proposed, agreed, built step by step, and archived |
| [devbook-collaboration](devbook-collaboration.md) | L1 on devbook | Who owes the next move on a chapter: review requests, findings, and the approval decision |
| [devbook-skills](devbook-skills.md) | L0 foundation | Reusable guidance any plugin names and none depends on: `show-me`, a picture before the prose, `research-brief`, a cited answer from primary sources, `pr-body`, a pull request description that declares its door, and `retro`, what to change after a session went badly; and `wayfinder`, an effort too big for one session planned as a map of decision tickets |
| [devbook-config](devbook-config.md) | L0 foundation | What this stack is, what this machine has, and how this repository is wired |
| [delivery](delivery.md) | L0 foundation | One unit of work carried from request to review-ready change inside one session |
| [delivery-phases](delivery-phases.md) | Inside delivery | The closed list of phases a flow runs, and the gates a repository may add to them and never remove |
| [delivery-pr-lane](delivery-pr-lane.md) | Inside delivery | A finished change taken to merge-ready, whether a flow produced it or not |
| [delivery-schedule](delivery-schedule.md) | L1 on delivery | Work that runs with nobody watching, and the catalog of triggers that fires it |
| [delivery-schedule-entry-points](delivery-schedule-entry-points.md) | Inside delivery-schedule | The procedures a schedule fires, each picking its own input and publishing what it did |
| [delivery-surface-dashboard](delivery-surface-dashboard.md) | Surface | The live view of a run, measured by hooks rather than told |
| [delivery-surface-canvas](delivery-surface-canvas.md) | Surface | Mermaid and Markdown rendered live beside the files they came from |
| [delivery-surface-collector](delivery-surface-collector.md) | Surface | A run recorded to disk rather than watched, for unattended sessions |
| [delivery-surface-backlog](delivery-surface-backlog.md) | Surface | A run shown in the Backlog desktop app, where its work item already lives |
| [delivery-run-view](delivery-run-view.md) | Viewer | A run drawn inside Claude Code from the files the surfaces write; not a surface |
| [devbook-config-view](devbook-config-view.md) | Viewer | Every repository on this machine, its stamps against the newest and its phase maps, drawn inside Claude Code; writes nothing |

The delivery engine and devbook are the two blocks everything else serves: the engine carries
work, and devbook is what the work is grounded in and what it writes back to. The four
surfaces answer one published contract and are interchangeable, which is the whole reason
there is more than one.
