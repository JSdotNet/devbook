# 1. Author

```meta
status: adopted
type: stage
```

Writing an asset: an agent, a skill, an instruction file, a hook, a chapter. The stage every
change here starts in.

## Claude Code as Authoring Host

```meta
status: adopted
type: practice
stage: [code]
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
date: 2026-09-02
```

Assets are authored in the host that loads them, in a worktree per change.

- **Used for** — every asset and chapter in this repository, from the first commit.
- **Adopted by** — the maintainer, on every change; there is no other way work has been done here.
- **Evidence** — authoring in the host is what surfaces a load failure — a rejected model pin,
  a duplicate hooks file — while the change is still being written, rather than at a
  consumer's install.
- **Limits** — the host loads the plugins it has installed, not this working copy, so a change
  is only exercised once the working copy is added as a marketplace by path.
