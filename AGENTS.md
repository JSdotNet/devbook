# ai-agent-stack

A Claude Code plugin marketplace named `jsdotnet`: the agents, skills, instructions, and hooks
that drive delivery work. One folder per plugin under `plugins/`, each installable on its own.

Assets are authored once and loaded by both Claude Code and GitHub Copilot — both hosts ignore
keys they do not know, which is what lets one file serve both. There is no generator: every
file here is hand-authored.

## Validating a change

The design these plugins implement is written down in this repository. Before writing, read
the chapters the change touches: `.devbook/arc42/adr/` for why something is the way it is and
`.devbook/arc42/tdr/` for what is knowingly left open, `.devbook/domain/` for the vocabulary
and the boundary each plugin owns, and the plugin's own `rules/` for what a file must contain.

When the repository and a chapter disagree, one of them is wrong and neither may stay that
way: change the other in the same commit, or — when the divergence is deliberate — record it
as a decision in `.devbook/arc42/adr/` with the reason. Never leave the two silently apart.

Before committing, run the checker and the generator over this repository's own devbook:

```bash
node tools/check-assets.mjs && node plugins/devbook/tools/devbook-meta/build.mjs --check
```

The first fails on a manifest, agent, or hook shape a host rejects or a decision forbids, and
reports body budgets. The second fails on a chapter whose `meta` block or reference does not
resolve.

`.github/workflows/repo-checks.yml` runs both on every pull request, and a third beside them:
`claude plugin validate --strict` over the marketplace and every plugin manifest, which is what
catches an unknown manifest field or a bad dependency range. Run it locally before a manifest
change. The workflow calls `--check` only and never refreshes `_meta/`.

`--check` is the gate. Refreshing `_meta/` belongs to automation, never to a session: two
branches that each touch one chapter both rewrite the same JSON, and the conflict is only
resolvable by re-running the generator. Never regenerate or commit `_meta/` here — the
`devbook-check` schedule refreshes the indexes daily and opens a pull request when they moved.
`.claude/settings.json` denies the folder to Claude Code's file tools, and the devbook section
at the end of this file states the rule for Copilot, which has no equivalent lever. Full rule:
`plugins/devbook/rules/devbook-derived-artifacts.md`.

## Committing

- Commit after every change, one logical change per commit. Diffs are how this repository is
  reviewed, so a commit that mixes two decisions hides both.
- Leave nothing uncommitted when handing back. Whenever the session stops for input, the
  working tree is clean.
- Never push and never open a pull request until asked. Committing locally is not publishing.

## Plugin layout

```
plugins/<name>/
  .claude-plugin/plugin.json      Claude manifest
  .github/plugin/plugin.json      Copilot manifest — same name, version, description
  agents/<role>.agent.md          frontmatter name must equal <role>
  skills/<skill>/SKILL.md
  rules/<name>.md                 a rule the install writes into a repository; name and
                                  description only. Only a plugin that delivers rules has this
  rules/rules.json                its globs, keyed by name
  hooks/hooks.json                Claude hooks
  hooks.json                      Copilot hooks
  resources/<name>.md             shared text an asset reads by path — a contract, a template.
                                  A contract carries name and description; nothing else there does
  mcp/<server>/                   an MCP server, declared under mcpServers in the Claude manifest
  extensions/<name>/              a Copilot extension, declared in the Copilot manifest
  assets/  tools/  scripts/       payload an install skill copies into a repository, and the
                                  executables a skill or a check runs from the plugin itself
  migrations/<version>-<slug>/    MIGRATION.md plus an idempotent migrate.mjs --check
  README.md                       what the plugin is. Every plugin has one
  UPGRADING.md                    behaviour changes a consumer would notice, newest first
```

A new plugin also needs an entry in `.claude-plugin/marketplace.json` — `name`, `source`
(`./plugins/<name>`), `description`, `version` — or Claude Code will not offer it.

## Where the rest of the rules are

A rule that applies to one kind of file is authored once in `.agents/rules/` and wrapped per
host: Claude loads `.claude/rules/<topic>.md` when it opens a matching file, Copilot loads
`.github/instructions/<topic>.instructions.md`. Six topics, all plugin authoring — `agents`,
`skills`, `plugin-rules`, `manifests`, `hooks`, `schedules`. Change a rule and its two
wrappers in the same commit; `node tools/check-assets.mjs` fails on drift. The convention is
[.agents/rules/README.md](.agents/rules/README.md).

`.devbook/**` has no topic here on purpose: the devbook section at the end of this file states
the folder rules for both hosts, and devbook owns it.

A rule fires when a host **reads** a matching file, so authoring one from scratch may not
trigger it. Open a sibling first, or read the rule directly.

## Writing

An asset is read by a model on every load, so prose costs context and vagueness costs
behaviour.

- Imperative, present tense, no hedging. "Run the suite before pushing", not "you may want to
  consider running the suite". A softened rule is a rule that does not fire.
- Cut what the model already does by default, and state each rule in exactly one file — point
  at it by relative path from everywhere else.
- Body budgets: `SKILL.md` 40 lines, a rule or a `resources/` contract 60, `*.agent.md` 80.
  The budget is a disclosure trigger, not a hard limit: past it, move reference behind a pointer, split by
  branch, or state the reason in the file. Full rule: [AUTHORING.md](AUTHORING.md). Staged
  procedures, converters, schema and contract instruction files, and the `flow-runner` agent
  are long by kind, recorded once in `.devbook/arc42/09-architecture-decisions.md` rather than
  in each file.
- A rule that must survive a long session says so in the asset, and repeats itself at the point
  of use. Instructions decay as context fills.
- Exempt safety-critical text from any terseness rule: confirmations before irreversible
  actions, and anything a fragment could make ambiguous, stay in full prose.

## Trying a change

```bash
claude plugin marketplace add JSdotNet/ai-agent-stack
```

During development, add this working copy by path instead of by repo, then `/plugin` to enable
what you are editing.

<!-- devbook:begin -->
## Devbook folders

Managed by `devbook:install`. Edit outside these markers; an edit inside them makes the
next reconcile report the section as customized and leave it alone.

This repository keeps its devbook as addressed Markdown chapters. Treat the folders as
task-scoped context, never baseline context: load the chapters a task names, walk
`related` and `depends-on` from them, and never load a folder whole.

| Folder | Holds | Rules |
| --- | --- | --- |
| `.devbook/arc42/` | Structure, decisions, and technical debt | `devbook-arc42.md` |
| `.devbook/domain/` | Bounded contexts and the ubiquitous language | `devbook-domain.md` |
| `.devbook/tech/` | The technology graph and its ratings | `devbook-tech.md` |
| `.devbook/design/` | Design principles, tokens, and component guidelines | `devbook-design.md` |
| `.devbook/ai/` | How the team works with AI, stage by stage; it records a way of working and never instructs one | `devbook-ai.md` |

Every chapter carries a fenced `meta` block; write it in the same change as the content,
per `devbook-chapter-metadata.md`. Skip `annotation` fences when loading a
chapter as context: they hold review notes, not content.

Files under any `_meta/` folder are generated tool input. Never read or hand-edit them,
and never regenerate or commit them in a session — the `devbook-check` schedule owns that
refresh. Run the check before committing:

    node plugins/devbook/tools/devbook-meta/build.mjs --check

Two files here are yours alone, gitignored and absent by default. `AGENTS.local.md`
holds instructions that apply on your machine only; read it when it exists and treat
it as this file's last word. `.devbook/config.local.json` overlays the committed
stack config the same way. Never commit either, and put no secret in them — gitignored
is not private.
<!-- devbook:end -->
