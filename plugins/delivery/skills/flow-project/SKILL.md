---
name: flow-project
description: 'Run project scaffolding and development environment setup for an existing repository. Use this skill after flow-repo to initialize the .github folder, coding guidelines, Aspire AppHost, project structure, and local validation. Assumes the repository already exists and is configured.'
---

# Flow: Project Scaffolding

Scaffolds the development project inside a repository `flow-repo` has already created and
configured — README, repository instructions, MCP servers, branch protection, templates.

The target structure and architecture direction need not be written down first: Stage 3 is a
short intake when approved notes exist, and derives them from the project type and the
repository when they do not. Missing notes are a reason to run Stage 3, never a reason to
stop or to scaffold outside this flow.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the repository, already created and configured by `flow-repo`, and the project
type.

Derived in Stage 3 when absent: the structure or architecture notes, the language and
framework preferences, and the Aspire services to include.

## Stage 1: GitHub Folder Setup

- Initialize the `.github/` structure.
- Generate the project guidelines — coding standards, git workflow, review guidelines,
  release procedure — from the repository's conventions and the MCP servers bound to
  `implement`, and write the developer guidance under `.github/instructions/`.
- Create the host's repository settings file for the repository-level plugin combination, and
  `.devbook/config.json` for the bindings, extensions, policy, and gates. See **The
  Stack Config** in `resources/surface-contract.md`.
- Run `delivery:install` so the `start` seed lands, then fill its facts — the command, the
  entry points, the readiness signals, the credential pointer — so later flows know how to
  start and validate this project. A repository with nothing to run binds
  `extensions.app.start` to `null` instead.

**Agents:** the `implement` service

## Stage 2: GitHub Actions Workflows

- Add the CI workflow that builds and tests on pull requests and pushes.
- Add the release workflow and the dependency review workflow where they apply.
- Give every workflow least-privilege token scopes.
- Set up the environments, with required reviewers where they are needed.

**Agents:** the `implement` service

## Stage 3: Specification & Architecture Intake

- Determine the target architecture: read the approved notes where they exist, otherwise
  derive the structure, service split, and technology choices from the project type and the
  repository's conventions.
- Load the implementation context and repository constraints from the repository's own
  instruction files and the MCP servers bound to `spec`.
- Determine the API contracts and data model boundaries — the agreed ones as they stand, the
  rest derived at signature level.
- Plan the integration points across services.
- Record the architecture direction, and the risks and assumptions behind it, before Stage 4
  installs anything.

Escalate instead when the project needs a documented target architecture or a recorded
decision in its own right: recommend `flow-arc42` and ask the user.

**Agents:** the `architecture` role

## Stage 4: Tooling & Dependencies

- Install the base frameworks and SDKs.
- Configure the build and test pipelines, the linting and code quality tools, and the logging
  and observability setup.

**Agents:** the `implement` service

## Stage 5: Implementation

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
QA Validation → Personal Validation → Create Pull Request → Documentation Update → Work Item
Update → Summary. That file defines them; change them there, for every flow.

A new runnable scaffold, so QA Validation runs with capture: start the AppHost, confirm the
dashboard and the service health endpoints are green — default `localhost:18888`, or the
entry points Stage 1 declared in the `start` skill — confirm database connectivity,
and run Playwright smoke checks on the example service under the runtime monitor.

Two expectations are specific to this scaffold: Build & Test compiles the AppHost, service,
and test projects with every NuGet dependency resolved, and runs the unit suite as the
project's baseline; QA Validation starts the AppHost with `aspire run`. On failure, record
which phase failed with the actual errors, fix, and re-run.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-project"` and stages: GitHub Folder Setup, GitHub Actions
  Workflows, Specification & Architecture Intake, Tooling & Dependencies, Implementation,
  Build & Test, QA Validation, Personal Validation, Create Pull Request, Documentation
  Update, Work Item Update, Summary.
- During Specification & Architecture Intake, open/update `render_markdown` with the reviewed
  or derived architecture, plus `render_diagram` for any Mermaid that goes with it.
