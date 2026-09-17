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

The task-scoped rule is in the section of `AGENTS.md` that
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

## Documentation-drift checkpoint

Repositories that run a flow engine should check these folders
for staleness after a change lands, and update them in the same pull request
when architecture, technology, design, domain behavior, or planned work moved.
