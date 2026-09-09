# 59. The Marketplace Stamps Itself and Materializes Nothing

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/23-the-guide-names-every-plugin-and-depends-on-none.md", ".devbook/arc42/adr/24-the-specialists-leave-the-marketplace.md", ".devbook/arc42/adr/27-one-rule-one-wrapper-per-host.md", ".devbook/arc42/adr/28-devbook-owns-one-section-of-agentsmd.md", ".devbook/arc42/05-building-block-view.md#stack-config"]
```

This repository now carries `.devbook/config.json`: the four engine keys, `components.devbook`,
`components.delivery`, and `components.schedule`. It did not before, and
[chapter 5](../05-building-block-view.md#stack-config) states the one-committed-file rule
unconditionally, so the producing marketplace was failing its own convention — `devbook-check`
classes *no stamp at all* as hard drift.

**The stamp lands; the payload does not.** `assets/reconcile-protocol.md` says
`tools/devbook-meta/` goes to `.github/tools/devbook-meta/` *always*, and the same table sends
`tools/devbook-tech/`, both workflows, `build/Update-DevbookIndex.ps1`, and nine rule trios
into the repository. None of that is copied here. `materialized` records the two things
`devbook:install` genuinely wrote — `AGENTS.md#devbook` and `.gitignore#devbook`, both rendered
whole from `adopted` rather than copied — and nothing else.

**Because this repository is their source.** A consuming repository has no generator until the
install brings one; here it is `plugins/devbook/tools/devbook-meta/build.mjs`, and a second
copy under `.github/` would drift from it on the first edit to either. `assets/agents-section.md`
already anticipates exactly this: `<generator>` is *the conventional
`.github/tools/devbook-meta/build.mjs` in a repository this materialized into, and a
repo-relative path in one that vendors the generator itself*. The rendered section takes the
second branch, which is what it has always said here.

The nine rule trios have a second reason, and it is a hard failure rather than a judgement.
`tools/check-assets.mjs` errors on any `.agents/rules/<topic>.md` without a `paths` list —
that list is what makes both wrappers derivable, which is the whole bargain of
[record 27](27-one-rule-one-wrapper-per-host.md). devbook ships its rules with `name` and
`description` only; `paths` lives in `rules/rules.json` and the install is told to copy the
rule byte-for-byte. Landing them here fails this repository's own checker nine times over. The
gap this leaves is covered where AGENTS.md already says it is covered: `.devbook/**` has no
rule topic here on purpose, and devbook's own marked section states the folder rules for both
hosts.

**What the checks report against this from now on.** `devbook-check` passes: `adopted` names
the five folders that are on disk, both stamped sections are present and match their hashes,
and the ledger holds `006`, `008`, and `009` — each verified no-op by its own `--check` before
it was recorded. `devbook-config`'s report keeps one permanent row that reads like drift and
is not: the plugin is enabled here and stamps nothing, because
[record 23](23-the-guide-names-every-plugin-and-depends-on-none.md) gave it no
`components.<name>` to write, so its scope is `adoptable` forever.

Hashes are taken over LF-normalized text. The working tree is CRLF under `core.autocrlf=true`
while the index is LF, and a stamp is committed and shared, so a byte hash would be wrong on
whichever platform did not write it.

**The engine keys say what this repository is.** There is no runnable application, so
`qa.depth` and `qa.ceiling` are both `skipped` and `app.start` and `qa.run` are bound to
`null` — deliberately none, not undecided. `pr.required` is `false` and a `deliver` approval
gate sits in front of the lane, because *never push and never open a pull request until asked*
is this repository's committing rule and a gate is where configuration says that. All seven
roles are `null`: [record 24](24-the-specialists-leave-the-marketplace.md) published the
specialists elsewhere, and binding a role to a plugin this repository does not enable would
only earn a warning naming both files.

Close the rules half when devbook's shipped rules carry their own `paths`, or when
`check-assets.mjs` learns to skip a rule the stamp says was materialized. Either one lets the
nine trios land, and both hosts would then fire the folder rules on a `.devbook/**` read
instead of relying on one section of `AGENTS.md` surviving a long session.
