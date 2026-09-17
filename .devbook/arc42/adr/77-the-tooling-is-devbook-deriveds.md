# 77. The Tooling Is devbook-derived's, and devbook Is the Convention Alone

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/adr/68-the-generator-lives-under-devbook.md", ".devbook/arc42/adr/76-derived-artifacts-are-computed-never-committed.md", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/domain/devbook-derived/domain.md", ".devbook/domain/devbook/domain.md", ".devbook/domain/plugin-authoring/domain.md#layer", ".devbook/domain/context-map.md"]
```

Everything under `tools/devbook-meta/` — the schema validator, the reference graph, the
outline, the annotation index, the fence writer `annotations.mjs`, and the `build.mjs` CLI that
checks and writes — moves out of `devbook` into a new L1 plugin, `devbook-derived`, together
with the `devbook-graph` canvas that imports those modules, the refresh script, both workflows,
and the `devbook-derived-artifacts.md` rule. `devbook` keeps the convention: the folder rules,
the schema stated in prose, the converters, `annotation-sweep`, `devbook-check`, and the install
that puts the rules and its `AGENTS.md` section into a repository. The committed `_meta/`
indexes stay, for now.

**This supersedes [record 76](76-derived-artifacts-are-computed-never-committed.md) the same
day, and the reason is a choice, not a discovery.** Record 76 removed the writer because
nothing in this repository read the files. The owner's answer was that the files are not
always needed and will be phased out, but not now; and that a checker without a generator
beside it does not earn a plugin of its own. So the writer is restored as it was, and the
check and the generator move together as one tool into one plugin. Record 29 stands again:
refresh is automation's, and a session never regenerates.

**Why the whole folder and not the writer half.** [Debt record 5](../tdr/5-derived-index-is-not-optional.md)
offered the writer alone as `devbook-derived`, keeping the check in L0 so a devbook-only
repository could still validate its own schema. That was the recommended shape, and it was
declined: the check and the generator are one program over one parsed corpus, and the argument
that the check is "the foundation's" describes what the check validates rather than what
ships it. The convention is the rules; the tool that enforces them is a tool. A repository
that adopts the rules and not the tool has readable, addressed Markdown and no gate — the
same position it is in today before running any install.

**What the layer rule now costs.** [Layer](../../domain/plugin-authoring/domain.md#layer) says a
lower layer never names a higher one, and after this record `devbook` names
`devbook-derived`'s payload path in five places: `devbook:install` runs the check in phase 6,
`devbook-check` runs it in step 1, `annotation-sweep` deletes fences through `annotations.mjs`,
the converters' closing step runs it, and the `AGENTS.md` section it renders no longer names
the check at all. Each of those five names the **materialized path**,
`.devbook/_tools/devbook-meta/`, never the plugin — the same seam [debt record 4](../tdr/4-delivery-depends-on-devbook.md)
describes for `delivery`, and the same one debt record 5 already proposed for the writer —
and each says what it does when the path is absent: report that no checker is installed, name
`devbook-derived:install`, and continue with the rest of its work. A missing upstream degrades
and never fails a load, which is the strategic rule the context map already states. This is
the layer inversion the split accepts, and it is recorded here so nobody later reads the five
call sites as an accident.

**What moves, and what stays.**

| To `devbook-derived` | Stays in `devbook` |
|---|---|
| `tools/devbook-meta/` whole, tests included | `tools/devbook-tech/` — inventory scripts, not derivation |
| `extensions/devbook-graph/` — [record 5](5-devbook-still-ships-the-graph-canvas.md)'s lift, done by moving the modules it imports rather than publishing them | the nine folder and schema rules, and `rules.json` |
| `assets/build/Update-DevbookIndex.ps1`, both workflows | `assets/agents-section.md`, `reconcile-protocol.md`, `code-sync-protocol.md`, the spec kinds, the root wrappers |
| `rules/devbook-derived-artifacts.md`, the `.claude/settings.json` deny snippet | `devbook:install`, `devbook-check`, `annotation-sweep`, the converters, `prose-check`, `devbook-tech-update` |
| a new `install` that materializes the tool, the workflows, the script, the rule trio, and its own marker-fenced `AGENTS.md` section, stamped `components.derived` | its own install, which no longer materializes any of those |
| the session-start hook sentence about `_meta/` | the rest of the session-start guidance |

`devbook-collaboration` declares `devbook-derived` beside `devbook`: its findings are written
through `annotations.mjs`, and a dependency on the tool that writes them is honest where a
dependency on the folder that used to hold it was incidental. The Index Generator and Derived
Index chapters move to the new context's `domain.md`; the Reference Graph stays devbook's,
because what a reference *is* belongs to the schema, and only building it belongs to the tool.

**Version and contract.** The new plugin starts at 1.1.0 with the rest, and `contractVersion`
stays at 9 — no authored chapter changes shape. The materialized paths do not change:
`.devbook/_tools/devbook-meta/` is where [record 68](68-the-generator-lives-under-devbook.md)
put the tool and where it stays, so an installed repository would see only a different stamp
entry own it. No migration ships, on [record 64](64-1-0-0-is-the-first-release.md)'s rule that
the obligation starts at the first install, and `UPGRADING.md` carries no entry.

Consequence: record 76 is superseded; the `--print` flag it added survives, because a viewer
that computes rather than reads is still the cheaper consumer. Debt record 5 is resolved by
the split it proposed, taken one folder wider than it recommended. Record 5's canvas question
is closed: the canvas is packaged with the modules it imports, in a plugin that is not L0, so
the claim that a surface is never packaged with what it renders is still unenforced here —
now for a smaller and better reason, that the two are one tool. The Backlog app's reading of
`_meta/` off disk is unchanged.
