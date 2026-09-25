# Install

```meta
date: 2026-09-25
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/08-crosscutting-concepts.md#stamp", ".devbook/arc42/08-crosscutting-concepts.md#migration", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule", ".devbook/arc42/adr/hosts.md", ".devbook/arc42/adr/releases.md"]
```

A plugin reaches a repository through its `init` skill, is kept current by its `update`, and
reaches it in no other way. `init` refuses where the component's stamp exists and `update`
where it does not. Either writes the payload one way — rules as a host-neutral copy plus a wrapper per host, tooling under
`.devbook/_tools/`, one marker-fenced section of `AGENTS.md`, root wrappers where absent — and
records every copy's hash in the repository's stamp. A copy that still hashes to a release is
replaced; one edited since is reported as customized and never overwritten. Only `devbook`,
which rewrites content the repository authored, carries a contract version and a migration
ledger; every other component is payload-only. This repository stamps itself and materializes
nothing, because it is the payload's source.

## Why

```meta
```

**Rules are delivered, never auto-applied.** Neither manifest has a rules key and neither host
has a rules component, so a scoped rule inside a plugin fires nowhere until an install writes it
into a repository. A plugin rule is therefore a template — `name` and `description`, globs in
`rules/rules.json` beside it — installed as the same trio this repository uses for its own rules
([hosts](hosts.md)): `.agents/rules/<name>.md` verbatim, a pointer wrapper per host. The file is
named for what it becomes, so a rule citing a sibling by bare filename resolves in the plugin
and in every repository alike. Globs carry both layouts, because a glob matching nothing applies
nothing and trimming would make the rule customized from the first reconcile — a rule that
mattered while two layouts existed.

**One section of `AGENTS.md`, and the root wrappers where absent.** The one thing a
repository's instruction file should say about its devbook — which folders, where the rules
are, how the indexes are checked — was said nowhere on disk. The section is rendered from the
stamp's `adopted` list, carries structure and never routing, and is materialized like a file:
keyed `AGENTS.md#devbook`, hashed, rewritten only while the fenced text still matches. A first
install then landed on a section Claude Code never loaded, because nothing carried the root
wrapper; the install now creates `CLAUDE.md` and `.github/copilot-instructions.md` where
neither exists, stamped `managed: false` from the start, and never touches one that exists.

**Tooling under `.devbook/_tools/`.** The generator is plain Node with no host in it; under
`.github/tools/` a first install read as devbook adding GitHub tooling. `.devbook/` is the one
parent, and the underscore is what the naming rule reserves for machinery. `.github/`
keeps only what GitHub reads: the workflows and the Copilot wrappers.

**What a component writes decides whether it needs a ledger.** `devbook` rewrites chapters,
`meta` blocks, and other components' entries — none of it hash-comparable, so only a script can
move it and only a ledger says whether the script ran. A payload-only component copies files it
owns whole, and hash-matching is then the whole migration mechanism. A change that must reach an
already-edited copy has no mechanism by design; the seed is meant to be edited.

**A procedure is the rule trio with the ownership reversed.** A rule body is the plugin's
and is refreshed while it hashes to a release; a procedure body under `.agents/skills/` is
the repository's from its first edit, and the only thing the plugin keeps refreshing is the
wrapper, which now carries the procedure's goal above the pointer. Same three files, same
hashes, same customized rule; what differs is which of the three the plugin expects to keep
rewriting. A present file the component never stamped — a `start` an earlier engine seeded —
is asked about once and kept as the repository's or replaced, never silently overwritten.

**OpenSpec's verbs: `init` and `update`, `validate` and `doctor`.** Where OpenSpec has a word,
the marketplace uses it, so a person who knows one tool reads the other without translating.
One `install` covering first setup and upgrade asked a stamped repository what its stamp already
answered, and said nothing about which case a run was; `init` scaffolds and stamps, `update`
refreshes, migrates, and re-stamps, and each refuses the other's case — "already initialized,
run update", "not initialized, run init". The same split took `check` apart: `devbook:validate`
asks whether the corpus is valid, and `devbook-config:doctor` whether the installation is
current, because only the second reads every component's stamp and only devbook-config may.
Sync was rejected earlier for the same reason as before: it names a two-way reconcile between
peers, and a plugin writes while the repository never writes back. Every such skill is
addressed `plugin:init` and `plugin:update`, because the plugin name already carries the scope.

**`devbook-config` is the front door; a component's own pair is hidden from the menu.**
`devbook-config:init` and `devbook-config:update` fan out to every adopted component's pair,
so a menu listing both the orchestrator and six component pairs offered two ways to do one
thing and no hint which to pick. The pairs of `devbook`, `delivery`, `devbook-derived`, and
`devbook-procedures` carry `user-invocable: false`: gone from the `/` menu, still invocable by
the model, which is what the fan-out needs — `disable-model-invocation` would be the opposite
and break it. They are not removed, because no plugin depends on `devbook-config` and a
repository with `devbook` alone still reaches `devbook:init` by asking for it in words.
`delivery-schedule`'s pair stays visible: a person runs it directly to change a cadence, not
only through the fan-out. A host that does not know the key ignores it and keeps listing them.

**This repository materializes nothing.** A consuming repository has no generator until the
install brings one; here it is `plugins/devbook/tools/devbook-meta/`, and a second copy under
`.devbook/_tools/` would drift on the first edit. The rule trios no longer stand in the way:
`tools/check-assets.mjs` recognizes a delivered rule by name and derives its wrappers from the
shipping plugin's `rules.json`. The stamp lands anyway —
`devbook-config:doctor` classes no stamp at all as hard drift — with `materialized` holding the one
rendered section and nothing else. Hashes are taken over LF-normalized text, because the
working tree is CRLF and the index LF.

## Rejected

```meta
```

- A two-file rule shape with the body in `.github/instructions/`: every cross-reference between
  rules would need a rewrite at both ends.
- A contract version and ledger on every component: a counter that never moves beside a folder
  that stays empty.
- Reconciling the root wrappers after creating them: a root file is where a repository puts what
  it wants said to one host and not the other, so every later edit is a customization.
- Vendoring the generator into this repository's own `.devbook/_tools/`.
- One `install` that branches on whether the stamp exists: it hides which case a run is, and
  puts the adoption interview in front of an operation people run to change nothing.
- Removing the component pairs in favour of `devbook-config`: every plugin installs alone, and
  a repository without `devbook-config` would have no way in.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-25 | The component `init`/`update` pairs, bar `delivery-schedule`'s, are `user-invocable: false`; `devbook-config` is the menu's one entry. |
| 2026-09-23 | `init` and `update` replace `install` and `setup`; `validate` and `doctor` replace `check`. Migration 015 renames the bound ids. |
| 2026-09-21 | Procedure skills land as a trio whose wrapper carries the goal; `devbook-procedures:install` writes them, `delivery:install` stamps `pluginVersion` alone. |
| 2026-09-15 | `tools/devbook-meta/` and `tools/devbook-tech/` materialize into `.devbook/_tools/`, not `.github/tools/`. |
| 2026-09-15 | The install creates `CLAUDE.md` and `.github/copilot-instructions.md` where absent, `managed: false`. |
| 2026-09-09 | This repository stamps itself — engine keys and three components — and materializes nothing. |
| 2026-09-09 | `contractVersion`, `adopted`, and `migrations` are `devbook`'s alone; the other components are payload-only. |
| 2026-09-07 | Plugin rules ship as a trio through the install; `applyTo` refused in a rule; every install skill is `install`. |
| 2026-09-07 | `<component>-sync` becomes `<component>-install`: nothing here reconciles two peers. |
| 2026-09-07 | `devbook:install` writes and reconciles one marker-fenced section of `AGENTS.md`. |
