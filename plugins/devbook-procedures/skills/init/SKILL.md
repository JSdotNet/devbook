---
name: init
description: 'Write the repository-owned procedure skills — start, show, capture, debug — into a repository for the first time, each as one editable copy under .agents/skills/ with a managed wrapper per host carrying the fixed goal, and stamp them under components.devbook-procedures in .devbook/config.json. Refused where that stamp already exists: run devbook-procedures:update. Use when: adopting devbook-procedures. Triggers on: "devbook-procedures init", "install devbook-procedures", "seed the start skill", "seed the show skill", "seed the capture skill", "seed the debug skill".'
---

# devbook-procedures init

Open the reply with `devbook-procedures@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Four procedures the plugin names but cannot write, installed the way `devbook` installs its
rules: the procedure once, a wrapper per host beside it. The shape, the goal, and what the
wrapper carries are `assets/skill-wrappers.md`; the stamp, the hashes, and what customized
means are `assets/reconcile-protocol.md` in the devbook plugin under **The stamp**. Neither
is repeated here. This plugin writes `components.devbook-procedures` and touches no other
entry.

## What lands

| Into the repository | Carries | Managed |
|---|---|---|
| `.agents/skills/<name>.md` | `assets/skills/<name>.md`, byte-for-byte | until the repository edits it |
| `.claude/skills/<name>/SKILL.md` | the seed's `name` and `description`, its `goal`, then the pointer | yes |
| `.github/skills/<name>/SKILL.md` | the same | yes |

**Refuse when `components.devbook-procedures` exists.** Say "already initialized, run
`devbook-procedures:update`" and stop.

## The run

1. **Resolve.** Ask which of the four to adopt, offering all four, and say that nothing to
   start means no `start`, `show`, or `debug`, and no evidence means no `capture` or `show`.
2. **Detect.** For each adopted name, hash what is on disk. A file present at a path this
   component has never stamped is somebody's — ask once, per procedure, whether to keep it as
   the repository's own (`managed: false`) or replace it with the seed; a wrapper is replaced
   without asking, since it holds nothing but the goal and the pointer.
3. **Plan.** One table — `create`, `update`, `skip-customized` — and write nothing. Never
   skip this, not even when the plan is empty.
4. **Materialize.** Overwrite only a file whose hash matches a release this plugin shipped. A
   hash matching nothing ever shipped is the repository's: report it, leave it, and never merge
   a newer seed into it.
5. **Stamp.** Write `components.devbook-procedures` — `pluginVersion`, `adopted`, and
   `materialized`, each entry with the release it came from and the hash it had when it landed.
6. **Report** what moved, name every customized file left alone, and leave the commit to the
   user. Say plainly that the four procedures are now the repository's to edit, and that the
   goal in each wrapper is not.
