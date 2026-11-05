# devbook-skills

Reusable guidance any plugin can name and none has to depend on, and planning a person runs
by hand.

An L0 plugin with no dependencies. It ships skills and one session-start hook: no rule, no
install, and no entry in the stamp. Other plugins name its skills by name alone and keep their
own short rule for when it is absent, so enabling it improves what they write and disabling it
breaks nothing. `wayfinder` is named by no plugin: a person invokes it, and it writes issues,
never files. The decision is recorded in
[plugin-boundaries.md](../../.devbook/arc42/adr/plugin-boundaries.md).

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-skills` with `/plugin`. There is nothing to install into the repository.

## Skills

| Skill | What it does | Who names it |
| --- | --- | --- |
| `show-me` | Puts a picture before the prose whenever the content has a shape, and keeps the words to what the picture cannot say | `devbook`'s `devbook-writing` rule, for every chapter except `domain.md` and its splits; `delivery`, for pull request descriptions and its report back to the person; and anyone who types `/show-me` |
| `research-brief` | Answers one question about something outside the repository from primary sources only, every claim cited with a confidence, and lists what the sources leave open. Returns the brief and writes nothing | `delivery`'s Scope phase, when a fact outside the repository decides scope, and its Drafting phase for `arc42/` and `tech/`; and anyone who types `/research-brief` |
| `pr-body` | Writes a pull request description as Summary, Evidence, and Merge Danger: one picture of the change, a tiered before and after, and a one-way or two-way door with its blast radius. A one-way door links its decision record | `delivery`'s Create Pull Request phase, `delivery-schedule`'s draft pull requests, whose door `schedule-merge-review` weighs its verdict by; and anyone who types `/pr-body` |
| `retro` | Runs a retrospective over one session or one delivery run with the person present, and ranks what would make the next one get further: a pointer, a check, narrower context, a cheaper tool call, a deleted no-op, a model or effort setting. A mechanical violation gets a check, never a written rule. Presents the candidates and writes nothing | `delivery`'s Summary, which offers it after two or more revise rounds at Personal Validation; `delivery-schedule`'s `schedule-weekly-retro`, which reads a week through its lenses; and anyone who types `/retro` |
| `wayfinder` | Plans an effort too big for one session as a `wayfinder:map` issue whose child issues are decision tickets — research, prototype, grilling, task — linked by native blocking, then resolves one frontier ticket per session until nothing is left to decide. Plans; never builds the destination | Nobody: a person types `/wayfinder`. `delivery-schedule`'s issue sweep leaves every `wayfinder:*` issue alone |

`show-me` writes plain Markdown only: Mermaid, fenced code, and tables. That is what a
chapter, a pull request, and a chat reply can all render. It also holds the orientation card, a
five-line opening for a handback, a decision, or a finished change.

A session-start hook applies `show-me` to every reply in a repository with
`.devbook/config.json` or that names this plugin in its `enabledPlugins`. It stays silent
elsewhere on Claude Code, and Copilot's prompt hook cannot guard itself, so it always speaks there.

`research-brief` returns its brief and never lands it. The caller chooses the place: a
decision record's options through `flow-spec`, `openspec/changes/<id>/research.md`, a ticket,
or the chat.

`pr-body` fills a repository's own pull request template rather than replacing it. In a
repository with devbook, a change is a one-way door when it ships a migration, renames a
`.devbook/config.json` key or a stamp field, deletes data, or touches an `accepted` chapter.

`retro` holds the one set of lenses. `schedule-weekly-retro` reads a week of sessions through
them and lands its edits as a draft pull request; `retro` reads one session or run and only
presents.

`wayfinder` keeps the map on the repository's own tracker through the host's issue CLI, and
the shapes it writes in [skills/wayfinder/map.md](skills/wayfinder/map.md). A research ticket
is resolved through `research-brief`, a grilling ticket through a `grilling` skill or inline
when there is none, and a prototype ticket through the repository's `prototype` skill when it
has one.

## Credits

`research-brief` is adapted from the `research` skill in
[mattpocock/skills](https://github.com/mattpocock/skills), MIT licensed, and `pr-body` from its
`pr` skill, whose Summary guidance credits Dex Horthy's `show-me`, `retro` from its `retro`
skill, and `wayfinder` from its `wayfinder` skill.
