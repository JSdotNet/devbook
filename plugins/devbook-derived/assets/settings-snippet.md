# The `.claude/settings.json` deny rule

Offered by `devbook-derived:install`, never applied silently, and never placed inside any
`AGENTS.md` markers. It is a repository setting, so it is the user's to merge.

Generated `_meta/` files are tool output, not agent context. One deny rule keeps
them out of Claude Code's file tools — `Read`, `Grep`, `Glob`, `@file` mentions,
the open-file context a connected IDE shares, and the Bash file commands Claude
Code recognises (`cat`, `head`, `tail`, `sed`):

```json
{
  "permissions": {
    "deny": ["Read(_meta/**)"]
  }
}
```

Notes on that rule:

- Deny rules match a directory name at **any depth**, so the single entry covers
  `.devbook/_meta/`, `.devbook/arc42/_meta/`, and every other adopted folder's `_meta/`. An
  *allow* rule would need `**/_meta/**` to do the same.
- Write it against `Read`. Claude Code accepts a path rule on `Glob` or `Write`
  but never consults it, and warns at startup.
- A `Read` deny also blocks `Edit` and `Write` on the same paths, so it enforces
  the "never hand-edit generated files" rule above mechanically rather than by
  convention.
- Index generation is unaffected: `build.mjs` is a subprocess that opens files
  itself, and deny rules do not reach those.
- Deny rules cannot carry allowlist exceptions, so `Read(_meta/**)` cannot be
  reopened for `index.json`. To keep the reading outline readable while still
  excluding the large graph, narrow the rule to `Read(_meta/graph.json)`.

Keep `_meta/` committed either way — the CI drift check reads it from the
repository, and so does any viewer that cannot run the generator.

GitHub Copilot content exclusion is not an equivalent lever: it does not apply
to Copilot CLI or to agent mode in Copilot Chat, which is where these
flows run. The prose guardrail stays the enforcement mechanism there.
`search.exclude` and `files.exclude` in `.vscode/settings.json` cut
workspace-search noise for interactive use.
