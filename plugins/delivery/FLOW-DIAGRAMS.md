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

## flow-repo

```mermaid
flowchart TD
    A["Repository Creation (Manual)"] --> B["README"]
    B --> C["MCP Configuration"]
    C --> D["Repository Instructions"]
    D --> E["Branch Protection"]
    E --> F["Issue and PR Templates"]
    F --> G["Repository Governance"]
    G --> H["Personal Validation"]
    H --> I{User approves?}
    I -->|Yes| J["Create Pull Request or Skip"]
    I -->|No| K["Return to the relevant earlier stage"]
    K --> A
    J --> U["Work Item Update or Skip"]
    U --> L["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Repository Creation (Manual) | — | — |
| README | the `docs` role, default agent | — |
| MCP Configuration | Default agent | writes `bindings["delivery.mcp"]` |
| Repository Instructions | Default agent | servers bound to `spec` |
| Branch Protection | Default agent | — |
| Issue and PR Templates | Default agent | servers bound to `spec` |
| Repository Governance | Default agent | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-project

```mermaid
flowchart TD
    A["GitHub Folder Setup (Foundation)"] --> B["GitHub Actions Workflows"]
    B --> C["Specification & Architecture Intake"]
    C --> D["Tooling & Dependencies"]
    D --> E["Implementation"]
    E --> F["Build & Test"]
    F --> G["Validation"]
    G --> H["Personal Validation"]
    H --> I{User approves?}
    I -->|Yes| J["Create Pull Request or Skip"]
    I -->|No| K["Return to the relevant earlier stage"]
    K --> A
    J --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> L["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| GitHub Folder Setup (Foundation) | the `implement` service | servers bound to `implement` |
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

## flow-create-mvp

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["MVP Scope Intake"]
    A --> B["Implementation Planning"]
    B --> C["Implementation"]
    C --> D["Build & Test"]
    D --> E["Validation"]
    E --> F["Personal Validation"]
    F --> G{User approves?}
    G -->|Yes| H["Create Pull Request or Skip"]
    G -->|No| I["Return to the relevant earlier stage"]
    I --> A
    H --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> J["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| MVP Scope Intake | the `architecture` role | servers bound to `spec` |
| Implementation Planning | the `architecture` role | — |
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
    D --> E["Build & Test"]
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
| Update Planning | the `implement` service | — |
| Implementation | the `implement` service | `microsoft-learn` |
| Security Validation | the `implement` service | — |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(only when new user-facing behavior is introduced)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-aspire-update

```mermaid
flowchart TD
    A["Upgrade Intake & Baseline"] --> B["Plan Refinement"]
    B --> C["Implementation"]
    C --> D["New Feature Adoption"]
    D --> E["Build & Test"]
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
| Upgrade Intake & Baseline | the `implement` service | `microsoft-learn` |
| Plan Refinement | the `architecture` role | `microsoft-learn` |
| Implementation | the `implement` service | `microsoft-learn` |
| New Feature Adoption | the `implement` service, the `architecture` role | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture only for adopted new functionality)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-arc42

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
| Drafting | the `architecture` role | — |
| Check & Review | the `architecture` role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-domain

```mermaid
flowchart TD
    A["Context Loading"] --> B["Domain Modeling"]
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
| Context Loading | — | — |
| Domain Modeling | the `domain` role | — |
| Check & Review | the `domain` role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-tech

```mermaid
flowchart TD
    A["Context Loading"] --> B["Technology Reasoning"]
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
| Context Loading | — | — |
| Technology Reasoning | the `architecture` role | — |
| Check & Review | the `architecture` role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-design

```mermaid
flowchart TD
    A["Context Loading"] --> B["Authoritative Grounding"]
    B --> C["Design Authoring"]
    C --> D["Check & Review"]
    D --> E["Personal Validation"]
    E --> F{User approves?}
    F -->|Yes| G["Create Pull Request or Skip"]
    F -->|No| H["Return to the relevant earlier stage"]
    H --> A
    G --> U["Work Item Update or Skip"]
    U --> I["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Context Loading | — | — |
| Authoritative Grounding | — | servers bound to `spec` |
| Design Authoring | the `ux` role | — |
| Check & Review | the `ux` role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-ai

```mermaid
flowchart TD
    A["Context Loading"] --> B["Placement & Boundary Check"]
    B --> C["Authoring"]
    C --> D["Check & Review"]
    D --> E["Personal Validation"]
    E --> F{User approves?}
    F -->|Yes| G["Create Pull Request or Skip"]
    F -->|No| H["Return to the relevant earlier stage"]
    H --> A
    G --> U["Work Item Update or Skip"]
    U --> I["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Context Loading | — | — |
| Placement & Boundary Check | — | — |
| Authoring | the `docs` role | — |
| Check & Review | the `docs` role | — |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-feature

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Specification & Architecture Intake"]
    A --> B["Implementation"]
    B --> C["Build & Test"]
    C --> D["Validation"]
    D --> E["Personal Validation"]
    E --> F{User approves?}
    F -->|Yes| G["Create Pull Request or Skip"]
    F -->|No| H["Return to the relevant earlier stage"]
    H --> A
    G --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> I["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Specification & Architecture Intake | the `architecture` role | servers bound to `spec` |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture for new functionality only)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-bug

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Bug Intake & Reproduction"]
    A --> B["Root Cause Analysis"]
    B --> C["Implementation"]
    C --> D["Build & Test"]
    D --> E["Validation"]
    E --> F["Personal Validation"]
    F --> G{User approves?}
    G -->|Yes| H["Create Pull Request or Skip"]
    G -->|No| I["Return to the relevant earlier stage"]
    I --> A
    H --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> J["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Bug Intake & Reproduction | the `implement` service, the `qa.run` provider (runtime repro) | — |
| Root Cause Analysis | the `implement` service | — |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture only when needed for failure or on request)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-structure

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Structure & Architecture Intake"]
    A --> B["Refactor Planning"]
    B --> C["Implementation"]
    C --> D["Build & Test"]
    D --> E["Validation"]
    E --> F["Personal Validation"]
    F --> G{User approves?}
    G -->|Yes| H["Create Pull Request or Skip"]
    G -->|No| I["Return to the relevant earlier stage"]
    I --> A
    H --> V["Verification or Skip"]
    V --> U["Work Item Update or Skip"]
    U --> J["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Structure & Architecture Intake | the `architecture` role | servers bound to `spec` |
| Refactor Planning | the `architecture` role, the `implement` service | — |
| Implementation | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(targeted validation when a runnable surface exists)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-create-module

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Specification Intake"]
    A --> B["Implementation Planning"]
    B --> C["Implementation"]
    C --> D["Build & Test"]
    D --> E["Validation"]
    E --> F["Personal Validation"]
    F --> G{User approves?}
    G -->|Yes| H["Create Pull Request or Skip"]
    G -->|No| I["Return to the relevant earlier stage"]
    I --> A
    H --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> J["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Specification Intake | the `architecture` role | servers bound to `spec` |
| Implementation Planning | the `architecture` role | — |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture for new functionality only)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-create-service

```mermaid
flowchart TD
    S["Scope Discovery"] --> A["Specification Intake"]
    A --> B["Implementation Planning"]
    B --> C["Implementation"]
    C --> D["Build & Test"]
    D --> E["Validation"]
    E --> F["Personal Validation"]
    F --> G{User approves?}
    G -->|Yes| H["Create Pull Request or Skip"]
    G -->|No| I["Return to the relevant earlier stage"]
    I --> A
    H --> DU["Verification or Skip"]
    DU --> U["Work Item Update or Skip"]
    U --> J["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Scope Discovery | `flow-runner` agent, optionally the `architecture` role | servers bound to `spec` |
| Specification Intake | the `architecture` role | servers bound to `spec` |
| Implementation Planning | the `architecture` role | — |
| Implementation | the `implement` service | `microsoft-learn` |
| Build & Test | the `implement` service | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` | `playwright` *(capture for new functionality only)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |

## flow-fallback

```mermaid
flowchart TD
    A["Routing Check"] --> Z{Dedicated flow-* skill matches?}
    Z -->|Yes| Y["Stop - invoke that skill instead"]
    Z -->|No| B["Plan"]
    B --> C["Execute"]
    C --> D["Review & Recommend"]
    D --> K{Change kind?}
    K -->|Code-modifying| E["Build & Test"]
    E --> F["Validation"]
    F --> G["Personal Validation"]
    K -->|Documentation/config| G
    G --> H{User approves?}
    H -->|Yes| I["Create Pull Request or Skip"]
    H -->|No| J["Return to the relevant earlier stage"]
    J --> B
    I --> V["Verification or Skip (code-modifying tier only)"]
    V --> U["Work Item Update or Skip"]
    U --> S["Summary"]
```

| Phase | Roles & services | MCP servers |
|-------|--------|-------------|
| Routing Check | `flow-runner` agent | — |
| Plan | The closest specialist agent for the task category | servers bound to `spec` *(when the task touches governed assets)* |
| Execute | The closest specialist agent for the task category | `microsoft-learn` *(targeted lookups only)* |
| Review & Recommend | The closest specialist agent for the task category | — |
| Build & Test | the `implement` service *(code-modifying change kind only)* | `microsoft-learn` *(targeted remediation only)* |
| Validation | the `qa.run` provider, the runtime monitor, `aspire` *(code-modifying change kind only)* | `playwright` *(targeted validation when a runnable surface exists)* |
| Personal Validation | — | — |
| Create Pull Request | *(default)* | — |
| Verification | the `verify` provider, or *(default)* *(code-modifying change kind only)* | servers bound to `verify` |
| Work Item Update | *(default)* | — |
| Summary | `flow-runner` agent | — |
