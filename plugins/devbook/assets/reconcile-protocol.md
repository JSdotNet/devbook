# Reconcile protocol

The shared detail behind `devbook:install` and `devbook-check`: the stamp devbook
writes, the assets it materializes, and what each of the six phases actually
does. Read it before running either skill; neither repeats it.

Two other installs read one section of it. `delivery:install` and
`devbook-collaboration:install` take **The stamp**'s two shared fields and its hash
rules, and nothing else here describes them: the three fields beside those, the asset
table, and the six phases are devbook's own. The reason is
`.devbook/arc42/adr/56-payload-only-components-carry-no-contract-version.md`.

## One reconcile, four situations

First install, a version upgrade, a change in which folders are adopted, and a
migration are the same idempotent operation. The stamp says which one this is:

| Situation | Detected by | What differs |
|---|---|---|
| New repository | no stamp file | It asks which folders to adopt. Everything after is identical. |
| New plugin version | stamped `pluginVersion` below the installed one | Runs the migration delta; re-materializes stale assets. |
| Adoption changed | `adopted` differs from what is on disk | Materializes what is newly needed; orphans what nothing claims. |
| Migration only | stamped `contractVersion` below the plugin's | Ledger forward, no asset movement. |

None of these is a separate procedure. Detect, resolve, plan, migrate,
materialize, stamp — every time.

## The stamp

`.devbook/config.json`, repo-scope and committed. devbook owns exactly
one entry inside it and never edits another component's — except where a
devbook migration renames an id another component's entry spells.

Five fields, and only devbook writes all five. Every component writes `pluginVersion`
and what it put in the repository — a `materialized` map for one that copies files,
its own selection key for one that does not. The other three belong to a component
whose install rewrites content the repository authored, which is devbook alone:

```json
{
  "components": {
    "devbook": {
      "pluginVersion": "1.0.0",
      "contractVersion": 9,
      "adopted": ["arc42", "domain", "tech"],
      "materialized": {
        ".devbook/_tools/devbook-meta": { "from": "1.0.0", "hash": "sha256:9f2c…", "managed": true },
        ".github/workflows/devbook-meta.yml": { "from": "1.0.0", "hash": "sha256:41ab…", "managed": true },
        "build/Update-DevbookIndex.ps1": { "from": "1.0.0", "hash": "sha256:7e10…", "managed": false },
        "AGENTS.md#devbook": { "from": "1.0.0", "hash": "sha256:c0de…", "managed": true },
        ".agents/rules/devbook-arc42.md": { "from": "1.0.0", "hash": "sha256:b17e…", "managed": true },
        ".claude/rules/devbook-arc42.md": { "from": "1.0.0", "hash": "sha256:5a1d…", "managed": true },
        ".github/instructions/devbook-arc42.instructions.md": { "from": "1.0.0", "hash": "sha256:e3f0…", "managed": true }
      },
      "migrations": []
    }
  }
}
```

| Field | Means |
|---|---|
| `pluginVersion` | The devbook release that last reconciled this repository. |
| `contractVersion` | The schema contract the repository is on. Migrations key off this, not off `pluginVersion`, which is why most upgrades reconcile to nothing. |
| `adopted` | Which devbook folders this repository maintains, without the leading dot. A migration's `appliesTo` is read against this list. |
| `materialized` | Every file devbook copied in, and the one section it wrote, with the release it came from and the hash it had when it landed. |
| `managed: false` | The repository has taken ownership of that copy. Report drift on it; never write to it. |
| `migrations` | Append-only ledger of `{ "id", "applied" }` entries, one per migration folder run, oldest first. An entry may carry `"result": "not-applicable"` instead of `applied` where the migration's `appliesTo` names no adopted folder. |

`contractVersion`, `adopted`, and `migrations` are devbook's three; `pluginVersion`
and `materialized` are everyone's. A component that only copies files it owns needs
no ledger: a copy hashing to a release that component shipped is stale and gets
replaced, which *is* the migration, and a copy hashing to nothing shipped is the
repository's and is never overwritten, ledger or not. So `delivery` and
`devbook-collaboration` stamp two fields, `delivery-schedule` stamps `pluginVersion`
beside the selection it made in the host's own scheduler, and none of the three ships
a `migrations/` folder or runs the six phases below.

What the stamp deliberately does not record: which plugins are installed, at what
version, by whom. That is personal and user-scope, and putting it here makes the
file wrong the moment a second person opens the repository.

## What devbook materializes

| From the plugin | Into the repository | When |
|---|---|---|
| `tools/devbook-meta/` | `.devbook/_tools/devbook-meta/` | always |
| `tools/devbook-tech/` | `.devbook/_tools/devbook-tech/` | `.tech` adopted |
| `assets/workflows/devbook-meta.yml` | `.github/workflows/devbook-meta.yml` | GitHub Actions present |
| `assets/workflows/devbook-meta-nightly.yml` | `.github/workflows/devbook-meta-nightly.yml` | GitHub Actions present |
| `assets/build/Update-DevbookIndex.ps1` | `build/Update-DevbookIndex.ps1` | always |
| `assets/agents-section.md` | `AGENTS.md`, between `<!-- devbook:begin -->` and `<!-- devbook:end -->` | always |
| `assets/root-wrappers/CLAUDE.md` | `CLAUDE.md` | absent |
| `assets/root-wrappers/copilot-instructions.md` | `.github/copilot-instructions.md` | absent |
| the local-file list below | `.gitignore`, between `# devbook:begin` and `# devbook:end` | always |
| `rules/<name>.md` | `.agents/rules/<name>.md` | per `rules/rules.json` |
| its `paths` from `rules/rules.json` | `.claude/rules/<name>.md` | with the rule |
| the same `paths`, comma-joined | `.github/instructions/<name>.instructions.md` | with the rule |

Both workflows are edited on the way in — the branch name corrected, the nightly
`cron` and `REFRESH_BRANCH` chosen, and the two path filters of
`devbook-meta.yml` rendered. Those filters carry `<prefix>`: replace it with `.`
in the flat layout and `.devbook/` in the nested one — `build.mjs` prints which
layout it found on every run — and drop the rows for folders `adopted` does not
name. A `<prefix>` reaching `.github/` is a failed reconcile, not a cosmetic
defect: the filter then matches nothing, so the check never fires and nothing
reports its absence. Verify in phase 6 that none survived. This editing makes
both files customized from the first reconcile onward, which is the
intended outcome: their hash matches no shipped release, so reconcile reports
them and leaves them alone.

The two root wrappers are the one asset created and never reconciled. `AGENTS.md` is
read natively by Copilot and not by Claude, so a repository owes each host a root file that
points at it: `CLAUDE.md` is an `@AGENTS.md` import, `.github/copilot-instructions.md` one
sentence. Both are copied only where absent and stamped `managed: false` from the first
reconcile — the file is the repository's from the moment it lands, and a later reconcile
reports drift on it and never writes to it. A present one, whatever it holds, is left alone.
The reason is `.devbook/arc42/adr/67-the-install-creates-the-root-wrappers-where-absent.md`.

The `AGENTS.md` section is rendered whole rather than copied at all. It is generated
from the stamp's `adopted` list per `assets/agents-section.md`, keyed `AGENTS.md#devbook`,
and its hash is of the text between the markers as devbook wrote it. Every reconcile
renders it again and compares: text on disk still matching the stamped hash is managed,
and is rewritten when the fresh rendering differs — adoption moved, or the template did.
Text that no longer matches the stamped hash is customized: reported, left alone. Nothing
outside the markers is read or written. Absent `AGENTS.md` is created holding only the
section; present without the markers, the section is appended at the end.

The folder rules are the one asset materialized as a trio. A rule sitting in a plugin
is read by no host automatically, and the globs in `rules/rules.json` name folders in
this repository, the only place they resolve. So each rule lands as its own copy under
`.agents/rules/<name>.md`, verbatim, with a wrapper per host beside it — `.claude/rules/`
carrying `paths`, `.github/instructions/` carrying the same list comma-joined as
`applyTo` — each frontmatter and a single sentence pointing at the rule. Which rules ship,
and which adopted folder pulls each one in, is in `rules/rules.json`;
`assets/rule-wrappers.md` carries the three templates and the reasons.

The `.gitignore` block is the second rendered asset, keyed `.gitignore#devbook` and
following the `AGENTS.md` rules exactly — markers, hash of the text between them,
rewritten while managed, reported and left alone once customized. It names the two
files a repository keeps out of version control on every contributor's behalf:

```gitignore
# devbook:begin
# Machine-scope, never committed. See AGENTS.md.
AGENTS.local.md
.devbook/config.local.json
# devbook:end
```

Neither file is ever created by a reconcile. Ignoring a file is a decision the repository
makes once for everybody; writing an empty one is a decision only its owner can make, and
an empty overlay is worse than an absent one — it reads as a setting somebody chose. Absent
`.gitignore` is created holding only the block; present without the markers, the block is
appended at the end.

`assets/routing-snippet.md` is never materialized. Routing policy is
repository-specific and is offered for the user to merge, never applied silently — and
it never goes inside the markers.

## The six phases

1. **Detect.** Read the stamp, the installed plugin version, and the actual disk
   state — which folders exist, what each materialized file hashes to. Disk wins
   on existence, the stamp wins on provenance. Never trust the stamp alone: a
   folder someone deleted is gone whatever the stamp says.

2. **Resolve.** Desired state is adopted folders × contract version × the asset
   table above. Ask the user only about genuinely new choices — which folders to
   adopt on a first install, a folder that has appeared on disk but is unstamped
   — and never re-ask what the stamp already answers.

3. **Plan.** Emit one diff table — `create`, `update`, `migrate`,
   `skip-customized`, `orphan` — and **write nothing**. This phase is what makes
   the skill safe to run against a repository nobody remembers configuring, so it
   is never skipped, not even when the plan is empty.

4. **Migrate.** Run the ledger forward, one migration at a time, oldest first.
   Each ships an idempotent `migrate.mjs`; call `--check` first, apply only if it
   exits `1`, then `--check` again to confirm. Record each in the ledger as it
   lands, or as `not-applicable` where its `appliesTo` names no adopted folder.
   Stop at the first failure with the ledger reflecting exactly what was applied.

5. **Materialize.** Copy assets, overwriting only where the file's hash matches a
   release devbook shipped — that is stale, and stale gets replaced. A hash
   matching nothing ever shipped is customized: report it and leave it alone.
   Orphan anything no adopted folder claims any more; report it, do not delete.
   The `AGENTS.md` section follows the same rule, with the text between its
   markers standing in for the file.

6. **Stamp and verify.** Rewrite devbook's entry, run `devbook-check`, and report
   what moved. A reconcile that ends with a failing check is reported as failing —
   never as "installed".

## Rules that hold in every phase

- Nothing is written before phase 3 has been shown.
- A customized file is never overwritten, in any phase, for any reason.
- A migration id is never invented, renamed, or removed from the ledger.
- devbook writes one component entry. Another component's entry, and the stamp's
  own top-level keys, belong to whoever owns them.
