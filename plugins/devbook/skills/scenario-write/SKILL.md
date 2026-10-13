---
name: scenario-write
description: 'Write or revise a scenario page — one end-to-end journey beside the chapter it demonstrates, with setup fields, Given/When/Then steps, and shot: labels — and point each requirement it proves at its part with a Proved by: line. Use when: writing a journey down, a feature or requirement needs one, revising steps, parts, or screenshot points. DO NOT USE FOR: its spec (scenario-derive) or running it (scenario-run).'
---

# devbook scenario-write

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Writes the page and the pointers to it, never a spec, a run, or a screenshot. The page is the
source every derived spec and every run is judged against: a step, a part title, a label, or a
setup field changed here turns the last run stale until the spec is re-derived and run.

## Steps

1. **Place it** beside the chapter the journey demonstrates — a feature, a requirement — at
   `.devbook/domain/<context>/<stem>.md`. The stem names the journey in kebab-case and is unique
   across every bounded context, per `../../rules/devbook-naming.md`. A revision keeps its stem;
   a rename moves every `Proved by:`, `related`, and `scenario:` reference and the run folder
   `<scenario folder>/<old-stem>/` in the same change, and leaves the spec to `scenario-derive`.
2. **Write the block** under `#`: `type: scenario`, `related` to that chapter, and only the setup
   fields the journey needs, per "Scenario pages" in `../../rules/devbook-chapter-metadata.md`.
   A flag or a setting goes on the page only when this journey depends on it; one that describes
   the environment stays in the profile. Never a URL, a secret, or `tests`.
3. **Write the lead**: one paragraph, who does what and why it matters.
4. **Write the parts**, per "A scenario page" in `../../rules/devbook-writing.md`: one `##` per
   outcome the actor reaches, titled as that outcome, with no `meta` block. Under it, list items
   opening with a bold **Given**, **When**, **Then**, or **And** — one action or one observable
   outcome each, in English, nothing a user could not do or see.
5. **Mark the screenshot points**: `![caption](shot:<label>)` after a blank line, between step
   lists and never inside one; the label is `[a-z0-9-]+` and unique in the page. Other pages
   show it as `scenario:<stem>#<label>`, so a revision keeps it or fixes every reference.
6. **Point the requirements at it.** Each `#### Scenario:` the part proves holds the one line
   `Proved by: <page>.md#<part-heading-slug>` and loses its inline Given/When/Then: behaviour is
   written once, in the page, per `../../rules/devbook-domain.md`. One case, one part. Never
   write the requirement's `e2e` `tests` entry; it is derived.
7. **Check**: `node .devbook/_tools/devbook-meta/build.mjs --check`, fixing what it reports per
   `../validate/SKILL.md`. Where `.devbook/_tools/scenarios/` exists, run its `check.mjs`, with
   the flags its README lists for a non-default scenario folder or spec folder: a new page reports
   `page-without-spec`, an edited one `signature-mismatch`, a renamed one `spec-without-page`.
   Each is closed by `scenario-derive`, so name it in the reply. A changed page whose parts a
   demo's walkthrough links: run its `demo-sync.mjs`, which re-copies their text and signature.

## Do not

- Write the spec, the setup hook, `profiles.json`, a `run.json`, or a screenshot.
- Rewrite a step to match what the spec or the application does: the page is the source.
