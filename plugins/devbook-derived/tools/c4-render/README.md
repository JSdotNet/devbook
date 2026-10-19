# c4-render

Draws every view of a repository's C4 workspace as one SVG, for the committed copy at
`.devbook/arc42/_meta/c4/<view key>.svg` that sits beside each `c4:<view key>` embed. Owned by
`devbook-derived`; `devbook-derived:init` materializes `render.mjs` and this file into
`.devbook/_tools/c4-render/` where `arc42/` is adopted. The tests and fixtures stay in the
plugin.

## Usage

From the repository root:

```bash
node .devbook/_tools/c4-render/render.mjs .devbook/arc42/workspace.dsl .devbook/arc42/_meta/c4
node .devbook/_tools/c4-render/render.mjs --check .devbook/arc42/workspace.dsl .devbook/arc42/_meta/c4
```

The first brings the folder level with the workspace: it writes each view whose SVG is missing
or differs, leaves a current file untouched, and deletes every `.svg` no view names. The second
writes nothing and lists each render that is `missing`, `stale`, or an `orphan`.

| Exit | Meaning |
| --- | --- |
| `0` | The folder is current, or now is |
| `1` | The workspace has a problem — every view that reads is still written — or, under `--check`, a render is missing, stale, or an orphan |
| `2` | A usage error, or devbook's reader is not installed |

A workspace that does not exist has no views, so every render left in the folder is an orphan,
and with no render either the folder is never created. The refresh paths call this — the
`Update-DevbookIndex.ps1` script, the nightly and drift workflows, and `devbook-derived:refresh`
when a person asks for a branch to be current — never a session beside a chapter edit.

A workspace with a problem still writes every view that reads, and deletes nothing: a view
the problem hid would otherwise lose its render. `--check` still lists the orphans.

## Output

One `<view key>.svg` per `systemLandscape`, `systemContext`, `container`, `component`,
`dynamic`, and `deployment` view with a key, in the folder and nothing else. Deterministic:
the same workspace gives the same bytes, so a refresh moves a file only when its view changed.
A view with no key, or of a kind outside the six, is skipped and named on standard output.

It parses nothing itself. It loads devbook's `c4.mjs` from `.devbook/_tools/devbook-meta/`, or
from `plugins/devbook/tools/devbook-meta/` in the marketplace that authors both.
