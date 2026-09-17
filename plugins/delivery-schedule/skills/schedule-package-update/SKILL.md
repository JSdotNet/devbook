---
name: schedule-package-update
description: 'Update all outdated NuGet packages in a .NET solution, check installed plugins for newer versions, and open a PR with the changes. Handles Central Package Management, Aspire integration upgrades, and post-update build and test verification.'
disable-model-invocation: true
---

# Scheduled: Package Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Scan a .NET solution for outdated NuGet packages, apply safe updates,
verify the build and tests still pass, then open a pull request with the changes.

## Inputs

- Update strategy: `minor-and-patch` (default, safe) or `major` (includes breaking changes; requires confirmation).
- Target branch for the PR (default: repository default branch).
- Dry-run mode: `true` previews what would change without writing files (default: `false`).

## Skill Dependencies

This skill sequences the following installed skills:

- **`nuget-manager`** — lists outdated NuGet packages and applies version bumps safely via the `dotnet` CLI. Handles both individual `.csproj` files and `Directory.Packages.props` (Central Package Management).
- **`aspire`** — when the solution contains an `.AppHost` project, checks whether `Aspire.Hosting.*` and `Aspire.*` client integration packages have new versions and whether any configuration or API changes are required after an upgrade.

## Workflow

### Phase 1 — Audit

1. Use the `nuget-manager` skill to list all outdated NuGet packages:

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

3. Detect whether an `.AppHost` project exists. If so, use the `aspire` skill to cross-check
   all `Aspire.Hosting.*` and `Aspire.*` packages against the latest releases and flag
   any hosting or client integration packages that are behind.

4. Present an audit table:

   | Package | Project / Scope | Current | Latest | Type | Action |
   |---------|----------------|---------|--------|------|--------|
   | `Newtonsoft.Json` | `src/Api/Api.csproj` | `13.0.1` | `13.0.3` | patch | Update |
   | `Microsoft.Extensions.Logging` | `Directory.Packages.props` | `8.0.0` | `9.0.0` | major | Confirm |
   | `Aspire.Hosting.Redis` | `AppHost/AppHost.csproj` | `9.0.0` | `9.1.0` | minor | Update |
   | `delivery` | plugin | `0.1.0` | `0.2.0` | plugin | Report only |

5. If `update-strategy` is `major`, highlight all major bumps and ask for explicit confirmation
   before including them. Stop here if dry-run is `true`.

### Phase 2 — Apply Updates

6. Create a new branch named `chore/nuget-updates-<YYYY-MM-DD>`.

7. **NuGet updates**: follow the `nuget-manager` skill procedure for each package:
   - For solutions using `Directory.Packages.props`: update `<PackageVersion>` entries there.
   - For per-project packages: edit `<PackageReference Version="..." />` in the `.csproj`.
   - Run `dotnet restore` after each batch to catch dependency conflicts early.

8. **Aspire updates**: if Aspire packages were flagged, use the `aspire` skill to apply any
   configuration or API changes required by the new version (for example, renamed integration
   packages or updated `AddResource` signatures).

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

### Phase 4 — Personal Validation

11. Present the audit table (Phase 1) and the build/test results (Phase 3) to the
    user and **wait for explicit approval before opening a pull request**. If
    approval is withheld, stop here and record the outcome — never open the PR
    before personal validation.

### Phase 5 — Pull Request

12. Commit all changes with message:

    ```
    chore: update NuGet packages <YYYY-MM-DD>

    - NuGet: <n> packages updated
    - Aspire integrations: <n> packages updated
    - Plugins: <n> behind (reported, not updated)
    ```

13. After approval, push the branch and open a PR:
    - **Title:** `chore: NuGet package updates <YYYY-MM-DD>`
    - **Body:** the audit table from Phase 1 with each row marked Updated or Skipped.
    - **Labels:** `dependencies`, `automated`.

### Phase 6 — Summary

14. Once the pull request is created (or the run concludes without one), output a
    final summary table:

    | Package | Current | New | Result |
    |---------|---------|-----|--------|
    | `Newtonsoft.Json` | `13.0.1` | `13.0.3` | ✅ Updated |
    | `xunit` | `2.6.0` | `2.7.0` | ⚠️ Skipped (test failure) |
    | `Aspire.Hosting.Redis` | `9.0.0` | `9.1.0` | ✅ Updated |
    | `delivery` | — | — | ✅ Reinstalled |

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-package-update"` and these stages: Audit, Apply
  Updates, Verify, Personal Validation, Pull Request, Summary.

## Output

- Branch with all safe NuGet and Aspire package updates applied and tests passing.
- Pull request with a full audit table in the body.
- Summary table of results per package.

## Notes

- Major version bumps are opt-in; always confirm with the user before applying them.
- Packages that break tests are skipped and flagged, not force-updated.
- Run this skill weekly to keep dependency debt low.
- The Aspire phase is skipped automatically when no `.AppHost` project is present.
