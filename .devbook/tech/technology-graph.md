# Technology Graph

```meta
rating: adopted
index: root
```

This is everything this repository builds with. It has no runtime and no dependency manifest: the
assets are Markdown and JSON, and the platforms below read them. Each technology has one chapter
in its layer file; this file is the map.

**Layers**

| File | Covers |
| --- | --- |
| [shared.md](shared.md) | Cross-layer formats and protocols: Markdown, the Model Context Protocol, MCP Apps. |
| [hosts.md](hosts.md) | What reads or runs an asset: two plugin APIs, the Claude Code CLI, the scheduler, the Copilot extension SDK. |
| [tooling.md](tooling.md) | What the executable parts run on: Node, PowerShell; and the Aspire CLI a shipped procedure drives. |

Three layers is the whole stack. A fourth appears only when a technology belongs to none of these,
and the change that adds its file registers it in this table.

**Graph**

Nodes are technologies, edges are `depends-on`, shading is `status`. Five edges is the honest
count: almost everything here is read by a host rather than built on another technology.

```mermaid
graph LR
  subgraph shared
    markdown[Markdown]
    mcp[Model Context Protocol]
    mcpApps[MCP Apps]
  end
  subgraph hosts
    claudeApi[Claude Code Plugin API]
    claudeCli[Claude Code CLI]
    copilotApi[Copilot Plugin API]
    copilotSdk[Copilot Extension SDK]
    scheduler[Scheduled Cloud Sessions]
  end
  subgraph tooling
    node[Node]
    pwsh[PowerShell]
    aspireCli[Aspire CLI]
  end
  mcpApps --> mcp
  claudeCli --> claudeApi
  scheduler --> claudeApi
  copilotSdk --> copilotApi
  pwsh --> node
  classDef adopted fill:#cde7c9,stroke:#3c7a35,color:#1c3a19;
  classDef trial fill:#fff1c2,stroke:#b58a00,color:#4a3800;
  class markdown,mcp,claudeApi,copilotApi,node,pwsh adopted;
  class mcpApps,claudeCli,copilotSdk,scheduler,aspireCli trial;
```

**How to Read It**

`status` rates a technology in this repository, on the radar ladder `candidate`, `trial`,
`adopted`, `hold`, `retired`. The five `trial` entries share one reason: nothing here has exercised
them yet, and each says what a first real run would test.

To add a technology:

1. Write its `##` chapter in its layer file, with `status`, `type`, and any `depends-on` edges.
2. Add its node and edges to the graph above in the same change.

**Open Questions**

- Does the OpenSpec CLI belong in `hosts.md`? `devbook-openspec` installs and drives it in an
  adopting repository, at the range `>=1.13.2 <3.0.0` since its 2.x support, but this repository
  has no `openspec/` folder and runs it nowhere. PowerShell is listed on the same grounds: a
  script this repository ships into others. A person decides whether a tool the plugins drive
  elsewhere earns a chapter here.

To change a rating, change it in the chapter and in the `class` line here together. The generated
`_meta/graph.json` beside this file comes from the chapters, never from this diagram, so when the
two disagree the diagram is stale.
