# 1. Marketplace Named jsdotnet

```meta
date: 2026-09-02
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/plugin-authoring/domain.md#marketplace"]
```

The marketplace is `jsdotnet`, not `jsdotnet-copilot` — this repository is not Copilot-specific.
The name is a per-machine primary key, so it only has to stay distinct from the other
marketplaces a user has added, and it is not renamed after release: a rename orphans every
installed `plugin@jsdotnet` reference and the cache directory keyed by it.

Consequence: a plugin ported here from `JSdotNet/Copilot` keeps its own name, so a user who has
both marketplaces added sees two installables. Superseding that repository means removing its
marketplace, not renaming plugins.

**Superseded, 2026-09-14** by [The Marketplace Is Named jsdotnet-devbook](66-the-marketplace-is-named-jsdotnet-devbook.md).
The half that holds — the name is a per-machine key and a rename orphans what was installed
under it — is the reason the rename was done while two plugins on one machine was the whole
cost. The half that lost was the choice of `jsdotnet` itself: a bare owner name only reads as
"not Copilot-specific" while it is the only non-Copilot marketplace, and once
`jsdotnet-ai-plugins` exists beside it, it reads as that marketplace's parent instead.
