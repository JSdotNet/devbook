---
name: update
description: 'Move a repository''s committed devbook index forward after upgrading devbook-derived or changing which devbook folders are adopted — overwrite every materialized file that still hashes to a release this plugin shipped, report the customized ones, re-render its AGENTS.md section, re-trim the workflows to the adopted folders, and re-stamp components.derived. Refused where no components.derived stamp exists: run devbook-derived:init. Use when: upgrading devbook-derived, or devbook''s adopted folders changed. Triggers on: "devbook-derived update", "update devbook-derived", "upgrade devbook-derived", "refresh the index workflows".'
user-invocable: false
---

# devbook-derived update

Open the reply with `devbook-derived@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reconcile what `devbook-derived:init` materialized with the installed release. What lands,
the edits on the way in, and the `AGENTS.md` marker rules are `../init/SKILL.md` under
*What lands*; the stamp and hash rules are devbook's `assets/reconcile-protocol.md` under
**The stamp**. Neither is repeated here.

**Refuse when `components.derived` is absent.** Say "not initialized, run
`devbook-derived:init`" and stop: with no stamp, every file on disk reads as customized.
Stop too if `.devbook/_tools/devbook-meta/` is absent — run `devbook:update` first.

1. **Detect.** Hash every path in `components.derived.materialized` and compare it with the
   release it came from. Read the adopted folders from devbook's stamp, never from disk.
2. **Plan.** One table — `update`, `skip-customized`, `orphan` — and write nothing. Never
   skip this, not even when the plan is empty. A path this release no longer ships is an
   orphan: reported, never deleted.
3. **Materialize.** Overwrite only a file whose hash matches a release this plugin shipped.
   Both workflows are customized from their first landing, so an adoption change is reported
   for a person to apply to their path filters, never merged in.
4. **Stamp.** Rewrite `components.derived` — `pluginVersion` and `materialized`.
5. **Verify and report** exactly as `init` does, and leave the commit to the user.
