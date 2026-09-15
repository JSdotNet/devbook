# 67. The Install Creates the Root Wrappers Where Absent

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/27-one-rule-one-wrapper-per-host.md", ".devbook/arc42/adr/28-devbook-owns-one-section-of-agentsmd.md", ".devbook/arc42/adr/37-a-plugins-rules-reach-a-host-through-the-install.md", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

`devbook:install` creates `CLAUDE.md` and `.github/copilot-instructions.md` where a repository
has neither, from `assets/root-wrappers/`, and never touches one that exists.

[Record 27](27-one-rule-one-wrapper-per-host.md) chose the shape — `AGENTS.md` is the root
file, each host gets a one-sentence wrapper pointing at it — and this repository hand-authored
both. Nothing carried them to a consumer: the reconcile table sent the `AGENTS.md` section and
the per-rule wrappers and stopped, on the reasoning that Copilot resolves `AGENTS.md` natively
and the Claude wrapper is the repository's to arrange. A first install then landed a
repository on a section of `AGENTS.md` that Claude Code never loaded, with nothing in the
report saying so. The wrapper is load-bearing on one host and the install already knows which
file it wrote into; leaving the last step to the reader was the one gap in
[record 37](37-a-plugins-rules-reach-a-host-through-the-install.md)'s argument that a plugin's
rules reach a host through the install and not through the reader.

**Created, never reconciled.** Both files are stamped `managed: false` from the first
reconcile. A root instruction file is where a repository puts what it wants said to one host
and not the other, which makes every later edit a customization; treating the first copy as
managed would only make the second reconcile report what the first one predicted. A present
file — with or without the pointer — is left alone, because a repository that already has one
has already decided what it says.

Consequence: a repository installs devbook and both hosts read the section on their next
session, with no step left for the reader. The asset is two files of two lines each, the
reconcile table gains two rows whose `when` column reads `absent`, and no migration ships —
a reconcile creates the file on its own where it is missing.
