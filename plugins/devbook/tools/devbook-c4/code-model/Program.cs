// devbook-c4 code-model: the code level of an arc42 folder's C4 model.
//
// Loads a solution with Roslyn, finds every type marked as an aggregate root, entity, value
// object, or domain event — by an interface it implements or a base class it derives from —
// and writes, under .devbook/arc42/c4/generated/:
//
//   code/<component>.mmd   one Mermaid classDiagram per component: each aggregate root the
//                          component's code folders hold, with the entities and value objects
//                          it holds
//   code.dsl               one `image` view per diagram, which workspace.dsl includes in views
//
// A component is the `c4` element of the building block whose `code` folder holds the type's
// source file. A marked type whose class name no domain/ chapter carries in `aliases` is
// reported. `--check` writes nothing and exits 1 when a file would change. README.md beside
// this file is the usage.

using Devbook.C4.CodeModel;
using Microsoft.Build.Locator;

return await Cli.RunAsync(args);

namespace Devbook.C4.CodeModel
{
    internal static class Cli
    {
        private const string Usage =
            "usage: dotnet run --project plugins/devbook/tools/devbook-c4/code-model -- " +
            "--solution <path> [--root <repository>] [--markers <root>,<entity>,<value>,<event>] [--check]";

        public static async Task<int> RunAsync(string[] args)
        {
            Options options;
            try
            {
                options = Options.Parse(args);
            }
            catch (ArgumentException e)
            {
                Console.Error.WriteLine(e.Message);
                Console.Error.WriteLine(Usage);
                return 2;
            }

            if (!MSBuildLocator.IsRegistered) MSBuildLocator.RegisterDefaults();

            var report = new Report();
            var devbook = DevbookFolder.Read(options.Root, report);
            var types = await TypeFinder.FindAsync(options, report);
            if (types is null)
            {
                // A project that did not load would read as types removed: compare and write nothing.
                report.Print();
                Console.Error.WriteLine("code-model: the solution did not load whole; nothing was compared or written");
                return 3;
            }
            var files = Generator.Generate(types, devbook, options, report);
            var drift = Output.Apply(files, devbook.GeneratedFolder, options.Root, options.Check);

            report.Print();
            if (!options.Check) return 0;
            foreach (var path in drift) Console.Error.WriteLine($"drift: {path}");
            if (drift.Count == 0) Console.WriteLine("code-model: generated files are current");
            return drift.Count == 0 ? 0 : 1;
        }
    }

    /// <summary>The command line, resolved.</summary>
    internal sealed record Options(string Solution, string Root, Markers Markers, bool Check)
    {
        public static Options Parse(string[] args)
        {
            string? solution = null, root = null, markers = null;
            var check = false;
            for (var i = 0; i < args.Length; i++)
            {
                string Value() => i + 1 < args.Length ? args[++i] : throw new ArgumentException($"{args[i]} needs a value");
                switch (args[i])
                {
                    case "--solution": solution = Value(); break;
                    case "--root": root = Value(); break;
                    case "--markers": markers = Value(); break;
                    case "--check": check = true; break;
                    default: throw new ArgumentException($"unknown argument: {args[i]}");
                }
            }
            if (solution is null) throw new ArgumentException("--solution is required");
            var cwd = Directory.GetCurrentDirectory();
            solution = Path.GetFullPath(solution, cwd);
            if (!File.Exists(solution)) throw new ArgumentException($"no such solution or project: {solution}");
            root = root is null ? FindRoot(cwd) : Path.GetFullPath(root, cwd);
            if (!Directory.Exists(Path.Combine(root, ".devbook")))
                throw new ArgumentException($"{root} holds no .devbook folder; pass --root");
            return new Options(solution, root, Markers.Parse(markers), check);
        }

        // The nearest folder at or above the current one that holds a .devbook folder.
        private static string FindRoot(string from)
        {
            for (var dir = new DirectoryInfo(from); dir is not null; dir = dir.Parent)
                if (Directory.Exists(Path.Combine(dir.FullName, ".devbook"))) return dir.FullName;
            return from;
        }
    }

    internal enum Role { AggregateRoot, Entity, ValueObject, DomainEvent }

    /// <summary>The four marker names, in role order; a base class may drop an interface's I.</summary>
    internal sealed record Markers(string AggregateRoot, string Entity, string ValueObject, string DomainEvent)
    {
        public static readonly Markers Default = new("IAggregateRoot", "IEntity", "IValueObject", "IDomainEvent");

        public static Markers Parse(string? value)
        {
            if (value is null) return Default;
            var names = value.Split(',', StringSplitOptions.TrimEntries);
            if (names.Length != 4 || names.Any(n => n.Length == 0))
                throw new ArgumentException("--markers takes four names: aggregate root, entity, value object, domain event");
            return new Markers(names[0], names[1], names[2], names[3]);
        }

        public IEnumerable<(Role Role, string Name)> InPriority()
        {
            yield return (Role.AggregateRoot, AggregateRoot);
            yield return (Role.Entity, Entity);
            yield return (Role.ValueObject, ValueObject);
            yield return (Role.DomainEvent, DomainEvent);
        }

        /// <summary>The names a base class may carry for a marker: the name itself, and IEntity as Entity.</summary>
        public static IEnumerable<string> BaseNames(string marker)
        {
            yield return marker;
            if (marker.Length > 1 && marker[0] == 'I' && char.IsUpper(marker[1])) yield return marker[1..];
        }

        public bool IsMarkerName(string name) =>
            InPriority().Any(m => BaseNames(m.Name).Contains(name, StringComparer.Ordinal));
    }

    /// <summary>What the run found worth a person's attention; never changes the exit code.</summary>
    internal sealed class Report
    {
        private readonly SortedSet<string> _lines = new(StringComparer.Ordinal);

        public void Add(string kind, string message) => _lines.Add($"{kind}: {message}");

        public void Print()
        {
            foreach (var line in _lines) Console.Error.WriteLine(line);
        }
    }
}
