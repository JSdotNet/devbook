# devbook-config

The repository's stack configuration, and the way into the marketplace that writes it. It owns
`.devbook/config.json` — set up first, moved forward after — and answers *what is this, what
have I got, and how is this repository wired* from files on disk.

It is named for the file it writes, not for a plugin it needs: the `dependencies` array is
empty, `devbook` included. See
[the decision](../../.devbook/arc42/adr/23-the-guide-names-every-plugin-and-depends-on-none.md).

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-config` with `/plugin`. During development, add this working copy by path
instead of by repository.

## The four skills

| Skill | Does |
| --- | --- |
| [`setup`](skills/setup/SKILL.md) | Writes a repository's `.devbook/config.json` for the first time, before any component installs itself. |
| [`update`](skills/update/SKILL.md) | The whole stack, moved forward in one run: version drift, outstanding migrations, a fan-out to every adopted component's own install skill, and a re-validated config. |
| [`ask`](skills/ask/SKILL.md) | Answers one question about the stack. Reads only. The state half comes from the report below, the concept half from walking the canon — plugin READMEs, `.devbook/domain/plugin-authoring/domain.md`, the arc42 chapters, and `delivery`'s surface contract. |
| [`adoption`](skills/adoption/SKILL.md) | Reports where `.ai` no longer matches what is installed, enabled, and wired, and hands every edit to `delivery:flow-ai`. Reads only. |

`devbook-config:adoption` is the one that writes nothing at all, and deliberately: `.ai` rates whether
people actually work a certain way, and the report can only see what is on disk. It says which
plugins, flows, and bindings a chapter's prose no longer matches, and leaves `status`,
**Adopted by**, **Evidence**, and **Limits** to a person — the same boundary `devbook-config:setup` and
`devbook-config:update` keep against a `components.<name>` stamp.

`setup` and `update` stay two skills rather than one that branches on detect. They answer
different questions — *what should this repository use?* against *is what it uses current?* —
and only the first is a conversation about intent. Merging them would put an interview in
front of an operation people run to change nothing.

The four carry no prefix. `flow-`, `fleet-`, `phase-`, and `schedule-` each mark a procedure's
scope against its neighbours in the same plugin; here the plugin name is the scope, and
`devbook-config:setup` says everything a prefix would have.

## The report

[`scripts/report.mjs`](scripts/report.mjs) is what makes an answer checkable. It is
read-only, takes no network, and prints the path behind every fact:

```bash
node scripts/report.mjs --root <repository>
```

| Reads | To answer |
| --- | --- |
| The marketplace catalog, in the working tree and in the host's clone | What the newest published version of each plugin is — and whether the clone is stale, which is the usual reason "already latest" is wrong |
| The host's installed-plugin state | Which version of each plugin is actually on disk |
| The user, project, and local settings, merged nearest-last | Which plugins are enabled here |
| `.devbook/config.json` | Roles, tracker, every service and chore extension point, policy switches, gates, and each component's stamp |
| The overlays — `config.local.json` in this checkout's `.devbook/`, and under the user's devbook config directory for every repository and for this repository's `id` | Which layers this machine applies over the committed config, and which engine keys each touches |
| `.mcp.json`, `.vscode/mcp.json`, `.github/mcp.json` | Which MCP servers the hosts can start here, against the ids `delivery.mcp` binds or the engine defaults — a server in use that no file declares is named |
| The devbook folders, flat and nested | Which of the five this repository adopted, and in which layout |
| The `skills/` folders of `delivery` and `delivery-schedule` | Which `flow-*`, `phase-*`, and `schedule-*` procedures the copies on disk ship |

It also prints a **scope** verdict per plugin, which is what `devbook-config:update` fans out
over. The three inputs are orthogonal — `installed` is a fact about this machine, `enabled`
about this checkout, and the `components.<name>` stamp about the repository and everyone who
shares it:

| Scope | Installed | Enabled | Stamped | The run |
| --- | --- | --- | --- | --- |
| `reconcile` | yes | yes | yes | Runs its install skill |
| `blocked` | no | – | yes | Reports and skips. **Never drops the stamp.** |
| `frozen` | yes | no | yes | Reports; offers to enable |
| `adoptable` | yes | yes | no | Asks once whether to adopt |
| `available` | yes | no | no | One line |
| `out-of-scope` | no | – | no | A footnote |

`blocked` is the one worth stating twice: a stamp is committed and shared, and installed-ness
is personal and per-machine, so a component this machine lacks is skipped and left stamped.
Dropping the entry would un-adopt it for everyone on the next commit.

It cross-references the bindings against that same enabled set. A `delivery.roles` or
`extensions` row naming a plugin nobody has enabled is flagged in place and collected under
**Bindings nobody has enabled**, which names both files — the config that binds it and the
settings that do not enable it. It is a warning and never a failure: `delivery`'s
[surface contract](../delivery/resources/surface-contract.md) makes an unreachable role a
fallback rather than a stop, and enablement is personal to one checkout while a binding is
committed and shared.

`--json` prints the same model unrendered. `--marketplace <name>` reports a different catalog.

## What it never depends on

- **Any plugin here.** It names all of them and declares none. A plugin it cannot find is
  reported as `not installed` — the same degrade-rather-than-fail shape `delivery` uses for a
  role or a service whose provider does not resolve. That is what keeps this outside the
  [layer](../../.devbook/domain/plugin-authoring/domain.md#layer) order rather than under it.
- **Writing anything a component owns.** `devbook-config:setup` and `devbook-config:update` write the four
  engine-owned keys and stop. Every `components.<name>` stamp stays with that component's own
  install skill, which is the only thing that knows what it materialized. That is also why
  `devbook:install` and `devbook-check` did not move here: `devbook` ships the payload, the
  migrations, and the ledger, and a skill in this plugin has no supported path to any of them.

## Files

| Path | Holds |
| --- | --- |
| `.claude-plugin/plugin.json`, `.github/plugin/plugin.json` | The two manifests, agreeing on name, version, and description |
| `skills/setup/SKILL.md` | First setup of the engine keys, before any component installs |
| `skills/update/SKILL.md` | Version drift, migrations, re-validation |
| `skills/ask/SKILL.md` | The question-answering procedure |
| `skills/adoption/SKILL.md` | Adoption-record drift, handed to `flow-ai` |
| `scripts/report.mjs` | The read-only report, run in place from this plugin root |

## Known gap

The report reads one host's plugin state — the config directory, its installed-plugin file, its
marketplace clones, and its settings layers. Two things follow, and both are deliberate.

It is the only asset in this marketplace that still names a host's own paths, after
[`claude-desktop` and `copilot-app` were deleted](../../.devbook/arc42/adr/17-no-host-profile-plugins.md)
for doing exactly that. Where a plugin is installed and whether it is enabled is a fact about a
host and about nothing else, so an asset answering it either names those files or answers
nothing, and nothing in a flow reads what this returns. The
[decision](../../.devbook/arc42/adr/23-the-guide-names-every-plugin-and-depends-on-none.md)
records the divergence rather than leaving it silent. A slot would be the clean fix and the
engine's closed set has no member for *where this host keeps its plugins*.

And the other host keeps that state somewhere this repository has never written down, so there
its plugin rows come back empty while the catalog half still answers. The report says which
files it read and which were absent, so an empty table is legible rather than misleading.
