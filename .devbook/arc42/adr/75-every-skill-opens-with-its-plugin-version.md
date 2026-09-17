# 75. Every Skill Opens With Its Plugin Version

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/2-one-folder-per-plugin.md", ".devbook/arc42/adr/3-one-authored-copy-per-asset.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/domain/plugin-authoring/domain.md#skill"]
```

Every `SKILL.md` in this marketplace carries, as its first body line after the title, one
sentence that opens the reply with the plugin's name and version:

> Open the reply with `<plugin>@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A skill's answer then names the release that gave it, in every host, on every run. A consumer
reading a run's output, a scheduled session's log, or a pull request a fleet worker opened can
tell which version of the plugin was answering without opening a manifest, and a bug report
carries the version by construction.

**Why the version is read and not written.** A version spelled in the skill is a second copy
of the manifest's, and the release commit — every plugin together, by
[64](64-1-0-0-is-the-first-release.md) — would touch forty-nine skills to move it. The
manifest beside the skill is the one copy, both manifests carry the same value and the
checker already holds them equal, and `../../.claude-plugin/plugin.json` resolves from
`skills/<name>/` in either host's checkout of the plugin. *Not recalled* is in the sentence
because a model that has just read the marketplace description will otherwise state a version
from context; a fact with a file behind it is read from that file.

**Why the line is in every skill and not in one rule.** [3](3-one-authored-copy-per-asset.md)
says a rule is stated once and pointed at, and this one is — `.agents/rules/skills.md` names
the sentence and the domain chapter names the convention — but a rule in this repository
never reaches an installed plugin: by [2](2-one-folder-per-plugin.md) a plugin ships alone,
and neither host loads a repository rule into a plugin's skill. The one line that has to fire
at runtime is therefore authored in the runtime asset, the same way an agent carries its own
tools list, and the single-copy rule is kept where it can be: the exact sentence lives in
`tools/check-assets.mjs`, which fails a skill whose line differs from it or whose manifest
path does not resolve.

Consequence: **no version moves, and no migration ships.** The line changes what a skill
says, not what it writes into a repository, so nothing `install` materializes is stale. Every
skill grows by one body line, which moves nothing across a budget that was not already over
it. A plugin added later inherits the obligation through the checker, and a skill that has a
reason to answer without a version states that reason in its file rather than dropping the
line.
