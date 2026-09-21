# Building Blocks

```meta
index: root
related: [".devbook/arc42/05-building-block-view.md", ".devbook/arc42/08-crosscutting-concepts.md"]
```

One file per plugin: its responsibility, the interfaces it exposes, the parts inside it, the
flows that cross it, and its dependencies in their actual direction.
[Chapter 5](../05-building-block-view.md) holds what every plugin shares — the landscape, the
folder shape, what an install leaves in a repository — and links here for the rest. The
vocabulary every block is written in is [chapter 8](../08-crosscutting-concepts.md); the terms
one block owns are in the [glossary](../12-glossary.md).

**One plugin, one block.** A plugin is the unit a host installs, versions, and can refuse to
load, so it is already the line a model cannot cross without somebody declaring it. Eleven
files follow the eleven plugin folders under `plugins/`, name for name.

## The set

```meta
```

| Block | Layer | In one line |
| --- | --- | --- |
| [devbook](devbook.md) | L0 foundation | Addressed Markdown chapters, the `meta` block under them, the check, and the reconcile that puts the convention into a repository |
| [devbook-derived](devbook-derived.md) | L1 on devbook | The committed `_meta/` index, its refresh paths, and the canvas that draws the graph |
| [devbook-procedures](devbook-procedures.md) | L1 on devbook | The four procedures every repository has and no plugin can write — `start`, `show`, `capture`, `debug` — seeded once with a goal the plugin fixes and a body the repository owns |
| [devbook-collaboration](devbook-collaboration.md) | L1 on devbook | Who owes the next move on a chapter: review requests, findings, and the approval decision |
| [devbook-config](devbook-config.md) | L0 foundation | What this stack is, what this machine has, and how this repository is wired |
| [delivery](delivery.md) | L0 foundation | One unit of work carried from request to review-ready change inside one session |
| [delivery-schedule](delivery-schedule.md) | L1 on delivery | Work that runs with nobody watching, and the catalog of triggers that fires it |
| [delivery-surface-dashboard](delivery-surface-dashboard.md) | Surface | The live view of a run, measured by hooks rather than told |
| [delivery-surface-canvas](delivery-surface-canvas.md) | Surface | Mermaid and Markdown rendered live beside the files they came from |
| [delivery-surface-collector](delivery-surface-collector.md) | Surface | A run recorded to disk rather than watched, for unattended sessions |

The delivery engine and devbook are the two blocks everything else serves: the engine carries
work, and devbook is what the work is grounded in and what it writes back to. The three
surfaces answer one published contract and are interchangeable, which is the whole reason
there are three.
