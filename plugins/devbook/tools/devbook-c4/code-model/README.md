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

A class or struct is marked when it implements an interface of a marker's name, or derives from
a base class of that name or that name without its leading `I` (`IEntity` or `Entity`). The
first role in marker order wins, so a root that is also an entity is a root. A type named for a
marker is the marker itself and is skipped. Generic arity and namespace are ignored.

A root belongs to the `c4` element of the building block whose `code` folder holds its source
file, the longest such folder winning. A block naming several elements draws under the first
and says so.

## What it writes

| File | Content |
| --- | --- |
| `code/<component>.mmd` | A Mermaid `classDiagram`: each root of the component, with the entities and value objects it holds through a property or field, and theirs in turn. A collection or array is `many`. An entity is held by composition (`*--`), a value object by association (`-->`), each labelled by the member. Another root is a boundary and is not entered; domain events are found but not drawn |
| `code.dsl` | One `image <component> <component-with-dashes>-code { mermaid code/<component>.mmd }` per diagram. `workspace.dsl` includes it inside `views` |

Each box lists the type's own public properties and ordinary methods. A run removes a
`code/*.mmd` no component produces any more. Output is LF and byte-stable for the same code.

## What it reports

On standard error, sorted, never changing the exit code:

| Line | Meaning |
| --- | --- |
| `no-alias:` | A marked type whose class name no `.devbook/domain/` chapter carries in `aliases` |
| `no-domain:` | `domain/` is not adopted, so no name was checked |
| `unmapped:` | A root in no building block's `code` folder, so no diagram shows it |
| `no-element:`, `several-elements:` | A block with `code` and no `c4`, or with several |
| `load:` | A project the workspace could not load |

Exit codes: `0` done or current, `1` drift under `--check`, `2` a bad argument.

## Tests

`code-model.test.mjs` runs the console against `fixtures/shop/`, whose committed
`.devbook/arc42/c4/generated/` is the golden output, on a copy in a temporary folder. It needs
a .NET 10 SDK and skips without one: `node --test code-model.test.mjs`.
