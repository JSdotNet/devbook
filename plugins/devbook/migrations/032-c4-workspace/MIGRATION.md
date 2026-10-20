# 032 — architecture diagrams move into the C4 workspace

```meta
contractVersion: 32
appliesTo: [arc42]
breaking: no
```

## What

Contract 32 makes `.devbook/arc42/workspace.dsl` the one place an architecture element or view
is defined, and a chapter shows a view by embedding `![…](c4:<view key>)`. This migration moves
what a repository drew before that into the workspace, in this order:

| Source | What happens |
| --- | --- |
| No workspace | `workspace.dsl` is created: the repository's `id`, `!identifiers hierarchical`, an empty `model` and `views` |
| `arc42/_c4/*.dsl` | The one file that opens a `workspace` moves to `workspace.dsl`; any other `.dsl` moves to `arc42/c4/`, and each `!include` is rewritten to follow it |
| Mermaid `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` | Its elements and relationships go into the model and it becomes one view; the fence is replaced by the view's embed |
| Mermaid `sequenceDiagram` | When every participant matches a workspace element, it becomes a dynamic view and its embed |
| Archify `architecture` or `sequence` spec under an `arc42/` `_archify/` folder | Read the same way, in place of the fence it re-draws; the spec, its artifact, and its `index.json` entry are deleted |
| A debt record under `tdr/` | `severity` and `status` are written into its top-level `meta` from the first bold word under `## Severity` and `## Status` |

The C4 fences and architecture specs convert first and the sequences after them, so a sequence
can name what a container diagram added. An element is matched by name, then by identifier,
and created only where nothing matches. A boundary that matches nothing is the system or
container its matched children share. A relationship is added only where none joins the two
elements already, and every dynamic step gets one to rest on. A view's key is its section
heading's slug. An Archify spec is tied to its fence by the hash its index files it under,
and by its ordinal only where it has no index entry; a hash that matches no fence means the
fence changed since the spec was drawn, and the spec is reported and left. It draws the level its chapter documents: context in 03, containers
or components in 05 and a building block. A debt record's `identified` is the resting value, so
it is written by removing the folder's rung, never as a line.

Each of these is reported and left as it is, and never counts as work. The first eight are
reported on every run; the last two once, by the run that made the change they are about:

- a diagram whose view kind belongs in another chapter, per `devbook-arc42.md`;
- a sequence with a participant no element matches — outside 06 and a block's `## Runtime`
  it draws inside one element and may stay;
- an Archify `lifecycle` or `workflow` spec, a spec with no fence to replace, and two specs
  re-drawing one fence;
- a diagram with a statement the migration does not read, an element it cannot place, or a
  name that matches two elements, or one with no identifier;
- a `_c4/` that holds no single workspace, or whose files would land on ones already in `c4/`:
  then nothing moves and no diagram converts, so no model is left stranded beside a new one,
  and the run exits `1`, with and without `--check`, so the ledger never records it until a
  person has merged the two;
- a file left in `_c4/` that is no workspace, such as a `references.json`;
- a debt record whose section opens with a word off the scale or the ladder, and every
  debt `status` when `.devbook/statuses.json` gives `tdr/` a ladder of its own;
- a debt record with no `## Severity` section;
- an element described by its name because its diagram gave it no description;
- a view whose twin of the same kind and scope the moved workspace already held.

Every element a conversion created is listed by the run that created it.

## Why

Two notations drew the same system and agreed on nothing. Once the check reads the workspace,
a fence is a second model nothing checks, and a hand conversion in every repository is the
chore a migration exists to replace. The record is `.devbook/arc42/adr/c4-model.md` in the
marketplace.

## What breaks

Nothing the check reads. The migration reads its own result with the plugin's reader before it
writes, and a conversion that would add a problem to the workspace writes nothing and exits
`1`. A repository without `arc42/` adopted records `not-applicable` in the ledger, per
`assets/reconcile-protocol.md`, and adopting it later re-evaluates the migration. A person
still reads the result: a matched name can be the wrong element.

## Released in 1.27.0

Every plugin is `1.27.0`; contracts 31 and 32 ship in it, and this is the one migration. The
names a consuming repository's plan writes against, exactly as the check reads them:

| Name | Where | What it is |
| --- | --- | --- |
| `.devbook/arc42/workspace.dsl` | arc42/ | The one Structurizr DSL workspace, `!identifiers hierarchical` required |
| `.devbook/arc42/c4/` | arc42/ | The only folder the workspace may `!include` from |
| `![<alt>](c4:<view key>)` | any arc42/ section | Embeds one view, once, in the chapter its kind belongs to per `devbook-arc42.md` |
| `c4` | `meta`, arc42/ and domain/ | The workspace elements a chapter or file is about, as bare identifiers |
| `c4-touches` | `meta`, arc42/ and domain/ | The elements its consequences name but it is not about; never both fields |
| `code` | `meta`, top level of `arc42/building-blocks/<slug>.md` | Repository-relative folders holding the block's code, never files |
| `severity` | `meta`, top level of an `arc42/tdr/` record | `low`, `medium`, `high`, `critical`; missing is a warning |
| `status` on a debt record | `meta`, `arc42/tdr/` | Its own ladder: `identified`, `planned`, `in-progress`, `resolved`, resting at `identified`; a folder rung there is a warning |
| `\| Date \| Change \| Why \|` | a decision record's `## History` | The fixed table header, newest row first |
| `.devbook/arc42/_meta/c4/<view key>.svg` | devbook-derived | The committed render of each view, written only by the scheduled refresh; never an embed target |
| `.devbook/_tools/c4-render/` | devbook-derived | The renderer `init` materializes where arc42/ is adopted |

Contract 31 takes `openspec/changes/` out of the graph: a chapter's `related`, `depends-on`,
or prose link into it is an error. `devbook-derived` now needs `devbook` `>=1.27.0`, whose
`c4.mjs` its renderer reads. Its nightly and drift workflows gained the render step, and both
are customized on every install, so `devbook-derived:update` reports the shipped diff for a
person to merge rather than replacing them.

## Run it

```bash
node migrate.mjs --check
```

`--check` lists every change the run would make, writes nothing, and exits `1` while one is
left. Drop the flag to apply. Running it twice changes nothing. Both forms take `--root <path>`,
defaulting to the working directory.
