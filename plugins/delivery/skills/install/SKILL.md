---
name: install
description: 'Write this engine''s two seeded procedures into a repository — start, how its application comes up, and capture, how evidence of the feature being built is taken — each as one editable copy with a pointer wrapper per host, and record them under components.delivery in .devbook/config.json. Idempotent: first install, plugin upgrade, and a seed change are one run. Use when: adopting the delivery engine in a repository, upgrading it, or the start or capture skill is missing. Triggers on: "delivery install", "install delivery", "seed the start skill", "seed the capture skill", "delivery-install".'
---

# delivery install

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Two procedures the engine names but cannot write, installed the way `devbook` installs its
rules: the procedure once, a wrapper per host beside it. Idempotent — first install, an
upgrade, and a changed seed are the same run.

Everything about the shape is `assets/skill-wrappers.md`; the stamp, the hashes, and what
customized means are `assets/reconcile-protocol.md` in the devbook plugin. Neither is
repeated here.

## What lands

| Into the repository | Carries | Managed |
|---|---|---|
| `.agents/skills/<name>.md` | `assets/skills/<name>.md`, byte-for-byte | until the repository edits it |
| `.claude/skills/<name>/SKILL.md` | the seed's `name` and `description`, then the pointer line | yes |
| `.github/skills/<name>/SKILL.md` | the same two fields, then the pointer line | yes |

The pointer line is the whole body of both wrappers, never a second copy of the procedure:

> Read `.agents/skills/<name>.md` and follow it.

## The run

1. **Resolve what this repository needs.** Skip `start` when `extensions.app.start` is
   `null` — somebody decided there is nothing to start; skip `capture` when
   `policy.qa.depth` is `skipped` or `policy.qa.ceiling` is `startup-only`, since no
   scenario runs. Ask before writing either, and say which was skipped and
   why.
2. **Plan.** One table — `create`, `update`, `skip-customized` — and write nothing. Never
   skip this, not even when the plan is empty.
3. **Materialize.** Overwrite only a file whose hash matches a release this plugin shipped;
   that one is stale. A hash matching nothing ever shipped is the repository's own: report
   it, leave it, and never merge a newer seed into it.
4. **Stamp.** Rewrite `components.delivery` — `pluginVersion` and `materialized`, each entry
   with the release it came from and the hash it had when it landed. Touch no other
   component's entry, and none of the four engine-owned top-level keys, which belong to
   `devbook-config:setup`.
5. **Report** what moved, name every customized file left alone, and leave the commit to the
   user.

Say plainly that both skills are now the repository's to edit, and that neither is required:
absent a `capture` skill the Validation phase captures per
`resources/capture-contract.md` itself.
