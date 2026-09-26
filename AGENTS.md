# devbook

A Claude Code plugin marketplace named `jsdotnet-devbook`: the agents, skills, instructions, and hooks
that drive delivery work. One folder per plugin under `plugins/`, each installable on its own.

Assets are authored once and loaded by both Claude Code and GitHub Copilot — both hosts ignore
keys they do not know, which is what lets one file serve both. There is no generator: every
file here is hand-authored.

## Validating a change

The design these plugins implement is written down in this repository. Before writing, read
the chapters the change touches: `.devbook/arc42/adr/` for why something is the way it is and
`.devbook/arc42/tdr/` for what is knowingly left open, `.devbook/arc42/building-blocks/` for
what each plugin owns, exposes, and depends on, `.devbook/arc42/08-crosscutting-concepts.md`
for the vocabulary every plugin shares, and the plugin's own `rules/` for what a file must
contain.

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
resolvable by re-running the generator. Never regenerate or commit `_meta/` here, and run
`build/Update-DevbookIndex.ps1` with `-Check` only — `devbook-meta-nightly.yml` and the
`devbook-validate` schedule refresh the indexes daily and open a pull request when they moved.
`.claude/settings.json` denies the folder to Claude Code's file tools, and the devbook section
at the end of this file states the rule for Copilot, which has no equivalent lever. Full rule:
`plugins/devbook-derived/rules/devbook-derived-artifacts.md`. The checker is `devbook`'s and
the committed index is `devbook-derived`'s, per
`.devbook/arc42/adr/checks-and-indexes.md`. This repository
adopts them the way any other does, through `devbook:update`: the copies under
`.devbook/_tools/`, `.agents/rules/`, and the workflows are the plugins' payload, never edited
in place. Edit the plugin and refresh the copy in the same commit — `check-assets` fails on a
vendored `.devbook/_tools/` file or a delivered rule that differs from its source, per
`.devbook/arc42/adr/install.md`.

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
  extensions/<name>/              a Copilot extension; the Copilot manifest carries no key for it
  assets/  tools/  scripts/       payload an install skill copies into a repository, and the
                                  executables a skill or a check runs from the plugin itself
  migrations/<version>-<slug>/    MIGRATION.md plus an idempotent migrate.mjs --check
  README.md                       what the plugin is. Every plugin has one
```

No plugin carries an `UPGRADING.md` or a changelog. The marketplace has one consumer, git
history is the upgrade note, and a migration is the only record a behaviour change leaves.

A new plugin also needs an entry in `.claude-plugin/marketplace.json` — `name`, `source`
(`./plugins/<name>`), `description`, `version` — or Claude Code will not offer it.

### When a change ships a migration

From 1.0.0 onward, a change to a devbook chapter schema, a stamp shape, a `.devbook/config.json`
key, or a path `devbook:init` writes ships its migration in the same commit as the change,
under `migrations/<version>-<slug>/` of the plugin that owns it: a `MIGRATION.md` beside an
idempotent `migrate.mjs` whose `--check` exits `1` while work remains. The ledger it lands
in, the `not-applicable` result, and the rule that a shipped id is never invented, renamed, or
removed are in `plugins/devbook/assets/reconcile-protocol.md`; the folder shape and numbering
are in `plugins/devbook/README.md` under *Migrations*. Neither is repeated here.

Three cases decide whether one is owed:

- An added field with a safe default — a chapter, stamp, or config that omits it still
  validates and reads as before — needs no migration and no note.
- A renamed or removed field always needs one, in a chapter `meta` block, the stamp, or a
  config key alike: every repository holding the old spelling is broken until a script rewrites
  it, and a prose note asking each one to do so by hand is not a migration.
- A change to what `devbook:init` materializes — a path, a marker, a rendered section, a
  workflow — needs one whenever an already-installed repository would otherwise keep the stale
  file. Reconcile replaces only a copy that still hashes to a release devbook shipped, and
  never deletes: a moved path leaves the old copy behind as an orphan, and a copy edited since
  it landed is reported as customized and left alone. Either way the file is stale until a
  script moves it. A file reconcile would replace on its own needs none.

The reason this obligation starts at 1.0.0 and not before is
`.devbook/arc42/adr/releases.md`. A migration lives for the major
version it ships in: a major release raises the floor and drops the folders below it, per
`plugins/devbook/README.md` under *Migrations*, so the folder never grows past one major.

## Where the rest of the rules are

A rule that applies to one kind of file is authored once in `.agents/rules/` and wrapped per
host: Claude loads `.claude/rules/<topic>.md` when it opens a matching file, Copilot loads
`.github/instructions/<topic>.instructions.md`. Six topics are authored here, all plugin
authoring — `agents`, `skills`, `plugin-rules`, `manifests`, `hooks`, `schedules`. Change a
rule and its two wrappers in the same commit; `node tools/check-assets.mjs` fails on drift. The convention is
[.agents/rules/README.md](.agents/rules/README.md).

The `devbook-*` rules beside them are delivered, not authored: `devbook:update` copies them
from `plugins/devbook/rules/`, and `devbook-derived:update` copies `devbook-derived-artifacts`
from `plugins/devbook-derived/rules/`. They are edited there and refreshed here, never edited
in place.

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
  are long by kind, recorded once in [AUTHORING.md](AUTHORING.md) rather than
  in each file.
- A rule that must survive a long session says so in the asset, and repeats itself at the point
  of use. Instructions decay as context fills.
- Exempt safety-critical text from any terseness rule: confirmations before irreversible
  actions, and anything a fragment could make ambiguous, stay in full prose.

## Trying a change

```bash
claude plugin marketplace add JSdotNet/devbook
```

During development, add this working copy by path instead of by repo, then `/plugin` to enable
what you are editing.

<!-- devbook:begin -->
## Devbook folders

Written by `devbook:init` and kept by `devbook:update`. Edit outside these markers; an edit inside them makes the
next reconcile report the section as customized and leave it alone.

This repository keeps its devbook as addressed Markdown chapters. Treat the folders as
task-scoped context, never baseline context: load the chapters a task names, walk
`related` and `depends-on` from them, and never load a folder whole.

| Folder | Holds | Rules |
| --- | --- | --- |
| `.devbook/arc42/` | Structure, decisions, and technical debt | `devbook-arc42.md` |
| `.devbook/tech/` | The technology graph and its ratings | `devbook-tech.md` |
| `.devbook/design/` | Design principles, tokens, and component guidelines | `devbook-design.md` |
| `.devbook/ai/` | How the team works with AI, stage by stage; it records a way of working and never instructs one | `devbook-ai.md` |

Every chapter carries a fenced `meta` block; write it in the same change as the content,
per `devbook-chapter-metadata.md`. Skip `annotation` fences when loading a
chapter as context: they hold review notes, not content.

Run the check before committing; it writes nothing:

    node .devbook/_tools/devbook-meta/build.mjs --check

An annotation fence is written only through `.devbook/_tools/devbook-meta/annotations.mjs`.

Nothing personal lives in this repository. Your own settings live under your devbook
config directory — `$XDG_CONFIG_HOME/devbook` when set, else `%APPDATA%\devbook` on
Windows and `~/.config/devbook` elsewhere — for every repository, or under `repos/<id>/`
there for this one, `<id>` being the `id` in `.devbook/config.json`. `AGENTS.local.md`
in either place holds instructions for your machine only: read it when it exists and
treat it as this file's last word. What else lives there, each plugin says for itself.
Put no secret in it — your home directory is not private.
<!-- devbook:end -->

<!-- devbook-derived:begin -->
## Devbook tooling

Written by `devbook-derived:init` and kept by `devbook-derived:update`. Edit outside these markers.

Files under any `_meta/` folder — `.devbook/_meta/` and one per adopted folder — are
generated tool input, written by `.devbook/_tools/devbook-meta/build.mjs --write`. Never read one as a source of
fact and never hand-edit one. Never regenerate or commit them in a session — the scheduled job owns that refresh. Fix what devbook's check reports in the source
Markdown; the check itself is in devbook's section above.
<!-- devbook-derived:end -->
