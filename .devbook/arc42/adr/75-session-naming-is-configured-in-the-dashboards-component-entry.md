# 75. Session Naming Is Configured in the Dashboard's Component Entry

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/16-a-surface-declares-only-the-contracts-tool-names.md", ".devbook/arc42/adr/72-the-overlay-has-three-layers-keyed-by-a-committed-id.md", ".devbook/domain/plugin-authoring/domain.md#stamp", ".devbook/domain/delivery-surface-dashboard/domain.md#run-record"]
```

The words a session title carries — `artifact`, `code`, the five devbook folder kinds — are
configured in `components.delivery-surface-dashboard.sessionNaming.labels` of
`.devbook/config.json`, and the entry is hand-edited. A label may be `null`, which means that
kind of session carries no prefix and is not renamed at all, and a `devbook` key stands for all
five folders at once. Nothing else about the title is configurable: the separator, the length
cap, and the `:<context>` suffix stay as the dashboard computes them.

The entry is the dashboard's because the dashboard is what computes the title. The engine's
four keys were the other candidate and lose twice: `policy` is a closed set of switches over
behaviour [the engine implements](10-one-config-file-two-kinds-of-key.md), and the engine does
not implement naming — the runner only relays a string a surface handed it, per the contract's
*Naming the session*. A per-user file in the devbook config directory was the third: a session
list is one person's, so the words could be theirs. It loses because the contract's reason for
forbidding a hand-assembled name — a second grammar drifting in the same list — holds across
people too: two developers on one repository reading each other's session names is the case the
prefix exists for, and one committed vocabulary is what makes that readable.

**Reading the file is not a dependency**, for the reason [record 11](11-the-stack-config-lives-in-devbook.md)
already gives: the dashboard reads a path, not a plugin, touches only its own entry, and runs
unchanged when the file or the entry is absent. Nothing in it names the engine.

**The entry is hand-written, which the [stamp](../../domain/plugin-authoring/domain.md#stamp)
term did not foresee.** A `components.<name>` entry is written by that component's install
skill, and a component that writes no files records its selection there — which is what this
is. The dashboard materializes nothing, so it ships no install skill, and an install skill
whose only job is to copy one hand-chosen object into the file would be ceremony. The owner is
the same, the boundary is the same — nobody writes another component's entry — and the writer
is the person rather than a skill. The stamp term now says so.

Consequence: **an overlay cannot change the words.** `config.local.json` refuses `components`
at every one of [its three layers](72-the-overlay-has-three-layers-keyed-by-a-committed-id.md),
because a stamp is repo-scope and committed. That refusal is right for a file map and a
migration ledger and is accepted here as the price of one vocabulary per repository: a
developer who wants their own words edits the committed file, and the team sees the edit.

Consequence: **a `null` label is a `null` title, not a bare one.** The runner already does
nothing on `null` — the case where nothing has been written yet, and replacing the host's own
summary with an unprefixed copy of the run title is strictly worse. A kind the repository chose
not to prefix is the same case, so the host's name stands and the contract's rule for the
runner does not change.

Consequence: **a typo is a warning, not a silently absent setting.** The stack config check
skips `components` — each component validates its own entry — and the dashboard has no check
of its own to fail, so an unknown key or a bad value is reported on stderr and takes the
default. That is weaker than [record 10](10-one-config-file-two-kinds-of-key.md)'s rejection
by name, and it is the strongest thing a hook or an MCP server can do without failing a tool
call.
