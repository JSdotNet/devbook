# 017 — invariants are a subpage of their domain page

```meta
contractVersion: 17
appliesTo: [domain]
breaking: yes
```

## What

A bounded context's invariants no longer have a file of their own. They are a subpage of the
domain page whose aggregates enforce them: `domain.invariants.md` beside `domain.md`, and
`domain.<name>.invariants.md` beside a split `domain.<name>.md`. The script moves each
context's legacy files there:

| Old | New |
| --- | --- |
| `invariants.md` | `domain.invariants.md` |
| `invariants.<name>.md`, with `domain.<name>.md` present | `domain.<name>.invariants.md` |
| `invariants.<name>.md`, with no `domain.<name>.md` | its chapters appended to `domain.invariants.md` |

It then rewrites every reference to an old path in every Markdown file under `.devbook/`: a
repository path such as `.devbook/domain/ordering/invariants.md#order` in a `related` field or
in prose, and a relative link such as `(invariants.md#order)` inside the same context folder.
The anchor after `#` is unchanged, because every chapter keeps its heading.

## Why

An invariant is what an aggregate guarantees, so its rules belong beside the aggregate, not in
a second tree of files that splits on its own schedule. Naming the file after the domain page
makes the pairing structural: splitting `## Order` out of `domain.md` moves its rules to
`domain.order.invariants.md` with it, and a reader who opens a domain page finds its rules one
file over. Requirements keep their own `requirements.md`: they pair with a feature, and a
feature lives in `features.md`, so the same move would name nothing new. The record is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

Nothing fails at once. For one release, `invariants.md` and `invariants.<name>.md` still
validate and each reports a warning naming this migration. The release after that makes the
warning an error.

A chapter left in the wrong subpage — the rules of an aggregate split out to
`domain.order.md` that still sit in `domain.invariants.md` — is reported by the checker as a
warning that names the subpage the chapter belongs in. The script does not move chapters
between subpages. It follows file names, and an older repository may have split one file and
not the other.

## Run it

```bash
node migrate.mjs --check
```

`--check` exits `1` while work remains and `0` when every context is clean. It writes nothing,
and CI and the plan phase of `devbook:update` both call it. Drop the flag to apply. Running it
twice changes nothing. Both forms take `--root <path>`, defaulting to the working directory.

## What the script does, and does not

It moves or merges each legacy file and deletes the old one, and it writes each file back with
the line endings it had. Merging appends everything from the source file's first `##` heading
and drops the source's title, file-level block, and description. The file it merges into
already has its own. It skips `_meta/`, which the scheduled refresh regenerates. It does not
rewrite references outside `.devbook/`, such as a test attribute or a code comment that names
a chapter by path. Search the repository for `invariants.md` after it runs.
