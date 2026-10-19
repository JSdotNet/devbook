#Requires -Version 7.0
<#
.SYNOPSIS
    Refresh the derived devbook indexes under .devbook/ (`.devbook/_meta/`, and one `_meta/` per adopted folder).

.DESCRIPTION
    On-demand wrapper around devbook's `.devbook/_tools/devbook-meta/build.mjs`,
    passing --write; installed by the `devbook-derived:init` skill.

    Refreshing the indexes is deliberate, not automatic. The pull-request check
    only warns when they have drifted, because making every devbook pull
    request carry a regenerated index is what turns those generated files into
    merge conflicts. Run this when you want your own branch current; otherwise
    the nightly job (`.github/workflows/devbook-meta-nightly.yml`) reconciles
    the default branch on its own.

    Where devbook-derived materialized its C4 view renderer at
    `.devbook/_tools/c4-render/render.mjs`, it then renders every view of
    `.devbook/arc42/workspace.dsl` to `.devbook/arc42/_meta/c4/<view key>.svg`
    and deletes the render of a view that no longer exists.

    Unlike the raw `node` invocation, this reports which index and render files
    actually moved, so a refresh that changed nothing is visibly a no-op.

.PARAMETER Scope
    Refresh one devbook folder only (for example `tech` or `ai`). Omit to refresh
    every adopted scope plus the repository-wide rollup. The views render only
    when the scope is omitted or `arc42`.

.PARAMETER Check
    Validate the authored Markdown without writing anything. Exits
    non-zero when a reference does not resolve or a `meta` block is
    inconsistent. This is what CI runs as its blocking step. Also reports a
    view render that is missing, stale, or names no view, as a warning that
    never changes the exit code: a stale render is the scheduled refresh's to fix.

.PARAMETER Root
    Repository root. Defaults to the enclosing git working tree, so the script
    works from any directory inside the repository.

.EXAMPLE
    ./build/Update-DevbookIndex.ps1
    Refresh every adopted scope and list the index files that changed.

.EXAMPLE
    ./build/Update-DevbookIndex.ps1 -Scope domain
    Refresh only the `domain` indexes.

.EXAMPLE
    ./build/Update-DevbookIndex.ps1 -Check
    Validate the authored metadata without touching any file.
#>
[CmdletBinding()]
param(
    [string] $Scope,
    [switch] $Check,
    [string] $Root
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepositoryRoot {
    param([string] $Requested)

    if ($Requested) {
        if (-not (Test-Path -LiteralPath $Requested -PathType Container)) {
            throw "Root '$Requested' is not a directory."
        }
        return (Resolve-Path -LiteralPath $Requested).Path
    }

    # Prefer the git working tree over the script's own location, so the script
    # keeps working when it is copied somewhere other than `build/`.
    $top = & git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $top) { return (Resolve-Path -LiteralPath $top).Path }

    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

# Hash every committed index and view render so we can report what the
# generators actually changed. Hashing is cheap here: these files number in the
# dozens, not the thousands, and the alternative is asking git, which fails in a
# non-git copy.
function Get-IndexFingerprints {
    param([string] $RepoRoot)

    $fingerprints = @{}
    $metaDirectories = Get-ChildItem -LiteralPath $RepoRoot -Directory -Recurse -Force -Filter '_meta' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git)[\\/]' }

    foreach ($directory in $metaDirectories) {
        $files = @(Get-ChildItem -LiteralPath $directory.FullName -File -Filter '*.json')
        $renders = Join-Path $directory.FullName 'c4'
        if (Test-Path -LiteralPath $renders -PathType Container) {
            $files += @(Get-ChildItem -LiteralPath $renders -File -Filter '*.svg')
        }
        foreach ($file in $files) {
            $relative = [IO.Path]::GetRelativePath($RepoRoot, $file.FullName).Replace('\', '/')
            $fingerprints[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        }
    }
    return $fingerprints
}

$repoRoot = Resolve-RepositoryRoot -Requested $Root
$generator = Join-Path $repoRoot '.devbook/_tools/devbook-meta/build.mjs'

if (-not (Test-Path -LiteralPath $generator -PathType Leaf)) {
    throw "Generator not found at '$generator'. Install it with the devbook:init skill."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required to run the devbook-meta generator, and `node` is not on PATH.'
}

$arguments = @($generator)
$arguments += $(if ($Check) { '--check' } else { '--write' })
if ($Scope) { $arguments += @('--scope', $Scope) }

# The view renderer is devbook-derived's, materialized only where arc42/ is
# adopted. Its paths are relative to the repository root, where it runs.
$renderer = Join-Path $repoRoot '.devbook/_tools/c4-render/render.mjs'
$renderViews = (Test-Path -LiteralPath $renderer -PathType Leaf) -and (-not $Scope -or $Scope -eq 'arc42')
$renderArguments = @('.devbook/_tools/c4-render/render.mjs')
if ($Check) { $renderArguments += '--check' }
$renderArguments += @('.devbook/arc42/workspace.dsl', '.devbook/arc42/_meta/c4')

$before = if ($Check) { @{} } else { Get-IndexFingerprints -RepoRoot $repoRoot }

$renderExit = 0
Push-Location -LiteralPath $repoRoot
try {
    & node @arguments
    $generatorExit = $LASTEXITCODE
    if ($renderViews) {
        & node @renderArguments
        $renderExit = $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

if ($Check) {
    if ($renderExit -ne 0) {
        Write-Host ''
        Write-Host 'View renders under .devbook/arc42/_meta/c4/ are not current. This does not fail the check — the scheduled refresh reconciles them, or run this script without -Check.' -ForegroundColor Yellow
    }
    if ($generatorExit -ne 0) {
        Write-Host ''
        Write-Host 'Devbook metadata has errors. Fix the Markdown above; regenerating will not clear them.' -ForegroundColor Red
    }
    exit $generatorExit
}

$after = Get-IndexFingerprints -RepoRoot $repoRoot

$added = $after.Keys | Where-Object { -not $before.ContainsKey($_) } | Sort-Object
$changed = $after.Keys | Where-Object { $before.ContainsKey($_) -and $before[$_] -ne $after[$_] } | Sort-Object
$removed = $before.Keys | Where-Object { -not $after.ContainsKey($_) } | Sort-Object

Write-Host ''
if (-not $added -and -not $changed -and -not $removed) {
    Write-Host 'Indexes already current — nothing changed.' -ForegroundColor Green
}
else {
    Write-Host 'Indexes refreshed:' -ForegroundColor Yellow
    foreach ($path in $added) { Write-Host "  added    $path" }
    foreach ($path in $changed) { Write-Host "  updated  $path" }
    foreach ($path in $removed) { Write-Host "  removed  $path" }
    Write-Host ''
    Write-Host 'Commit these alongside your Markdown, or leave them to the nightly refresh.'
}

# A non-zero exit here means a generator found errors in the authored
# Markdown or the workspace. Each still wrote every artifact, so the refresh
# above is complete; the exit code is about the sources, not about the write.
if ($generatorExit -ne 0) { exit $generatorExit }
exit $renderExit
