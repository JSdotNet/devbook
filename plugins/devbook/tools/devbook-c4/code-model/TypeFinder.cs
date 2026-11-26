using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Devbook.C4.CodeModel;

/// <summary>A type a marker names, with the role it plays and the file that declares it.</summary>
internal sealed record MarkedType(INamedTypeSymbol Symbol, Role Role, string File)
{
    public string Key => TypeFinder.KeyOf(Symbol);
    public string Name => Symbol.Name;
}

internal static class TypeFinder
{
    public static string KeyOf(ITypeSymbol symbol) =>
        symbol.OriginalDefinition.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);

    public static async Task<IReadOnlyDictionary<string, MarkedType>> FindAsync(Options options, Report report)
    {
        using var workspace = MSBuildWorkspace.Create();
        var solutionLabel = DevbookFolder.Relative(options.Root, options.Solution);
        var projects = options.Solution.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase)
            ? [await workspace.OpenProjectAsync(options.Solution)]
            : (await workspace.OpenSolutionAsync(options.Solution)).Projects.ToList();
        foreach (var diagnostic in workspace.Diagnostics.Where(d => d.Kind == WorkspaceDiagnosticKind.Failure))
            report.Add("load", $"{solutionLabel}: {diagnostic.Message}");

        var found = new Dictionary<string, MarkedType>(StringComparer.Ordinal);
        foreach (var project in projects.Where(p => p.Language == LanguageNames.CSharp).OrderBy(p => p.FilePath, StringComparer.Ordinal))
        {
            var compilation = await project.GetCompilationAsync();
            if (compilation is null) continue;
            foreach (var type in SourceTypes(compilation.Assembly.GlobalNamespace))
            {
                var key = KeyOf(type);
                if (found.ContainsKey(key)) continue; // one project built for several targets
                if (type.TypeKind is not (TypeKind.Class or TypeKind.Struct)) continue;
                if (options.Markers.IsMarkerName(type.Name)) continue; // a marker's own base class
                var role = RoleOf(type, options.Markers);
                if (role is null) continue;
                var location = type.Locations.FirstOrDefault(l => l.IsInSource)?.SourceTree?.FilePath;
                if (location is null) continue;
                found[key] = new MarkedType(type, role.Value, DevbookFolder.Relative(options.Root, location));
            }
        }
        return found;
    }

    // The first role, in marker order, an implemented interface or a base class names.
    public static Role? RoleOf(INamedTypeSymbol type, Markers markers)
    {
        var interfaces = type.AllInterfaces.Select(i => i.Name).ToHashSet(StringComparer.Ordinal);
        var bases = new HashSet<string>(StringComparer.Ordinal);
        for (var b = type.BaseType; b is not null; b = b.BaseType) bases.Add(b.Name);
        foreach (var (role, name) in markers.InPriority())
            if (interfaces.Contains(name) || Markers.BaseNames(name).Any(bases.Contains)) return role;
        return null;
    }

    private static IEnumerable<INamedTypeSymbol> SourceTypes(INamespaceSymbol ns)
    {
        foreach (var member in ns.GetMembers())
        {
            if (member is INamespaceSymbol child)
                foreach (var t in SourceTypes(child)) yield return t;
            else if (member is INamedTypeSymbol type)
                foreach (var t in WithNested(type)) yield return t;
        }
    }

    private static IEnumerable<INamedTypeSymbol> WithNested(INamedTypeSymbol type)
    {
        if (type.IsImplicitlyDeclared) yield break;
        yield return type;
        foreach (var nested in type.GetTypeMembers())
            foreach (var t in WithNested(nested)) yield return t;
    }
}
