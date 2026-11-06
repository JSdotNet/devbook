# 1. Author

```meta
rating: adopted
type: stage
```

Every change here starts at this stage, writing an asset: an agent, a skill, an instruction file, a
hook, a chapter.

## Claude Code as Authoring Host

```meta
rating: adopted
type: practice
stage: [code]
evidence: recorded
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
date: 2026-09-02
```

Assets are authored in the host that loads them, in a worktree per change.

- **Used for** — every asset and chapter in this repository, from the first commit.
- **Adopted by** — the maintainer, on every change; work here has been done no other way.
- **Evidence** — authoring in the host surfaces a load failure, such as a rejected model pin or a
  duplicate hooks file, while the change is still being written rather than at a consumer's install.
- **Limits** — the host loads the plugins it has installed, not this working copy. A change is only
  exercised once the working copy is added as a marketplace by path.
