# 59. The Design Artifacts Are No Longer Cited

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/35-the-word-knowledge-is-retired.md", ".devbook/arc42/adr/17-no-host-profile-plugins.md", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/adr/README.md"]
```

`AGENTS.md` no longer names the six external design pages, and no longer says that one of them
outranks this repository. What a session validates against is `.devbook/arc42/adr/` and
`.devbook/arc42/tdr/` for why something is the way it is, `.devbook/domain/` for the
vocabulary, and a plugin's own `rules/` for what a file must contain.

The rule it replaces read *when the repository and an artifact disagree, the artifact is
right*, and by now that instruction is unsafe in both directions.

**Half the set is behind the repository, not ahead of it.** *Knowledge Base Internals 2.0*
describes six folders and a `.backlog` status ladder that
[migration `006-drop-backlog`](../../../plugins/devbook/migrations/006-drop-backlog/MIGRATION.md)
removed at contract version 6, together with the `implements` field only those chapters
carried. *The Rename Wave* describes `claude-desktop`, `copilot-app`, and a `devbook-flows`
bridge that [17](17-no-host-profile-plugins.md) and [34](34-flows-belong-to-delivery.md)
deleted, and [5](5-devbook-still-ships-the-graph-canvas.md) is already marked superseded on the
same half. A session obeying the old rule against those pages would undo settled work and
believe it was correcting a divergence.

**And the pages do not open.** They are private to the account that authored them, so whoever
runs a change here cannot read what they are told to defer to. An instruction to validate
against something unreadable is not a weaker instruction than one that can be followed — it is
worse, because a session that cannot check will either invent what the page said or skip the
step silently, and both look identical in the diff.

The surviving half of the rule stays, with the direction removed: the repository and a chapter
may not sit silently apart, so one of them changes in the same commit, or the divergence is
recorded here as a decision. The closing instruction to name the artifact you validated against
is dropped; nothing in the section now points outside the repository. A single consolidated
page may return later as one row — what does not return is the six-way split, or a citation
that outranks the code it describes.

The one citation living outside `AGENTS.md` goes in the same wave:
`devbook-collaboration`'s release note cited *Layered Annotations* for a design
`devbook` has since shipped, so it points at
[the rule](../../../plugins/devbook/rules/devbook-annotations.md) instead. No link to any of
the six remains in the repository.

Consequence: the second exception in
[The Word Knowledge Is Retired](35-the-word-knowledge-is-retired.md) closes with this record.
The word survived there only because the citation carried the page's title, and the citation is
gone, so a grep for it now finds the pre-rename payload paths and nothing else.
