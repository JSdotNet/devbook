# The seeded skills, in the repository

`assets/skills/` holds two procedures the engine names but cannot write: **start**, how this
repository's application comes up, and **capture**, how evidence of the feature being built is
taken. Both are repository-specific by nature — one product runs `aspire run`, the next runs
`docker compose up`; one captures a screenshot sequence, the next has tracing.

So the engine ships a seed and `delivery:install` writes it in, in the same shape
`devbook:install` uses for its rules: one copy of the procedure, and a wrapper per host
pointing at it.

```
plugins/delivery/assets/skills/<name>.md              what delivery ships
  └── .agents/skills/<name>.md                        the procedure, verbatim on first install
        ├── .claude/skills/<name>/SKILL.md            frontmatter → pointer
        └── .github/skills/<name>/SKILL.md            frontmatter → pointer
```

## The procedure

`.agents/skills/<name>.md`, byte-for-byte on first install, filename included.

**This is the copy a repository edits**, and editing it is the point rather than a
tolerated exception. Once its hash matches no release delivery shipped it is customized:
`managed: false` in the stamp, reported on every later reconcile, never overwritten. The
rules for that — key, hash, customized, orphan — are `reconcile-protocol.md` in the devbook
plugin under **What devbook materializes**; delivery follows them exactly rather than
restating them.

`.agents/` is where this marketplace already keeps host-neutral authored assets, one copy
with a wrapper per host. A skill is the second thing to live there; `rule-wrappers.md` in
the devbook plugin is the first.

## The two wrappers

Frontmatter and one sentence each, never a second copy of the procedure. Both carry the
`name` and `description` from the seed's own frontmatter, so the two hosts match on the same
text and neither can drift unnoticed:

```markdown
---
name: capture
description: "Capture screenshots and recordings as evidence for the feature being built …"
---

Read `.agents/skills/capture.md` and follow it.
```

The wrappers stay **managed**. That split is deliberate: the name and description are what a
phase and a routing hook match on, so they stay the engine's to refresh, while everything
that decides *what actually happens* is the repository's. A repository that edits a wrapper
anyway keeps it — reported, left alone, like any other customized file.

## Which skills, and when

Both, always, once a repository binds anything that needs a runtime. `install` asks before
writing either, and skips one whose target is meaningless here:

- `**Runnable application:** none` in `.devbook/flow-context.md` — skip `start`.
- `policy.qa.depth` of `skipped`, or `qa.ceiling` of `startup-only` — skip `capture`.

Neither is a dependency. A repository with no `capture` skill still gets capture: the phase
drives it directly per `resources/capture-contract.md`, which is the whole reason the
contract lives in the engine and not in this file.
