---
name: schedule-package-update
description: 'Update all outdated NuGet packages in a .NET solution, check installed plugins for newer versions, and open a PR with the changes. Handles Central Package Management, Aspire integration upgrades, and post-update build and test verification.'
---

# Scheduled: Package Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Scan a .NET solution for outdated NuGet packages, apply safe updates,
verify the build and tests still pass, then open a pull request with the changes.

This is the unattended form of `flow-code`'s `dependency` kind in `delivery`: a move a person
drives — a major bump, a framework upgrade, one package on request — runs through `flow-code`,
whose gate a scheduled run cannot pass.

## Inputs

- Update strategy: `minor-and-patch` (default, safe) or `major` (includes breaking changes; requires confirmation).
- Target branch for the PR (default: repository default branch).
- Dry-run mode: `true` previews what would change without writing files (default: `false`).

## Tools

The `dotnet` CLI alone: a scheduled session starts with the two delivery plugins and nothing
else, so the procedure is carried here in full. `dotnet list package --outdated` is the
inventory, `Directory.Packages.props` or the `.csproj` is where a version moves, and
`dotnet restore` after each batch catches a conflict early. Aspire packages
(`Aspire.Hosting.*`, `Aspire.*`) are inventoried the same way; an API or configuration change
a new Aspire version needs shows up as a build failure in Phase 3, where the package is
skipped and named, never forced.

## Workflow

### Phase 1 — Audit

1. List all outdated NuGet packages:

   ```bash
   dotnet list package --outdated
   ```

   Capture each package with its current and latest version. If the solution uses
   Central Package Management (`Directory.Packages.props`), note which packages are
   managed centrally versus per-project.

2. Check installed plugins for newer versions: compare the `version` of each installed
   plugin against the `version` its marketplace publishes for it (for this repository's
   plugins, the marketplace manifest at the repo root). Report any that
   are behind — plugin installation itself is interactive, so this step reports, it does not
   apply.

3. Detect whether an `.AppHost` project exists. If so, cross-check all `Aspire.Hosting.*`
   and `Aspire.*` packages against the outdated listing and flag any hosting or client
   integration packages that are behind.

4. Present an audit table:

   | Package | Project / Scope | Current | Latest | Type | Action |
   |---------|----------------|---------|--------|------|--------|
   | `Newtonsoft.Json` | `src/Api/Api.csproj` | `13.0.1` | `13.0.3` | patch | Update |
   | `Microsoft.Extensions.Logging` | `Directory.Packages.props` | `8.0.0` | `9.0.0` | major | Confirm |
   | `Aspire.Hosting.Redis` | `AppHost/AppHost.csproj` | `9.0.0` | `9.1.0` | minor | Update |
   | `delivery` | plugin | `1.8.0` | `1.9.0` | plugin | Report only |

5. If `update-strategy` is `major`, highlight all major bumps. Run by hand, ask for explicit
   confirmation before including them; unattended, leave them out and list them in the
   summary — the preamble's safe answer. Stop here if dry-run is `true`.

### Phase 2 — Apply Updates

6. Create the branch the preamble names, `schedule/package-update/<YYYY-MM-DD>`, or, run by
   hand, one the person names.

7. **NuGet updates**, for each package:
   - For solutions using `Directory.Packages.props`: update `<PackageVersion>` entries there.
   - For per-project packages: edit `<PackageReference Version="..." />` in the `.csproj`.
   - Run `dotnet restore` after each batch to catch dependency conflicts early.

8. **Aspire updates**: if Aspire packages were flagged, bump them the same way. A renamed
   integration package or a changed `AddResource` signature surfaces as a build failure in
   Phase 3 and is handled there: the package is skipped and named, never patched around.

9. **Plugin updates**: list the plugins found to be behind and tell the user to update them
   from the plugin manager; do not attempt to install plugins from this skill.

### Phase 3 — Verify

10. Build and test after all updates:

    ```bash
    dotnet build
    dotnet test
    ```

    If tests fail, revert the failing package update, record it as **Skipped (test failure)**,
    and continue with the remaining packages.

### Phase 4 — Decide

11. Unattended, there is nobody to ask: the preamble decides. Go on to Phase 5 with the
    pull request ready for review when build and tests passed and draft when anything was
    skipped. Run by hand, present the audit table (Phase 1) and the build and test results
    (Phase 3) to the person and wait for their yes before opening it; withheld, stop here
    and record the outcome.

### Phase 5 — Pull Request

12. Commit all changes with message:

    ```
    chore: update NuGet packages <YYYY-MM-DD>

    - NuGet: <n> packages updated
    - Aspire integrations: <n> packages updated
    - Plugins: <n> behind (reported, not updated)
    ```

13. Push the branch and open the pull request, updating one a previous run left open on
    the same branch prefix rather than opening a second:
    - **Title:** what the trigger says; `chore(deps): weekly package update <YYYY-MM-DD>`
      by default.
    - **Body:** the audit table from Phase 1 with each row marked Updated or Skipped, and
      every skipped package with the version it would have moved to.
    - **Labels:** `dependencies`, `automated`.

### Phase 6 — Summary

14. Once the pull request is created (or the run concludes without one), output the report
    in `report.md` beside this file, per `../../resources/report-contract.md`: one *Packages*
    row per package — updated, skipped with the reason, or a plugin behind.

## Notes

- Major version bumps are opt-in: run by hand, confirm with the person first; unattended,
  they are listed and left out, each one a `flow-code` run of the `dependency` kind.
- Packages that break tests are skipped and flagged, not force-updated.
- Run this skill weekly to keep dependency debt low.
- The Aspire phase is skipped automatically when no `.AppHost` project is present.
