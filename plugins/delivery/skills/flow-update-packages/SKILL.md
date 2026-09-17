---
name: flow-update-packages
description: 'Run dependency and package update workflows — routine NuGet, npm, SDK, and tool updates, and framework upgrades such as a .NET Aspire version move that carry a baseline gate and new-feature adoption. Scans the graph, plans by risk with security first, updates in reversible batches, and validates runtime behavior with recorded results. Use for: update the packages, move us to the latest Aspire, bump the SDK. DO NOT USE FOR: the maintenance policy behind an update (flow-spec, as a decision record) or the tech/ chapter that records the outcome (flow-spec).'
---

# Flow: Update Packages

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This flow derives its own scope: Stages 1 and 2 scan the dependency graph, classify what is
available, and produce the prioritized update run — so a request as small as "update the
packages" or "move us to the latest Aspire" is in scope. An approved maintenance directive or
upgrade scope aligns those stages instead of replacing them.

Stage 1 also settles the **depth**: a *routine update* — patch, minor, security — or a
*framework upgrade* — a major version of a framework the application is built on, Aspire
included. The framework depth adds a baseline gate in Stage 1 and a feature-adoption stage
after Implementation; the routine depth skips both.

Escalate only when the request is really a maintenance *policy* decision — standing rules on
major-version adoption, supported framework baselines — or when adopting a new capability
changes the target architecture. Recommend `flow-spec` to record it, and ask the user.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the project name and location.

Derived in Stages 1–2 when absent: the update scope and depth, current and target versions,
the testing strategy, the risk tolerance and rollback boundaries, the features a framework
upgrade adopts, and the runtime validation target.

## Stage 1: Dependency Analysis

- Scan every dependency for available updates; for a framework upgrade, inventory the stack
  — packages, SDK constraints, host integrations such as the AppHost.
- Check for security vulnerabilities — CVEs and advisories.
- Identify the breaking changes in major versions, from the changelogs and release notes.
- Settle the depth and, for a framework upgrade, the success criteria for the upgrade and
  for feature adoption; record them in the stage output before Stage 3 changes anything.

**Baseline gate (framework upgrade):** capture build, tests, and runtime health before any
package changes. A green baseline is required so post-upgrade failures are attributable. On
a red baseline, record the failing items as pre-existing, then either fix them inside this run
or agree with the user to proceed with those items explicitly excluded from the success
criteria. Never upgrade over an unrecorded red baseline, and never decline the request over one.

**Agents:** the `implement` service

## Stage 2: Update Planning

- Categorize the updates — security, patch, minor, major — and put security first.
- Split the work into batches, low-risk first, each one reversible on its own; plan the
  rollback for the risky ones.
- Record the resulting run: the categorized scope, the testing strategy, migration notes,
  dependency ordering, and anything deliberately deferred.
- Raise major-version upgrades with the user before taking them; for a framework upgrade,
  finalize which new capabilities the run adopts.

**Agents:** the `implement` service; the `architecture` role for a framework upgrade

## Stage 3: Implementation

- Update through each ecosystem's own manager: the `nuget-manager` skill for NuGet, the
  package manager for npm, the `dotnet` CLI for the SDK — in the planned batches.
- For a framework upgrade, upgrade the host integrations and the service references that
  follow them, and resolve the breaking changes in configuration and wiring.
- Verify the lockfiles and the resolved dependency tree.

**Agents:** the `implement` service

## Stage 4: Security Validation

- Run the SAST scan.
- Check the updated packages against current advisories, and the tree for transitive
  vulnerabilities.
- Document any exception to security policy.

**Agents:** the `implement` service

## Stage 5: New Feature Adoption *(framework upgrade only)*

- Enable the features chosen in Stage 2, and configure them in the host and the service
  projects.
- Add or update the telemetry and health setup those features require.
- Record the enabled features and their expected operational impact in the stage output.

**Agents:** the `implement` service, the `architecture` role

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
Validation → Personal Validation → Create Pull Request → Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow. Build & Test
covers the compatibility and pipeline checks for the updated dependencies.

A routine update has no functional change, so Validation is startup-only: start the app,
confirm a healthy dashboard and health endpoints, confirm no new errors in the logs. A
framework upgrade adds Playwright smoke checks on the critical paths the upgrade and the
adopted features touch, under the runtime monitor, with evidence captured only for adopted
new functionality or when a failure needs it.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-update-packages"` and stages: Dependency Analysis, Update
  Planning, Implementation, Security Validation, New Feature Adoption when the depth is a
  framework upgrade, Build & Test, Validation, Personal Validation, Create Pull Request,
  Verification, Work Item Update, Summary.
- During Update Planning, open/update `render_markdown` with the update and rollback plan.
