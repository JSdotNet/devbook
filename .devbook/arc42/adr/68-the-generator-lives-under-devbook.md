# 68. The Generator Lives Under .devbook/tools/

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/25-devbook-payload-named-after-its-plugin.md", ".devbook/arc42/adr/61-the-marketplace-stamps-itself-and-materializes-nothing.md", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md"]
```

`devbook:install` materializes `tools/devbook-meta/` and `tools/devbook-tech/` into
`.devbook/tools/`, not `.github/tools/`, and every command that names the generator names it
there. Migration `10-the-generator-lives-under-devbook` moves an installed repository.

The generator is plain Node with no host in it: it reads Markdown and writes JSON, and a
repository with no GitHub Actions still runs it from `build/Update-DevbookIndex.ps1`. Putting it
under `.github/` said otherwise, and a first install in a fresh repository read as devbook
adding GitHub tooling — the folder was the first thing a reader saw and the one thing about it
that was not devbook's. [Record 11](11-the-stack-config-lives-in-devbook.md) made the same
argument for the stack config: `.github/` is one host's folder, and a file both hosts read does
not belong in it. That argument was never applied to the generator because
`devbook-derived-artifacts.md` had fixed `.github/tools/<tool-name>/` as the convention before
`.devbook/` existed, and nothing revisited it when record 11 gave the folder a home.

`.devbook/` is the right parent because it exists in both layouts: the flat one keeps its
chapter folders at the root but its config at `.devbook/config.json`, so `.devbook/tools/` is
never the only thing under `.devbook/`. Discovery probes `.devbook/<name>` for the five chapter
folders and ignores anything else, so a `tools/` sibling is invisible to the layout check. The
shared rules' nested-layout glob was `.devbook/**` and would have fired on the generator and on
the config alike; it narrows to the five chapter folders in the same change.

**Record 25 weakens and stands.** It argued that `devbook-` is not redundant at the destination
because `.github/tools/` is shared. Under `.devbook/tools/` the prefix is redundant on the path,
and the name is kept anyway: `devbook-meta` is the tool's name in the plugin, in every command,
and in the workflow that runs it, and a tool renamed on the way in is a tool nobody can find
from its own README. The workflows and the per-rule instruction wrappers stay under `.github/`,
where record 25's argument still holds and where the host reads them.

Consequence: `.github/` in a consuming repository holds what GitHub reads — the two workflows
and the Copilot instruction wrappers — and nothing else devbook writes. The contract is 10, the
migration ships in the same commit as the move per
[record 64](64-1-0-0-is-the-first-release.md), and
[record 61](61-the-marketplace-stamps-itself-and-materializes-nothing.md) and
[debt record 4](../tdr/4-delivery-depends-on-devbook.md) read the new path where they
describe the table.
