---
name: scenario-write
description: 'Write or revise a journey — one end-to-end walk, a ## of the scenarios.md in the context of the requirements it proves, with setup fields, Given/When/Then steps, and shot: labels — and point each requirement it proves at its part with a Proved by: line. Use when: writing a journey down, a feature or requirement needs one, revising steps, parts, or screenshot points. DO NOT USE FOR: its spec (scenario-derive) or running it (scenario-run).'
---

# devbook scenario-write

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Writes the journey and the pointers to it, never a spec, a run, or a screenshot. The journey is
the source every derived spec and every run is judged against: a step, a part title, a label,
or a setup field changed here turns the last run stale until the spec is re-derived and run.

## Steps

1. **Place it** in the context of the requirements it proves, as a `##` of
   `.devbook/domain/<context>/scenarios.md`, or of the `scenarios.<name>.md` that holds its
   subject; create `# Scenarios` with `type: scenarios` when the context has none. A journey
   across contexts goes to the one holding most of them. Its heading names what the actor does
   and is unique in the file, per `../../rules/devbook-naming.md`. A retitle or a move changes
   its address: move every `Proved by:`, `related`, and `scenario:` reference and its run folder
   in the same change, and leave the spec to `scenario-derive`.
2. **Write the block** under the `##`: `type: scenario`, `related` to every feature it walks
   through, and only the setup fields the journey needs, per "Journeys" in
   `../../rules/devbook-chapter-metadata.md`. A flag or a setting goes on the journey only when
   it depends on it; one that describes the environment stays in the profile. Never a URL, a
   secret, or `tests`. Point each of those features back at it through `related`.
3. **Write the lead**: one paragraph, who does what and why it matters.
4. **Write the parts**, per "A journey" in `../../rules/devbook-writing.md`: one `###` per
   outcome the actor reaches, titled as that outcome, with no `meta` block and an anchor unique
   in the file. Under it, list items opening with a bold **Given**, **When**, **Then**, or
   **And** — one action or one observable outcome each, in English, nothing a user could not do
   or see.
5. **Mark the screenshot points**: `![caption](shot:<label>)` after a blank line, between step
   lists and never inside one; the label is `[a-z0-9-]+` and unique in the file. Other pages
   show it as `scenario:<context>/<scenarios file>#<label>`, so a revision keeps it or fixes
   every reference.
6. **Point the requirements at it.** Each `#### Scenario:` the part proves holds the one line
   `Proved by: <scenarios file>#<part>`, written from the requirement's folder, and loses its
   inline Given/When/Then: behaviour is written once, in the journey, per
   `../../rules/devbook-domain.md`. One case, one part. Never write the requirement's `e2e`
   `tests` entry; it is derived.
7. **Check**: `node .devbook/_tools/devbook-meta/build.mjs --check`, fixing what it reports per
   `../validate/repairs.md`. Where `.devbook/_tools/scenarios/` exists, run its `check.mjs`, with
   the flags its README lists for a non-default scenario folder or spec folder: a new journey
   reports `journey-without-spec`, an edited one `signature-mismatch`, a retitled one
   `spec-without-journey`. Each is closed by `scenario-derive`, so name it in the reply. A
   changed journey whose parts a demo's walkthrough links: run its `demo-sync.mjs`, which
   re-copies their text and signature.

## Do not

- Write the spec, the setup hook, `profiles.json`, a `run.json`, or a screenshot.
- Rewrite a step to match what the spec or the application does: the journey is the source.
