# 64. 1.0.0 Is the First Release

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#marketplace-root", ".devbook/arc42/adr/56-payload-only-components-carry-no-contract-version.md", ".devbook/arc42/adr/61-the-marketplace-stamps-itself-and-materializes-nothing.md", ".devbook/domain/context-map.md"]
```

Every plugin in the marketplace is `1.0.0`, in its Claude manifest, its Copilot manifest, and
its `marketplace.json` entry alike, and the three declared dependencies read
`>=1.0.0 <2.0.0`. Before this day the versions ran from `delivery` 2.6.0 and `devbook` 3.4.0
down to `0.1.0` on the three surfaces, and `devbook` shipped three migrations —
`006-drop-backlog`, `008-config-to-devbook`, `009-install-skill-ids` — each moving a
repository out of a state the plugin had once written. All of that is gone: the migration
folders are deleted, every `UPGRADING.md` opens at 1.0.0 with nothing above it, and the six
plugins that had none gain one saying the same.

**A version history nobody lived through is noise, not provenance.** A version number earns
its meaning from the consumers that installed under it: it is what an upgrade note is
addressed to and what a migration moves away from. No repository had installed any of these
plugins — the `jsdotnet` marketplace was registered on one machine with nothing installed
from it, and the only `.devbook/config.json` stamped by this stack was this repository's own.
So the spread recorded which branch merged after which, and nothing else, while asking every
future reader to treat `devbook` 3.4.0 as a fourth major and `fleet` 0.2.0 as pre-release.
Collapsing it before the first real install costs nothing and removes a false signal from
every manifest; collapsing it after would be a downgrade, which is why the check for a stamp
above 1.0.0 in any repository came first.

**The migrations go with the history, and the mechanism stays.** Each of the three migrates
away from a state that exists in no repository, so the scripts can only ever exit `0` on
`--check`, and keeping them would ship three folders whose one effect is to seed a ledger
with entries no run applied. `migrations/`, the `<contractVersion>-<slug>` shape, the
`MIGRATION.md` plus idempotent `migrate.mjs` pair, the append-only ledger, and phase 4 of the
reconcile are unchanged; the folder is simply absent until the first breaking change after
1.0.0, which ships as `010-<slug>`.

**`contractVersion` stays at 9.** It counts schema shapes, not releases, and the schema did not
move. Restarting it would make a derived artifact stamped `9` before the reset read as ahead
of a generator writing `1`, for no gain — nothing consumes the number but the generator and
the ledger, and the ledger keys off migration presence, never off the number.

**This repository's own stamp is reset with the rest**, which is the one deliberate exception
to *a migration id is never removed from the ledger* in `assets/reconcile-protocol.md`.
[Record 61](61-the-marketplace-stamps-itself-and-materializes-nothing.md) describes a ledger
holding `006`, `008`, and `009`; it is empty now, `pluginVersion` reads `1.0.0` on all three
components, and the two rendered sections are stamped `from: 1.0.0` with their hashes
untouched. The rule exists so that a ledger can be trusted to describe what a repository has
had done to it; here it described three no-ops recorded on the day the stamp was created, and
an entry pointing at a migration the plugin no longer ships is the one thing a ledger must not
hold.

**The deletion's argument expires at the first install, so the obligation starts at 1.0.0.**
The three migrations could go because no repository was in a state they moved away from. That
holds until the first consumer — Finance is the one expected — runs `devbook:install`; from
that stamp onward, a change to a chapter schema, a stamp shape, a config key, or a path the
install writes leaves a repository behind unless a script moves it. So from this baseline such
a change ships its migration in the same commit as the change that needs it, never in a later
one and never as a note in `UPGRADING.md` asking each consumer to edit by hand. Which changes
owe one and which do not — an additive field with a safe default, a renamed or removed field,
a materialized file reconcile would otherwise report as customized — is stated once, in
`AGENTS.md` under *When a change ships a migration*, and this record does not repeat the three
cases. The two halves are one decision: a history nobody lived through is collapsed exactly
once, and the reason that was safe is the reason it is never safe again.

Records and debt entries that name the three ids or a pre-release version — 25, 35, 39, 56, 59,
[debt 3](../tdr/3-devbook-rename-has-no-migration.md), [debt 4](../tdr/4-delivery-depends-on-devbook.md)
among them — describe the history as it was argued and stay as written. [Record 59](59-the-design-artifacts-are-no-longer-cited.md)
loses only its link into the deleted folder.

Whether 1.0.0 is pushed is a separate call. `claude plugin marketplace add JSdotNet/ai-agent-stack`
resolves the remote, so a rollout that installs by repository name needs this reset on `main`
first; one that installs by path throughout does not.
