# 65. The Repository Is Named devbook

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/01-introduction-and-goals.md", ".devbook/arc42/adr/1-marketplace-named-jsdotnet.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/24-the-specialists-leave-the-marketplace.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/domain/plugin-authoring/domain.md#marketplace"]
```

The GitHub repository is `JSdotNet/devbook`, renamed from `JSdotNet/ai-agent-stack`. Every
place this repository names itself — `README.md`, `AGENTS.md`, chapter 1, the eight plugin
READMEs' install line, the schema `$id` in `delivery`, and the `extraKnownMarketplaces` entry
in `.claude/settings.json` — reads the new name.

`ai-agent-stack` described the repository as it was before
[the specialists left](24-the-specialists-leave-the-marketplace.md): a stack of agents for
any delivery work. What remains is the devbook convention and the engine that carries a change
through it, and everything the repository says about itself already leads with devbook — the
marketplace description, the README's first line, chapter 1. The folder had made the same move
in [record 11](11-the-stack-config-lives-in-devbook.md), where `.github/ai-agent-stack.json`
became `.devbook/config.json` because `.devbook/` is where a repository's own account of how
it works lives, wiring included. The repository name is the last place the old name survived.

**The repository name and the marketplace name are two keys, and only one of them is frozen.**
[Record 1](1-marketplace-named-jsdotnet.md) forbids renaming `jsdotnet` because a host keys its
registry, its cache, and every `plugin@jsdotnet` reference by it. None of those hold the
repository name: a host stores it once, as the marketplace's source, and GitHub redirects a
renamed repository for git, the API, and the web, so `claude plugin marketplace add
JSdotNet/ai-agent-stack` keeps resolving and an already-added source keeps updating. The
command as [record 64](64-1-0-0-is-the-first-release.md) wrote it stays as written and still
works; new text uses the new name.

The moment is chosen, not incidental. No consumer has installed by repository name — record 64
put the first release on the same day — so the rename costs the string edits above and nothing
downstream. After the first install by name it would cost every adopter a README line they
never asked to change, and the reasoning that makes this cheap is the reasoning that makes it
a one-time move.

Consequence: **`devbook` now names three things.** The repository, the plugin at
`plugins/devbook` that ships the convention, and the `.devbook/` folder in an adopting
repository. Prose that could mean more than one of them says which — "the `devbook` plugin",
"the `devbook` repository" — the way the delivery chapters already distinguish the engine from
the marketplace. The collision is accepted rather than avoided with a suffix, because the
repository is the convention's home and half of what it ships reads `.devbook/config.json`:
`delivery` is an engine over the convention, not a peer of it, which is the same call
[debt 4](../tdr/4-delivery-depends-on-devbook.md) records as open from the other side.

Left as it was: the legacy path `.github/ai-agent-stack.json` in records 11 and 41,
`devbook-config`'s report and `setup` skill. That is a filename repositories still hold, and
renaming a name nothing writes anymore would break the one thing that still reads it.
