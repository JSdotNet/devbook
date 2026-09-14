# The folder rules, in the repository

A rule in `rules/` is read by no host while it sits in the plugin. There is no rules key in
either manifest and no rules component, and the globs in `rules/rules.json` name folders in
the adopting repository, which is the only place they resolve.

So `devbook:install` installs them, in the same shape the `devbook` repository uses for its own rules:
one copy of the rule, and a wrapper per host pointing at it.

```
plugins/devbook/rules/<name>.md                       what devbook ships
  └── .agents/rules/<name>.md                         the rule, verbatim
        ├── .claude/rules/<name>.md                   paths  → pointer
        └── .github/instructions/<name>.instructions.md
                                                      applyTo → pointer
```

The rules for all three — key, hash, customized, orphan — are in `reconcile-protocol.md`
under **What devbook materializes**. `rules/rules.json` says which rules exist, what each
one's `paths` are, and which adopted folder pulls it in; read it rather than hardcoding a
list.

## The rule

`.agents/rules/<name>.md`, byte-for-byte, filename included.

The filename is load-bearing: these rules reference each other by bare filename, and the
plugin's `rules/` folder and this one hold the same names, so every reference resolves in
both places without a rewrite.

Nothing is edited on the way in, and no glob is trimmed to the layout this repository uses.
A glob that matches nothing applies nothing, while a trimmed file matches no release devbook
shipped — so the next reconcile would report it customized and never refresh it again. That
is the right outcome for the two workflows and the wrong one here.

## The two wrappers

Frontmatter and one sentence each, never a second copy of the rule.

`.claude/rules/<name>.md` — `paths` verbatim from the rule's entry in `rules.json`:

```markdown
---
paths:
  - ".arc42/**"
  - ".devbook/arc42/**"
---

Read `.agents/rules/devbook-arc42.md` and follow it before editing this file.
```

`.github/instructions/<name>.instructions.md` — the same `paths` joined with commas, and the
`description` copied from the rule's own frontmatter:

```markdown
---
applyTo: '.arc42/**,.devbook/arc42/**'
description: Structure and authoring rules for the arc42 architecture documentation folder.
---

Read `.agents/rules/devbook-arc42.md` and follow it before editing this file.
```

Because `applyTo` is exactly `paths` comma-joined, both wrappers are derivable from one
place and neither can drift unnoticed — the bargain `tools/check-assets.mjs` already enforces
on this marketplace's own rules.

## Which rules, and when

`rules/rules.json` carries it, one entry per rule:

- `install: "<folder>"` — install the trio when that folder is in `adopted`.
- `install: "always"` — install it whenever any folder is adopted.
- no `install` key — never installed; that rule governs a path inside the plugin.

A folder dropped from `adopted` orphans its trio: reported, never deleted.

A repository that has taken ownership of any of the three keeps it. Report the drift and move
on — the plugin copy stays reachable by explicit path from a skill or an agent, which is how
these rules reached a session before any of them were installed.
