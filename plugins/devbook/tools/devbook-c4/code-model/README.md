# code-model

The code level of an arc42 folder's C4 model. A .NET console that loads a solution with
Roslyn, finds the types a marker names, and writes the files it owns under
`.devbook/arc42/c4/generated/`. The `devbook:c4-update` skill runs it; no person edits what it
writes. The reasons are the [C4 model record](../../../../../.devbook/arc42/adr/c4-model.md).

```bash
dotnet restore <solution>
dotnet run --project plugins/devbook/tools/devbook-c4/code-model -- --solution <solution> [--root <repository>] [--markers <root>,<entity>,<value>,<event>] [--check]
```

| Option | Meaning |
| --- | --- |
| `--solution` | A `.sln`, `.slnx`, or `.csproj`. Restore it first: an unrestored project loads without its references |
| `--root` | The repository root; default, the nearest folder at or above the current one holding `.devbook/` |
| `--markers` | The four marker names, in role order; default `IAggregateRoot,IEntity,IValueObject,IDomainEvent` |
| `--check` | Write nothing; print each file that would change as `drift: <path>` and exit `1` |

## What it finds

A concrete class or struct is marked when it implements an interface of a marker's name, or
derives from a base class of that name or that name without its leading `I` (`IEntity` or
`Entity`). The first role in marker order wins, so a root that is also an entity is a root. A
type named for a marker is the marker itself, and an abstract class is a base: both are skipped.
Generic arity and namespace are ignored.

A root belongs to the component the building block names in `c4` — an identifier of three
parts, `system.container.component` — when the block's `code` folder holds its source file, the
longest such folder winning. A block naming several components draws under the first and says
so; one naming none draws nothing.

## What it writes

| File | Content |
| --- | --- |
| `code/<component>.mmd` | A Mermaid `classDiagram`: each root of the component, with the entities and value objects it holds through a public property or field, and theirs in turn. A collection or array, at any depth, is `many`. An entity is held by composition (`*--`), a value object by association (`-->`), each labelled by the member. Another root is a boundary and is not entered; domain events are found but not drawn |
| `code.dsl` | One `image <component> <component-with-dashes>-code { mermaid code/<component>.mmd }` per diagram. `workspace.dsl` includes it inside `views` |

Each box lists the public properties, fields, and ordinary methods of the type and of its base
classes in the solution, up to a marker's own base. A nested type is drawn as `Outer_Inner`,
and a second type of one name in a diagram as `Name_2`, reported. A run removes a
`code/*.mmd` no component produces any more. Output is LF and byte-stable for the same code.

## What it reports

On standard error, sorted, never changing the exit code:

| Line | Meaning |
| --- | --- |
| `no-alias:` | A marked type whose class name no `.devbook/domain/` chapter carries in `aliases` |
| `no-domain:` | `domain/` is not adopted, so no name was checked |
| `unmapped:` | A root in no building block's `code` folder, so no diagram shows it |
| `no-component:`, `several-components:` | A block with `code` naming no component in `c4`, or several |
| `name-collision:` | Two types of one name in one diagram |
| `load:` | A project that did not load, or loaded without its references or framework |

Exit codes: `0` done or current, `1` drift under `--check`, `2` a bad argument, `3` a load
failure. A partial load would read as types removed, so on `3` nothing is compared or written.

## Tests

`code-model.test.mjs` runs the console against `fixtures/shop/`, whose committed
`.devbook/arc42/c4/generated/` is the golden output, on a copy in a temporary folder. It needs
a .NET 10 SDK and skips without one, so `repo-checks.yml` installs it:
`node --test code-model.test.mjs`.
