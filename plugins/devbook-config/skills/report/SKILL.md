---
name: report
description: 'Print this repository''s setup report as it stands — each plugin''s installed and newest version and scope, what is adopted, its procedures and routines, the overlays in force, and what is still open — writing nothing. init and update close on it. Use when: checking how a repository is set up or what is installed, handing the setup to someone, "setup report".'
---

# devbook-config report

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Show how this repository is set up, in one shape every time, and write nothing. `doctor` says
what is wrong and `ask` answers one question; this prints the whole standing state, so a
report taken today compares line by line against the one `init` or `update` closed on.

## Steps

1. **Look.** Run `node scripts/report.mjs --root <repository> --json` from this plugin's root.
   No `.devbook/config.json`: say "not initialized, run `devbook-config:init`" and stop.
2. **Read the effective configuration.** Where delivery is installed, run its
   `tools/stack-config/check.mjs --print` with the repository as the working directory, for
   the bindings, phases, policy, and gates in force after every overlay. Never merge the
   layers by hand.
3. **Collect what is open.** Run `devbook-config:doctor` and take each finding with the skill
   that fixes it. A caller that has just run it passes its findings instead.
4. **Fill** [`../../resources/setup-report.md`](../../resources/setup-report.md) and print it as
   the last thing in the reply. Run by hand, *This run* reads `none — standing report`;
   `init` and `update` pass their own rows for it.

## Do not

- Do not fix a finding, write a stamp, the config, or an overlay. Name the skill that does.
- Do not report a fact from memory, or a plugin the report shows as not installed as present.
