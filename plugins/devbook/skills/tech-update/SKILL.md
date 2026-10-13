---
name: tech-update
description: 'Refresh a repository technology graph from deterministic package inventories and repo analysis. Use when: update technology graph, refresh tech/, scan .NET packages, scan frontend packages, package graph, technology inventory. Produces inputs for the `tech/` flow and keeps package-derived facts reproducible through scripts.'
---

# Devbook technology graph update

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Refresh `tech/` from repeatable evidence: package facts from deterministic scripts, the rest
from targeted repository analysis. The scope defaults to every `tech/` layer that exists; a
focus — backend, frontend, tooling, deployment — narrows it. With no `tech/` folder, stop and
adopt it first, through `devbook:update`, or `devbook:init` where devbook has no stamp yet.

1. **Load context.** `devbook-tech.md`, `devbook-chapter-metadata.md`,
   `.devbook/tech/technology-graph.md`, and the layer files in scope. Load
   `.devbook/arc42/04-solution-strategy.md`, `07-deployment-view.md`, and
   `09-architecture-decisions.md` only when they exist and the refresh touches a decision.
2. **Scan packages** with the scripts, never an ad hoc pipeline. Their JSON is the only source
   for package names, versions, target frameworks, package managers, workspaces, and
   dependency sections:

   ```bash
   node .devbook/_tools/devbook-tech/dotnet-packages.mjs --root . > .devbook/tech/_inventory-dotnet.json
   node .devbook/_tools/devbook-tech/frontend-packages.mjs --root . > .devbook/tech/_inventory-frontend.json
   ```

   The JSON is temporary evidence: commit it only where the repository documents inventory
   files as durable evidence.
3. **Analyze what manifests do not describe:**

   | Area | Evidence to inspect | Typical `tech/` type |
   | --- | --- | --- |
   | Runtime and SDK | `global.json`, `Dockerfile`, `*.csproj`, `.config/dotnet-tools.json` | `runtime`, `tool` |
   | Frontend toolchain | `vite.config.*`, `next.config.*`, `angular.json`, `tsconfig*.json` | `framework`, `tool` |
   | CI/CD and automation | `.github/workflows/**`, scripts under `scripts/` | `tool`, `platform` |
   | Containers and hosting | `Dockerfile`, `compose*.yml`, Kubernetes manifests, Aspire AppHost files | `platform`, `service` |
   | Protocols and formats | OpenAPI files, GraphQL schemas, protobuf files, message contracts | `protocol`, `format` |

   Infer adoption from active manifests, referenced scripts, and architecture documentation,
   never from a stale file alone. Leave an uncertain technology out, with an open question
   in `technology-graph.md`.
4. **Map** each technology to its one owning layer per `devbook-tech.md` under *Authoring
   guidance* — `type: package` for a package, the closest specific type otherwise. Record a
   choice that changes system direction only once its decision record or architecture
   chapter exists.
5. **Write through the `tech/` flow**, unless this skill already runs inside it, and run
   `node .devbook/_tools/devbook-meta/build.mjs --scope tech --check`, repairing what it
   reports per `devbook:validate`. Never refresh `_meta/` here: the committed indexes belong
   to their scheduled job.
