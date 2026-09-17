---
name: install
description: 'Install this plugin''s chapter-collaboration rule into a repository so both hosts apply it on a matching read, and record it under components.collaboration in .devbook/config.json. Idempotent: run it on first setup, after upgrading the plugin, and to pick up a rule change. Use when: adopting devbook-collaboration, upgrading it, or the review rules are not being applied. Triggers on: "install devbook-collaboration", "set up chapter review", "collaboration install", "collaboration-install".'
---

# collaboration install

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

One rule, installed the way `devbook` installs its own: the rule verbatim, and a wrapper
per host beside it. Idempotent — first install, upgrade, and a rule change are the same run.

Stop and say so if `devbook` has no `components.devbook` entry with at least one adopted
folder. This plugin governs chapters that do not exist yet; run `devbook:install` first.

## What lands

`rules/chapter-collaboration.md` and its `paths` from `rules/rules.json`:

| Into the repository | Carries |
|---|---|
| `.agents/rules/chapter-collaboration.md` | the rule, byte-for-byte |
| `.claude/rules/chapter-collaboration.md` | `paths` verbatim, then the pointer line |
| `.github/instructions/chapter-collaboration.instructions.md` | the same `paths` comma-joined as `applyTo`, the rule's `description`, then the pointer line |

The pointer line is the whole body of both wrappers, and never a second copy of the rule:

> Read `.agents/rules/chapter-collaboration.md` and follow it before editing this file.

Copy `paths` as authored. A glob matching nothing applies nothing, while a trimmed file
matches no release this plugin shipped — so the next run would report it customized and
never refresh it again.

## The run

1. **Plan.** Show one table — `create`, `update`, `skip-customized` — and write nothing.
   Never skip this, not even when the plan is empty.
2. **Materialize.** Overwrite only a file whose hash matches a release this plugin shipped;
   that is stale. A hash matching nothing ever shipped is customized: report it, leave it.
3. **Stamp.** Rewrite `components.collaboration` — `pluginVersion` and `materialized`, each
   entry with the release it came from and the hash it had when it landed. Touch no other
   component's entry and no top-level key.
4. **Report** what moved, and leave the commit to the user.

The stamp shape is `devbook`'s, described in its `assets/reconcile-protocol.md` under
**The stamp**; this plugin writes its own entry there and reads devbook's `adopted` list.
