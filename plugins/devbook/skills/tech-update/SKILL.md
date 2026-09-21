---
name: tech-update
description: 'Refresh a repository technology graph from deterministic package inventories and repo analysis. Use when: update technology graph, refresh tech/, scan .NET packages, scan frontend packages, package graph, technology inventory. Produces inputs for the `tech/` flow and keeps package-derived facts reproducible through scripts.'
---

# Devbook technology graph update

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Update a repository's `tech/` technology graph from repeatable evidence. Package-derived
facts come from deterministic scripts; non-package technologies come from targeted repository
analysis and architecture grounding.

Use this skill before or during the `tech/` flow when the requested change is broad enough
that the graph should be refreshed from the repository instead of editing one known
technology chapter by hand.

## Inputs

- Target repository root. Default to the current working directory.
- Target `tech/` scope. Default to every `tech/` layer that exists.
- Optional focus, such as backend packages, frontend packages, tooling, deployment, or all.

If the repository has no `tech/` folder, stop and run `devbook:install` first for the
`tech/` adoption path.

## Deterministic package inventories

Run package discovery with scripts, not ad hoc shell pipelines. The scripts sort paths,
packages, and versions, emit JSON with no timestamps, and ignore build output folders.

From a repository that installed the devbook tools:

```bash
node .devbook/_tools/devbook-tech/dotnet-packages.mjs --root . > .devbook/tech/_inventory-dotnet.json
node .devbook/_tools/devbook-tech/frontend-packages.mjs --root . > .devbook/tech/_inventory-frontend.json
```

When running directly from the plugin source during development, use the plugin paths:

```bash
node plugins/devbook/tools/devbook-tech/dotnet-packages.mjs --root .
node plugins/devbook/tools/devbook-tech/frontend-packages.mjs --root .
```

Treat these JSON files as temporary evidence. Do not commit them unless the repository has
explicitly adopted inventory evidence files; the durable record remains the `.devbook/tech/*.md`
chapters and generated `_meta/*.json` indexes.

## Workflow

1. **Load governed context.** Read `devbook-tech.md`,
   `devbook-chapter-metadata.md`, `.devbook/tech/technology-graph.md`, and only the
   `tech/` layer files in scope. Load `.devbook/arc42/04-solution-strategy.md`,
   `.devbook/arc42/07-deployment-view.md`, and `.devbook/arc42/09-architecture-decisions.md` only when they
   exist and the refresh touches architecture decisions.

2. **Run deterministic package scans.** Run the .NET and frontend inventory scripts above.
   Use their JSON as the only source for package names, package versions, target frameworks,
   package managers, workspaces, and dependency sections.

3. **Analyze non-package graph parts.** Inspect the repository for technologies that package
   manifests do not fully describe:

   | Area | Evidence to inspect | Typical `tech/` type |
   | --- | --- | --- |
   | Runtime and SDK | `global.json`, `Dockerfile`, `*.csproj`, `.config/dotnet-tools.json` | `runtime`, `tool` |
   | Frontend toolchain | `vite.config.*`, `next.config.*`, `angular.json`, `tsconfig*.json` | `framework`, `tool` |
   | CI/CD and automation | `.github/workflows/**`, scripts under `scripts/` | `tool`, `platform` |
   | Containers and hosting | `Dockerfile`, `compose*.yml`, Kubernetes manifests, Aspire AppHost files | `platform`, `service` |
   | Protocols and formats | OpenAPI files, GraphQL schemas, protobuf files, message contracts | `protocol`, `format` |

   Do not infer adoption from a stale file alone. Prefer active manifests, referenced scripts,
   and architecture documentation. Mark uncertain technologies as `candidate` or leave them
   out with an open question in `technology-graph.md`.

4. **Map findings to `tech/`.** For each technology, choose exactly one owning layer. Shared
   technologies used by multiple layers belong in `shared.md`; layer-specific technologies
   depend on the shared node. Package nodes normally use `type: package`, while frameworks,
   runtimes, tools, services, platforms, protocols, and formats use the closest specific type
   from `devbook-tech.md`.

5. **Author through the `tech/` flow.** Route the actual `tech/` edits through the
   `tech/` flow unless this skill is already being run as part of that flow.
   Update chapter metadata, the Mermaid graph, and the layer table together.

6. **Run the check.** Never regenerate here — the refresh is the scheduled job's, or
   `build/Update-DevbookIndex.ps1` on demand:

   ```bash
   node .devbook/_tools/devbook-meta/build.mjs --scope tech --check
   ```

   If it reports unresolved references or schema violations, fix the source Markdown or
   run `devbook:check`. When `.devbook/_tools/devbook-meta/` is absent, run
   `devbook:install` first.

## Output expectations

- Deterministic .NET and frontend inventory JSON reviewed for package-derived facts.
- `tech/` chapters updated through the `tech/` flow with valid metadata blocks.
- Non-package technologies analyzed from repository evidence and recorded only when grounded.
- Mermaid graph edges match `depends-on` metadata.
- The check passes at the `tech` scope; the indexes are refreshed by the scheduled job, never here.

## Do not

- Do not hand-edit `_meta/*.json` files.
- Do not use one-off shell pipelines as package evidence when the inventory scripts exist.
- Do not commit temporary `_inventory-*.json` files unless the repository explicitly documents
  them as durable evidence.
- Do not record a technology decision in `tech/` before the corresponding ADR or architecture
  chapter exists when the choice changes system direction.
