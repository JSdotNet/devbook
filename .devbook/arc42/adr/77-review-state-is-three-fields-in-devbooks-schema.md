# 77. Review State Is Three Fields in devbook's Schema

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/7-approved-is-a-status-rung.md", ".devbook/arc42/adr/22-fan-out-is-its-own-plugin.md", ".devbook/arc42/adr/41-a-session-start-hook-fires-only-where-the-repository-adopted-the-plugin.md", ".devbook/arc42/adr/43-only-a-delivered-rule-lives-in-rules.md", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md", ".devbook/arc42/adr/62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/domain/devbook-collaboration/dependencies.md", ".devbook/domain/plugin-authoring/domain.md#extension-namespace"]
```

The three facts `devbook-collaboration` remembers about a chapter — where its review stands,
who owes the next move, and since when — are `review`, `reviewer`, and `review-at` in
`devbook-chapter-metadata.md`, beside `approved-by` and `approved-at`, and `build.mjs --check`
validates them. They were `ext.devbook-collaboration.review`, `.reviewer`, and `.review-at`:
three keys in the opaque namespace devbook carries through untouched. `devbook-collaboration`
keeps its four skills and ships nothing else: no rule, no install, no hook, no stamp entry.

**The triad was already devbook's in everything but spelling.** The rule that defined it said
so — "the triad deliberately mirrors `approved` / `approved-by` / `approved-at`, so a chapter
reads the same way on its way to a decision as it does past one". [Record 7](7-approved-is-a-status-rung.md)
put the approval triad in devbook's schema although only the review plugin writes it, and the
dependency chapter names that relationship Conformist, for one field. Review state is the same
relationship, three fields wider: devbook owns the vocabulary, one extension writes it, and a
chapter that carries none of it reads exactly as before.

**A field in the schema is a field the check can hold.** Every invariant on the Chapter Review
aggregate — one reviewer while a review runs, `changes-requested` over at least one open note
and `cleared` over none, no review state beside `status: approved` — was marked *untested*,
because `ext.*` is carried unvalidated by design. In the schema each is one clause in
`validateDocument`, run on the same path as everything else the hard gate checks
([record 53](53-the-hard-gate-runs-the-schema-validator.md)).

**One rule, not two.** The only sentence the collaboration rule added for a reader was *skip
these keys when loading a chapter for context*, which is the sentence devbook already states
for an annotation fence. Both now live in `devbook-annotations.md` and `devbook-chapter-metadata.md`,
so `chapter-collaboration.md`, its `rules.json`, the install that materialized its trio, the
`components.collaboration` stamp, and the session-start hook that repeated the rule all go.
[Record 43](43-only-a-delivered-rule-lives-in-rules.md) then leaves the plugin no `rules/`
folder at all, and [record 41](41-a-session-start-hook-fires-only-where-the-repository-adopted-the-plugin.md)
loses one of its five hooks. What remains is the shape [fan-out](22-fan-out-is-its-own-plugin.md)
and the unattended lane already have: an L1 that owns no schema and no state, only procedure.

**Independence was asked for and declined.** Every one of the four skills reads a `meta`
block, writes a finding through `annotations.mjs`, writes devbook's `approved` rung, or reads
`adopted` from devbook's stamp: its whole subject is a devbook chapter. A collaboration plugin
that worked on arbitrary Markdown would need somewhere to put its state, somewhere to put a
finding, and a rung to write — which is devbook's schema, rebuilt inside the extension. The
declared dependency is the cheap kind: the host enforces it, and nothing in devbook names the
extension back. After this record it is the only coupling left.

**What it costs.** The `ext` namespace loses its one consumer and stays reserved — it is free
to carry, and the next extension will want it for exactly the reason this one did. The
extension is now pinned to the contract version that carries the three fields rather than
"needing no devbook release of its own"; the `>=1.0.0 <2.0.0` range already says so. A repository
holding the `ext.` spelling would need a migration, and none does: [record 64](64-1-0-0-is-the-first-release.md)
starts that obligation at the first install, and 1.0.x is installed nowhere. The contract
version stays at 9 and no migration ships; the plugin version moves to 1.1.0 with every other
plugin, on request, and `UPGRADING.md` carries no entry.

Consequence: [record 62](62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md)
stands — the gate is still the extension's, still reads the chapter, and now writes only fields
the schema defines. [Record 60](60-the-annotation-lifecycle-ends-in-devbook.md)'s argument
gains a second instance: the review vocabulary, like the sweep, is something a devbook-only
repository can hold without the extension — a chapter may say `review: requested` because a
person wrote it, and the check will hold it to the same rules.
