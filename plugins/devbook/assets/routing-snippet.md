# Repository routing snippet

The `devbook` plugin ships the *structure and authoring rules* for the
devbook folders. It deliberately does **not** ship repository routing policy —
which flow skill, specialist agent, or MCP server a repository prefers
is repository-specific, and belongs in that repository's own instruction files.

Copy the relevant parts below into the target repository, then edit them to name
the flows, agents, and MCP servers that repository actually has installed. Delete any devbook folder the repository did not adopt.

The plugin ships no flow of its own, and names none. A folder's write goes to the flow that
covers that folder, resolved the way `code-sync-protocol.md` resolves it: a repo-native
`flow-*` skill first, then the flow engine's own flow for the devbook folders — `flow-spec` —
when an engine is installed, and directly under the folder's instruction files when no engine
is installed at all. Substitute the skill names the target repository
actually has as you copy the routes below.

The task-scoped rule and the `_meta/` rule are in the section of `AGENTS.md` that
`devbook:install` writes (`agents-section.md`), so do not restate them here. What follows
is routing only, and none of it goes inside that section's markers.

## For a repository routing instructions file

```markdown
## Context loading by flow and agent

Every edit to a devbook folder routes through the flow that covers that folder: a
repo-native `flow-*` skill first, then the flow engine's `flow-spec`, and directly under
the folder's instruction files when no engine is installed. Say which one answered.

- Architecture, arc42, blueprint, ADR, and TDR workflows may load `.arc42/` as
  working context, but should load only the chapter(s) relevant to the requested
  scope. Every `.arc42/` change routes that way — a chapter, a decision record, and
  a debt record alike.
- Domain modeling workflows may load `.domain/` as working context, but should
  load only the relevant bounded-context chapters.
- Design and UX workflows may load `.design/`, and stack, dependency, or upgrade
  workflows may load `.tech/` — in both cases only the relevant file(s).
- Workflows about how the team works with AI — adopting a tool into the flow,
  changing a practice, reviewing adoption — may load `.ai/`, but should load
  `adoption-map.md` plus only the stage file(s) in scope. Agents do not read `.ai/`
  to decide how to do their own current task: it records a way of working, it does
  not instruct one.
- Non-architecture implementation, bug-fix, package-update, documentation, and UX
  flows should not load `.arc42/` by default. Consult it only when the user
  explicitly asks for architecture context or when implementation depends on a
  specific documented decision, view, constraint, or glossary term.
```

## For an MCP authority section

```markdown
Checked-in devbook folders are **task-scoped local fallbacks**, not default
context. Load `.arc42/`, `.domain/`, `.tech/`, `.design/`, or `.ai/` only
when the selected flow or specialist agent needs that context, and
then prefer only the relevant chapter(s) over whole-folder reads.
```

## For `.claude/settings.json`

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
  `.arc42/_meta/`, `.domain/_meta/`, and the repository-root `_meta/`. An
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

Keep `_meta/` committed either way — the reference graph canvas and the CI drift
check both read it from the repository.

GitHub Copilot content exclusion is not an equivalent lever: it does not apply
to Copilot CLI or to agent mode in Copilot Chat, which is where these
flows run. The prose guardrail stays the enforcement mechanism there.
`search.exclude` and `files.exclude` in `.vscode/settings.json` cut
workspace-search noise for interactive use.

## Documentation-drift checkpoint

Repositories that run a flow engine should check these folders
for staleness after a change lands, and update them in the same pull request
when architecture, technology, design, domain behavior, or planned work moved.
