---
name: plugin-rules
description: How a plugin rule is authored, where its globs live, how it reaches each host, and why shared contract text sits in resources/ instead.
paths:
  - "plugins/*/rules/*.md"
  - "plugins/*/rules/rules.json"
  - "plugins/*/resources/*.md"
---

# Plugin rules

A plugin rule is a template an install writes into a repository, and `rules/` holds nothing
else — shared text a skill or an agent reads by path is a contract and belongs in `resources/`,
because the folder announces a delivery mechanism and a contract does not use it.
Two plugins here deliver rules: `devbook` and `devbook-collaboration`. Adding a `rules/` folder
to a third means writing the install that materializes it, in the same change.

`rules/<name>.md` is the body plus `name` and `description`, and nothing else: no `paths`, and
never `applyTo`, which is one host's spelling on a file no host reads it from. The globs live in `rules/rules.json` beside it, keyed by name, because that is
where the install skill reads them and where every rule's scope can be seen at once.

```json
{ "rules": { "devbook-arc42": { "paths": [".arc42/**", ".devbook/arc42/**"], "install": "arc42" } } }
```

`install` is optional and belongs to the plugin that materializes rules; devbook reads it as the
adopted folder that pulls the rule in, or `always`. `node tools/check-assets.mjs` fails on a
rule with no entry, an entry with no rule, and an empty `paths`.

Nothing here is auto-applied. Neither manifest has a rules or instructions key, so a rule
sitting in a plugin reaches a session nowhere until the install writes it into a repository,
where the host's own wrapper applies it against `paths`. That is why `paths` names a path in
the *consuming* repository — `.devbook/domain/**` and its siblings, the only place the glob can
resolve.

A `resources/` contract is the other half and works the other way: no globs, and it reaches a
session only through an explicit path reference from a skill or an agent. Add that reference in
the same change — an unreferenced contract silently does nothing in either host. Guidance for
editing the plugin's own files is a repository rule instead, authored in `.agents/rules/`.

Carry every layout the plugin supports: a glob that matches nothing applies nothing, and
nothing reports it. Cross-reference a sibling by its bare filename — `devbook-naming.md` — and
it resolves both here and wherever the install writes them, because the folder shape is the same
in both places. That is what the `rules/<name>.md` naming buys.

A repository-level rule is different: it is authored once in `.agents/rules/` and wrapped per
host. See [README.md](README.md).

Body budget 60 lines: [AUTHORING.md](../../AUTHORING.md).
