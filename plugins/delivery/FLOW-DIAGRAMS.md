# Flow Diagrams

Every flow this plugin ships, drawn once. This keeps the
individual `SKILL.md` files focused on execution rules while preserving one reviewable
overview of stage order, approval gates, and PR handoff points.

Every diagram below starts at the flow's own first stage. **Update Base** runs before it in
every flow — the engine prepends that phase, so no diagram and no `SKILL.md` repeats it. See
**Phase: Update Base** in `resources/flow-phases.md`.

The **MCP servers** column names the engine's default servers by id, and *servers bound to a
point* for whatever the repository binds under `bindings["delivery.mcp"]` — none of which this
plugin ships. See **MCP Server Strategy** in `resources/flow-execution-model.md`.

## flow-project

```mermaid
flowchart TD
    A["Repository Creation (Manual)"] --> S["Stack Setup"]
    S --> R["README and Repository Instructions"]
    R --> GV["Repository Governance"]
    GV --> B["GitHub Actions Workflows"]
    B --> C["Specification & Architecture Intake"]
    C --> D["Tooling & Dependencies"]
    D --> E["Implementation"]
    E --> F["Build & Test"]
    F --> G["Validation"]
    G --> H["Personal Validation"]
    H --> I{User approves?}
    I -->|Yes| J["Create Pull Request or Skip"]
    I -->|No| K["Return to the relevant earlier stage"]
    K --> S
    J --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> L["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Repository Creation (Manual) | — | — |
| Stack Setup | the `implement` service, running `devbook-config:setup` | — |
| README and Repository Instructions | the `docs` role, the `implement` service | servers bound to `spec` |
| Repository Governance | *(default)*, through the `pr-lane` slot | servers bound to `spec` |
| GitHub Actions Workflows | the `implement` service | — |
| Specification & Architecture Intake | the `architecture` role | servers bound to `spec` |
| Tooling & Dependencies | the `implement` service | `microsoft-learn` |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture for new functionality only)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-update-packages

```mermaid
flowchart TD
    A["Dependency Analysis"] --> B["Update Planning"]
    B --> C["Implementation"]
    C --> D["Security Validation"]
    D --> N{Framework upgrade?}
    N -->|Yes| NF["New Feature Adoption"]
    NF --> E["Build & Test"]
    N -->|No| E
    E --> F["Validation"]
    F --> G["Personal Validation"]
    G --> H{User approves?}
    H -->|Yes| I["Create Pull Request or Skip"]
    H -->|No| J["Return to the relevant earlier stage"]
    J --> A
    I --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> K["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Dependency Analysis | the `implement` service | `microsoft-learn` |
| Update Planning | the `implement` service; the `architecture` role for a framework upgrade | `microsoft-learn` |
| Implementation | the `implement` service | `microsoft-learn` |
| Security Validation | the `implement` service | — |
| New Feature Adoption *(framework upgrade)* | the `implement` service, the `architecture` role | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(smoke checks for a framework upgrade; otherwise only when new user-facing behavior is introduced)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-spec

```mermaid
flowchart TD
    A["Context Loading"] --> B["Drafting"]
    B --> C["Check & Review"]
    C --> D["Personal Validation"]
    D --> E{User approves?}
    E -->|Yes| F["Create Pull Request or Skip"]
    E -->|No| G["Return to the relevant earlier stage"]
    G --> A
    F --> U["Work Item Update or Skip"]
    U --> H["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Context Loading | — | servers bound to `spec` |
| Drafting | the role the folder maps to — `architecture` for `arc42/` and `tech/`, `domain`, `ux` for `design/`, `docs` for `ai/` | servers bound to `spec` *(design source for `design/`)* |
| Check & Review | the same role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-code

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Specification & Architecture Intake"]
    A --> K{Kind?}
    K -->|create| P["Implementation Planning"]
    K -->|refactor| R["Refactor Planning"]
    K -->|defect| Q["Reproduction & Root Cause"]
    K -->|feature, config| B
    P --> B["Implementation"]
    R --> B
    Q --> B
    B --> T{Change kind?}
    T -->|code-modifying| C["Build & Test"]
    C --> D["Validation"]
    D --> E["Personal Validation"]
    T -->|documentation/config| E
    E --> F{User approves?}
    F -->|Yes| G["Create Pull Request or Skip"]
    F -->|No| H["Return to the relevant earlier stage"]
    H --> A
    G --> DU["Verification or Skip (code-modifying only)"]
    DU --> U["Work Item Update or Skip"]
    U --> I["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Specification & Architecture Intake | the `architecture` role; the `domain` role when a create crosses a context boundary | servers bound to `spec` |
| Implementation Planning *(create)* | the `architecture` role | — |
| Refactor Planning *(refactor)* | the `architecture` role, the `implement` service | — |
| Reproduction & Root Cause *(defect)* | the `implement` service, the `app.start` service | `aspire` |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture for new functionality only)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |
