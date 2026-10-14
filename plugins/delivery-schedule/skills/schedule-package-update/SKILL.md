---
name: schedule-package-update
description: 'Update the outdated NuGet packages of a .NET solution — Central Package Management and Aspire integrations included — minor and patch by default, verify the build and tests, and open one pull request listing every package moved or skipped. The package-update schedule''s target.'
---

# Scheduled: Package Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. This is the
unattended form of `flow-code`'s `dependency` kind: a move a person drives — a major bump, a
framework upgrade, one package on request — runs through `flow-code` instead.

## Inputs

- Strategy: `minor-and-patch` (default) or `major`.
- Dry run: `true` reports the audit and writes nothing (default `false`).

## Workflow

### Phase 1 — Audit

1. `dotnet list package --outdated`: each package with its current and latest version, and
   whether `Directory.Packages.props` manages it centrally or a `.csproj` does. No .NET
   solution: say so and stop.
2. **Gate**, strategy `major` only: the major bumps. Unattended, or withheld, they are left
   out and each becomes a *Needs you* row for a `flow-code` run of the `dependency` kind.
   Dry run: go to Phase 5.

### Phase 2 — Apply

3. Move each version where it is managed — `<PackageVersion>` in `Directory.Packages.props`,
   `<PackageReference Version>` in a `.csproj` — and run `dotnet restore` after each batch.
   `Aspire.*` packages move like any other.

### Phase 3 — Verify

4. `dotnet build` and `dotnet test`. A package whose bump breaks either — an Aspire
   integration renamed or its API changed among them — is reverted and recorded as skipped
   with the reason, never patched around; the rest go on.

### Phase 4 — Pull Request

5. **Gate:** the audit and the build and test results.
6. Commit `chore: update NuGet packages <YYYY-MM-DD>` with the counts updated and skipped,
   and open the pull request titled `chore(deps): weekly package update <YYYY-MM-DD>` unless
   the trigger names another, labelled `dependencies` and `automated`. Its body is the audit
   with each row marked updated or skipped, every skipped package with the version it would
   have moved to.

### Phase 5 — Summary

7. The report in `report.md` beside this file.
