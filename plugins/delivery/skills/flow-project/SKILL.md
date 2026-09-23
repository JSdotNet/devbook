---
name: flow-project
description: 'Create, govern, and scaffold a repository — from an empty GitHub repository, or none, to a development project that builds and runs: the repository itself, its README and instructions, branch protection, templates and governance, the stack config through the setup skill, CI workflows, tooling, the Aspire AppHost, the project structure, and local validation. Use for a new project, and for scaffolding a project into a repository that already exists; stages the repository already has are a short check, not a reason to skip the flow.'
---

# Flow: Project

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

One flow from nothing to a project that builds. A repository that already exists enters at
the stage it has reached: every stage opens by checking what is there, and a stage whose
outcome is present is recorded as such and skipped.

The target structure and architecture direction need not be written down first: Stage 6 is a
short intake when approved notes exist, and derives them from the project type and the
repository when they do not. Missing notes are a reason to run Stage 6, never a reason to
stop or to scaffold outside this flow.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## GitHub Lane

Stage 1 is manual. Every other `gh` command in this flow is one spelling of the `pr-lane` slot.
Resolve the slot first and use whatever GitHub CLI or API the session offers for the same
operation. Unbound, write the settings this flow would apply as file artifacts, report them as
manual follow-up, and continue the remaining stages. Never fail on a missing binary. The slot
and its unbound default are in `resources/surface-contract.md`.

## Input Expectations

Required: the repository — name, description, and visibility when it does not exist yet — and
the project type.

Derived when absent: the primary language and framework, the branch protection rules, the
collaborators or teams, the structure or architecture notes, and the Aspire services to
include.

## Stage 1: Repository Creation *(manual)*

Run this one yourself; the rest are agent-assisted. Skip it when the repository exists.

```bash
gh repo create <org>/<name> --description "<description>" --private --clone
```

- Set the default branch and initialize with a `README.md`.
- Add the topics, the `.gitignore` for the target stack, and a license where one applies.

## Stage 2: Stack Setup

- Run `devbook-config:init`. It decides which plugins the repository will use, writes the
  engine keys of `.devbook/config.json`, declares the default MCP servers in the
  repository's own MCP files, and hands each component its `init` — `devbook:init` for
  the devbook folders, and whichever component seeds the repository's procedure skills for
  `start`. A repository that already has the config runs `devbook-config:update` instead.
- Fill the `start` skill's facts — the command, the entry points, the readiness signals, the
  credential pointer — so later flows know how to start and validate this project. A
  repository with nothing to run binds `extensions.app.start` to `null` instead.

**Agents:** the `implement` service

## Stage 3: README and Repository Instructions

- Expand `README.md` with the project description, architecture overview, setup steps, and
  contribution guide.
- Write the repository's own guidance outside the section `devbook:init` writes in the
  file bound to the `repo-instructions` slot: tech stack, conventions, key patterns, agent
  guidance — from the MCP servers bound to `spec`, or derived from the project type when
  none is bound.
- Generate the project guidelines — coding standards, git workflow, review guidelines,
  release procedure — and write them under `.github/instructions/`, using an
  asset-authoring skill when one is installed.

**Agents:** the `docs` role for the README; the `implement` service for the rest

## Stage 4: Repository Governance

- Protect the default branch: reviews before merge, status checks passing, branches up to
  date, pushes restricted. Configure the merge strategies and auto-delete of head branches.
- Create the issue templates and the PR template with its checklist, from the MCP servers
  bound to `spec` or the host's defaults. Add `CODEOWNERS` and configure the labels.
- Optionally: Dependabot, secret scanning and CodeQL, rulesets beyond branch protection,
  collaborators or teams at the right permission level, and a `SECURITY.md`.

**Tools:** the `pr-lane` slot — see **GitHub Lane** above.

## Stage 5: GitHub Actions Workflows

- Add the CI workflow that builds and tests on pull requests and pushes.
- Add the release workflow and the dependency review workflow where they apply.
- Give every workflow least-privilege token scopes.
- Set up the environments, with required reviewers where they are needed.

**Agents:** the `implement` service

## Stage 6: Specification & Architecture Intake

- Determine the target architecture: read the approved notes where they exist, otherwise
  derive the structure, service split, and technology choices from the project type and the
  repository's conventions.
- Load the implementation context and repository constraints from the repository's own
  instruction files and the MCP servers bound to `spec`.
- Determine the API contracts and data model boundaries — the agreed ones as they stand, the
  rest derived at signature level — and plan the integration points across services.
- Record the architecture direction, and the risks and assumptions behind it, before Stage 7
  installs anything.

Escalate instead when the project needs a documented target architecture or a recorded
decision in its own right: recommend `flow-spec` and ask the user.

**Agents:** the `architecture` role

## Stage 7: Tooling & Dependencies

- Install the base frameworks and SDKs.
- Configure the build and test pipelines, the linting and code quality tools, and the logging
  and observability setup.

**Agents:** the `implement` service

## Stage 8: Implementation

AppHost creation and initial scaffolding run together: the example service references the
AppHost configuration, service discovery, and health checks.

- Create the AppHost project, add the integrations the project type calls for, wire up service
  discovery and health checks, and configure the dashboard and local environment.
- Create the directory layout — `src/`, `services/`, `tests/`, `docs/`.
- Create an example service that demonstrates the patterns, wired to the AppHost with health
  checks, and generate the boilerplate around it.
- Set up the testing framework with the first unit tests and their fixtures.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
Validation → Personal Validation → Create Pull Request → Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow.

A new runnable scaffold, so Validation runs with capture: start the AppHost, confirm the
dashboard and the service health endpoints are green — default `localhost:18888`, or the
entry points Stage 2 declared in the `start` skill — confirm database connectivity,
and run Playwright smoke checks on the example service under the runtime monitor.

Two expectations are specific to this scaffold: Build & Test compiles the AppHost, service,
and test projects with every NuGet dependency resolved, and runs the unit suite as the
project's baseline; Validation starts the AppHost with `aspire run`. On failure, record
which phase failed with the actual errors, fix, and re-run.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-project"` and stages: Repository Creation, Stack Setup,
  README and Repository Instructions, Repository Governance, GitHub Actions Workflows,
  Specification & Architecture Intake, Tooling & Dependencies, Implementation, Build & Test,
  Validation, Personal Validation, Create Pull Request, Verification, Work Item Update,
  Summary.
- During README and Repository Instructions, open/update `render_markdown` with the
  expanded README; during Specification & Architecture Intake, with the reviewed or derived
  architecture, plus `render_diagram` for any Mermaid that goes with it.
