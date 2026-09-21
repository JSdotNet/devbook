# 4. delivery Depends on devbook

```meta
date: 2026-09-07
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/adr/configuration.md", ".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

**Remediation state:** in-progress · **Severity:** medium · **Owner:** the maintainer

## The debt

```meta
```

`delivery` declares no dependency, and its README devotes a section to what it never depends
on. It depends on `devbook` anyway. Five of its sixteen flows are named after a devbook folder,
restate devbook's schema rules, and run devbook's installed tool by the path devbook installs
it to. What is missing is not the coupling; it is the declaration.

Four kinds of evidence, in rising order of how hard they are to explain away.

**Names.** `flow-arc42`, `flow-domain`, `flow-tech`, `flow-design`, and `flow-ai` take their
names and their whole scope from `.arc42`, `.domain`, `.tech`, `.design`, and `.ai`. Each stops
at Stage 1 when the repository has not adopted the folder.

**A payload path.** Each of the five runs `node .devbook/_tools/devbook-meta/build.mjs --check`.
That is devbook's generator at the path `devbook-install` writes it to — a plugin's payload,
addressed by name from a plugin that claims not to know it exists.

**Restated rules.** Each of the five requires the `meta` block, forbids writing the `approved`
rung, and forbids regenerating `_meta/` in the run. Those are three of devbook's own rules,
restated in `delivery`. It is the fault
[Flows Belong to Delivery](../adr/plugin-boundaries.md) charged
`devbook-flows` with — a Metadata Enforcement stage restating what devbook's instruction files
already state — surviving the change that was supposed to remove it.

**Drift that already happened.** `delivery.tracker` admitted `devbook` as a provider and
described it writing `.backlog/` chapters, in `surface-contract.md`, `flow-phases.md`, and the
README. devbook's migration `006-drop-backlog` removed that folder: the generator recognizes
five, and the `implements` field the folder carried is gone. The engine documented a binding its
named provider could no longer honour, and nothing caught it — which is the argument for this
record rather than an argument about it.

**2026-09-08. That half is repaired.** The provider is `markdown` and names no plugin: chapters
in whatever folder a repository that plans work as Markdown keeps them in. The capability the
decision argued for survives — three implementations of one operation set — and the claim that
devbook supplies the folder does not. What the repair does not touch is the coupling this
record is about: the five folder flows still name devbook's paths, and no check spans the two
plugins, so the next payload-path rename still lands the way this one did.

**2026-09-15. The first option is taken, by way of a fold.** The five folder flows are one,
`flow-spec`, under [the flow engine record](../adr/flow-engine.md). It runs the check
the repository's own `AGENTS.md` devbook section names rather than devbook's payload path, and
carries none of the folder-specific rules the five restated — the keyboard rule, the edge check,
the alias check, the vendor-and-version test, the authoritative-source stage are each in the
instruction file that owns them. What remains of the coupling is the folder names the flow is
called after and the `meta` block it expects every chapter to carry; still undeclared, still
unchecked across the two plugins, and now one skill wide instead of five.

What is *not* the debt is `.devbook/config.json`. The path is a path, as
[the surface contract](../../../plugins/delivery/resources/surface-contract.md) says: the engine
reads that file whether or not a single folder is adopted, and `devbook-config` owns it and
declares no dependency either.

## Origin

```meta
```

Taken on 2026-09-07, in the change that removed the `devbook-flows` bridge and folded the five
folder flows into `delivery`.

That decision's argument was that rules reach a session through the host — an instruction file
declares the paths it governs, `devbook-install` materializes it into the repository, and any
session reads it by path — so a flow needs the governed folder to exist and nothing else. The
argument is right about the *rules* and silent about the *tool* and the *folder names*. A
hand-authored `.arc42/` with no devbook installed satisfies "the folder exists", and the check
line then names a file that is not there; the flows hedge it as "when the repository ships it",
which is a dependency with the failure written into the prose instead of the manifest.

Splitting `delivery` into `delivery` and `delivery-devbook` was raised the same day and
declined the same day: redrawing the boundary twenty-four hours after it moved costs a second
rename wave for a coupling nothing has broken yet. This record is what was written instead.

## Affected components

```meta
```

`delivery`, in five skills and three tracker mentions. `devbook`, which cannot move a payload
path or rename a folder without a coordinated `delivery` release it has no way to require.
`delivery-schedule` inherits the coupling through `delivery`.

## Impact

```meta
```

Nothing is broken today. The cost is everything a declared dependency would have bought.

**Nothing warns.** A repository that enables `delivery` alone gets sixteen flows, five of which
stop at their first stage. No manifest field, and no line in the README's own dependency
section, says which five.

**Nothing versions.** `delivery-schedule` pins `delivery >=2.0.0 <3.0.0`. Nothing pins
devbook's contract version, so devbook can and did make a breaking change — contract 6 dropped
`.backlog` — without `delivery` noticing.

**The [layer table](../08-crosscutting-concepts.md#layer) has no row for it.**
`delivery` is not L1 over `devbook`: eleven of its flows work with devbook absent. It is not
the L2b bridge: one stack, not two. It is not a surface. Undeclared is the only position left,
and an undeclared coupling has nowhere for a check to live — which is exactly why the
`.backlog/` drift sat there unnoticed.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Name the coupling without moving it: the five flows resolve the repository's own check instead of naming devbook's path, drop the three restated schema rules, and `delivery`'s README states which flows need an adopted folder and which devbook contract they assume | Cheapest, and it removes the silent half. Keeps `delivery` installable alone, which is the property the engine is unwilling to trade. Does not make the dependency machine-checkable |
| Split into `delivery` and `delivery-devbook`, an L1 extension over `devbook` holding the five folder flows and declaring the dependency | What the layer model already describes, and the honest shape once the coupling is admitted. But it reopens a boundary settled a day earlier and rebuilds `devbook-flows` under a permitted name — worth it when a second devbook-shaped concern arrives to share the plugin, not before |
| Declare `devbook` a dependency of `delivery` outright | One manifest line. Costs the engine's strongest property: a missing devbook would demote all twenty-four skills, which is precisely what the README's dependency section refuses for specialists |
| Leave it | The next devbook rename lands the same way `.backlog` did — silently, in three files, found by a reader |

Take the first now; it is a documentation and prose change in one plugin and closes the drift.
Hold the second until a second concern would share `delivery-devbook`, because a plugin created
for one reason is the bridge this repository just finished removing.

**Trigger:** the next time devbook moves a payload path, renames a folder, or bumps its
contract — or the first request for a sixth folder flow, whichever comes first. Migration
`006-drop-backlog` fired the first clause; its `.backlog/` half is repaired as of 2026-09-08,
and the coupling it exposed is not.
