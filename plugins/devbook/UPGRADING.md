# Upgrading devbook

Behaviour changes a consumer would notice, newest first.

## 1.1.0: the converters are three skills

**No migration; nothing in your devbook folders moves.** `--check` is unchanged, no schema
field or stamp key moved, and `contractVersion` stays at **9**. What changed is the names
you call, per `.devbook/arc42/adr/67-the-converters-are-three-skills-named-after-openspec.md`.

- The ten `to-spec-<kind>` and `from-spec-<kind>` skills are gone. Call `devbook:sync-specs`
  where you called any `to-spec-*`, and `devbook:apply-change` where you called any
  `from-spec-*`. The kind is read off the chapter's `type` — or the file, where `.arc42`
  and `.design` define none — so nothing about the target changes.
- `apply-change` goes one step further than `from-spec-*` did: after deriving the brief it
  hands it to the flow that implements a change of its category — a repo-native `flow-*`
  skill first, then `delivery`'s `flow-feature` or `flow-bug` — instead of stopping and
  leaving the handoff to you. With no flow engine installed it stops with the brief exactly
  as before. It still edits no source or test tree itself.
- `devbook:verify-change` is new: the drift verdict per chapter, and no write. Reach for it
  where you used to run a converter only to see whether it would report `aligned`.
- What a kind needs lives once under `assets/spec-kinds/<kind>.md`. A repository that had
  copied or pointed at a `to-spec-*` or `from-spec-*` skill by path points there instead.
- The session-start hook and `rules/devbook-annotations.md` name the new skills. The next
  `devbook:install` refreshes the rule in a repository that still hashes to the shipped copy,
  and reports it as customized otherwise — the old sentence is harmless either way.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
