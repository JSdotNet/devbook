---
name: flow-update-packages
description: 'Run dependency and package update workflows. Coordinates safe updates of NuGet packages, npm modules, SDKs, and tools across projects with security scanning, compatibility testing, and local runtime monitoring.'
---

# Flow: Update Packages

This flow derives its own scope: Stages 1 and 2 scan the dependency graph, classify what is
available, and produce the prioritized update run — so a request as small as "update the
packages" is in scope. An approved maintenance directive aligns those stages instead of
replacing them.

Escalate only when the request is really a maintenance *policy* decision — standing rules on
major-version adoption, supported framework baselines. Recommend `flow-arc42` to record it,
and ask the user.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`.

## Input Expectations

Required: the project name and location.

Derived in Stages 1–2 when absent: the update scope, the testing strategy, the risk tolerance
and rollback boundaries, and the runtime validation target.

## Stage 1: Dependency Analysis

- Scan every dependency for available updates.
- Check for security vulnerabilities — CVEs and advisories.
- Identify the breaking changes in major versions, from the changelogs and release notes.

**Agents:** the `implement` service

## Stage 2: Update Planning

- Categorize the updates — security, patch, minor, major — and put security first.
- Plan the rollback for the risky ones.
- Record the resulting run: the categorized scope, the testing strategy, and anything
  deliberately deferred.
- Raise major-version upgrades with the user before taking them.

**Agents:** the `implement` service

## Stage 3: Implementation

- Update through each ecosystem's own manager: the `nuget-manager` skill for NuGet, the
  package manager for npm, the `dotnet` CLI for the SDK.
- Verify the lockfiles and the resolved dependency tree.

**Agents:** the `implement` service

## Stage 4: Security Validation

- Run the SAST scan.
- Check the updated packages against current advisories, and the tree for transitive
  vulnerabilities.
- Document any exception to security policy.

**Agents:** the `implement` service

## Final Phases (Shared)

Code-modifying tier of `resources/flow-phases.md`, in order: Build & Test →
QA Validation → Personal Validation → Create Pull Request → Verification → Work Item
Update → Summary. That file defines them; change them there, for every flow. Build & Test
covers the compatibility and pipeline checks for the updated dependencies.

A dependency update with no functional change, so QA Validation is startup-only: start the
app, confirm a healthy dashboard and health endpoints, confirm no new errors in the logs.
Escalate to full Playwright validation, with capture, only when an update brings new
user-facing behavior.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-update-packages"` and stages: Dependency Analysis, Update
  Planning, Implementation, Security Validation, Build & Test, QA Validation, Personal
  Validation, Create Pull Request, Verification, Work Item Update, Summary.
- During Update Planning, open/update `render_markdown` with the update and rollback plan.
