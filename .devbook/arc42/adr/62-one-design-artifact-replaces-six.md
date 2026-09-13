# 62. One Design Artifact Replaces Six

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/59-the-design-artifacts-are-no-longer-cited.md", ".devbook/arc42/adr/35-the-word-knowledge-is-retired.md", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/8-comments-are-findings-until-the-fence-lands.md", ".devbook/arc42/11-risks-and-technical-debt.md"]
```

The design of devbook and the plugins around it is one published page,
[jsdotnet Stack Design](https://claude.ai/code/artifact/f0e03cc1-73fa-4592-9431-9c9dfcaa215f),
written on this date from the repository as it stood — devbook 3.4.0, delivery 2.6.0, contract
9, records 61 and TDR 5 as the latest. It is the single row that returns to `AGENTS.md`'s
`## Validating a change` section, which [record 59](59-the-design-artifacts-are-no-longer-cited.md)
left room for and nothing else may fill: one page, never a six-way split.

**What it replaces.** The six retired pages — the convention and its folders, the metadata
schema and what becomes an edge, how the plugins couple, naming and the host split,
annotations, and retrieval — were private to another account and do not open. Everything they
carried that the repository does not was written out again: the reasons. The repository
records what was decided; the page carries why, in twelve sections, and points at the rules
and templates by path rather than restating them. Where the pages and the repository
disagreed, the repository and its decisions won every time; the page's §10 lists each point
with the record that settled it.

**The direction of authority does not come back.** Record 59 dropped the rule that an
artifact outranks the code it describes, and this page does not restore it. What a session
validates against is still `adr/`, `tdr/`, `.devbook/domain/`, and a plugin's `rules/`; the
page is where those are argued together, dated, and complete enough to check a change against
on its own. So a divergence is now recorded **against it**: a change that departs from a
section of the page lands with a decision in this folder citing that section, the same way
the repository and a chapter may not sit silently apart. A page that has become wrong is
republished from the repository, not obeyed.

**One page and not six, because a citation has to be readable whole.** Half the old set was
behind the repository and half ahead of it, and a reader could not tell which without opening
all six. One page carries one date and one version line, so the question "is this current?"
has one answer, and the open debt is listed in it rather than presented as finished.

Consequence: five records that argued against "the layered design" or "the design" by that
name — [5](5-devbook-still-ships-the-graph-canvas.md), [7](7-approved-is-a-status-rung.md),
[8](8-comments-are-findings-until-the-fence-lands.md),
[12](12-extension-points-and-gates-live-in-the-surface-contract.md), and
[18](18-delivery-surface-canvas-ships-the-canvas-only.md) — now name the page and the section
that carries what they cite. Their prose is otherwise untouched: each records what a retired
page said at the time it was argued against, and that is the part a later reader needs. The
row in `AGENTS.md` lands with the review of the draft, in the commit after this one; until it
does, this record is the only citation.
