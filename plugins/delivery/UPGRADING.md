# Upgrading delivery

Behaviour changes a consumer would notice, newest first.

## Unreleased: the flow context lives in `.devbook/`

`.claude/flow-context.md` is now `.devbook/flow-context.md`, beside the stack config and for
the same reason (`.devbook/arc42/adr/67-the-flow-context-lives-in-devbook.md`). Nothing reads
the old path: a repository that keeps it there runs as if the file were absent — the flow-runner
discovers the AppHost and entry points itself, and `delivery:install` seeds `start` even where
the old file said `none`. `git mv .claude/flow-context.md .devbook/flow-context.md` is the
whole move; `devbook-config`'s report names the old file while it is still present. The
`repo-flow-context` slot is unchanged, so a repository that bound the old path explicitly keeps
working, though the binding is now redundant.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
