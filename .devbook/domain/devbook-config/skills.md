# Devbook Config

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook-config"]
```

> Four skills, two of which write nothing. All four are backed by one read-only report that names
> the file behind every fact, and none of them writes a key another component owns.

## setup

```meta
type: feature
related: [".devbook/domain/devbook-config/domain.md#setup", ".devbook/domain/devbook-config/flow.md"]
```

Write a repository's four engine-owned keys for the first time — which provider fills each point,
which plugin fills each role, which tracker, which policy switches, which gates — then invoke every
component's own install skill rather than reimplementing any of them.

It is a conversation about intent, which is why it is not the same skill as the one that moves the
stack forward.

### Stop at the Engine Keys

```meta
type: sub-feature
related: [".devbook/domain/devbook-config/domain.md#engine-configuration"]
```

Four keys and no more. Every `components.<name>` stamp stays with the component that knows what it
materialized, which is why the install skills are invoked and not absorbed.

## update

```meta
type: feature
related: [".devbook/domain/devbook-config/domain.md#update", ".devbook/domain/devbook-config/domain.md#scope-verdict"]
```

Move the whole configured stack forward in one run: version drift, outstanding migrations, a
fan-out to every adopted component's install skill, and a re-validated config. It changes nothing
about intent, which is what makes it safe to run when nothing has changed.

### Never Drop a Stamp

```meta
type: sub-feature
```

A component this machine has not installed is reported, skipped, and **left stamped**. A stamp is
committed and shared while installed-ness is personal, so dropping the entry would un-adopt the
component for everyone on the next commit.

## ask

```meta
type: feature
related: [".devbook/domain/devbook-config/domain.md#ask"]
```

Answer one question about this marketplace from what is on disk: what each part is and how they
fit, which version of each plugin is installed against the newest published, and which are enabled.
Reads only.

It is the one asset allowed to name every plugin, because it is the only one whose subject is the
marketplace rather than a unit of work.

## adoption

```meta
type: feature
related: [".devbook/domain/devbook-config/domain.md#adoption-drift", ".devbook/domain/delivery/skills.md#flow-spec"]
```

Report where the adoption record no longer matches what is installed, enabled, and wired, and hand
every edit to the folder's own flow. It writes nothing, deliberately: the report can only see what
is on disk, and whether people actually work a certain way is not on disk.
