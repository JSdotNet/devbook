# 66. The Marketplace Is Named jsdotnet-devbook

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/01-introduction-and-goals.md", ".devbook/arc42/adr/1-marketplace-named-jsdotnet.md", ".devbook/arc42/adr/24-the-specialists-leave-the-marketplace.md", ".devbook/arc42/adr/65-the-repository-is-named-devbook.md", ".devbook/domain/plugin-authoring/domain.md#marketplace"]
```

The marketplace is `jsdotnet-devbook`, renamed from `jsdotnet`, and the rule behind it is
**`jsdotnet-<repository>`**: a marketplace name is derived from the repository that publishes
it, so either can be read off the other. `JSdotNet/ai-plugins`, where
[the specialists went](24-the-specialists-leave-the-marketplace.md), takes the same rule the
same day and becomes `jsdotnet-ai-plugins`.

[Record 1](1-marketplace-named-jsdotnet.md) chose the bare owner name to say "not
Copilot-specific", which was the only distinction that mattered while this was the one
marketplace beside `jsdotnet-copilot`. That argument did not survive the second marketplace
being renamed on the same principle: with `jsdotnet` and `jsdotnet-ai-plugins` side by side,
the bare name reads as the family the other belongs to, and nothing here is the parent of the
specialists. A name that has to be explained against its neighbour is the wrong name; one that
follows a rule needs no explaining.

**Record 1's other half stands, and is why this is done today.** The name is a per-machine
primary key: a host keys its registry, its cache directory, and every `plugin@marketplace`
reference by it, and GitHub redirects nothing about it. A rename is therefore a new marketplace
to the host, and every install under the old name is orphaned. That cost is counted, not waved
away: at the time of writing it is one machine, two plugins, and an installer that already
handles it — remove the old registration, uninstall what it held, add the new one, reinstall.
[Record 65](65-the-repository-is-named-devbook.md) made the same "cheap only now" argument for
the repository name and was explicit that the marketplace name was the frozen one; the day it
became two keys that could follow one rule was also the last day the rename cost this little.

Consequence: **`jsdotnet` is retired, not reused.** A machine that added the marketplace under
the old name removes it and adds the repository again; the installed plugins come back as
`plugin@jsdotnet-devbook`. Every place this repository names its marketplace — the manifest,
`README.md`, `AGENTS.md`, chapter 1, the plugin-authoring domain, and the
`extraKnownMarketplaces` and `enabledPlugins` entries in `.claude/settings.json` — reads the
new name. Records 1, 64, and 65 keep the old name where they describe what was true when they
were taken.
