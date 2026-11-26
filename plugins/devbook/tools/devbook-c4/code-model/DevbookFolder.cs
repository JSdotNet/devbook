namespace Devbook.C4.CodeModel;

/// <summary>A building block's code folder and the C4 element it documents.</summary>
internal sealed record CodeFolder(string Folder, string Component, string Block);

/// <summary>What the generator reads from the repository's devbook: code folders and aliases.</summary>
internal sealed class DevbookFolder
{
    public required IReadOnlyList<CodeFolder> CodeFolders { get; init; }

    /// <summary>Every alias a domain/ chapter carries; null when domain/ is not adopted.</summary>
    public required IReadOnlySet<string>? Aliases { get; init; }

    public required string GeneratedFolder { get; init; }

    public static DevbookFolder Read(string root, Report report)
    {
        var devbook = Path.Combine(root, ".devbook");
        var folders = new List<CodeFolder>();
        var blocks = Path.Combine(devbook, "arc42", "building-blocks");
        if (Directory.Exists(blocks))
        {
            foreach (var file in Directory.EnumerateFiles(blocks, "*.md", SearchOption.AllDirectories).Order(StringComparer.Ordinal))
            {
                var block = Relative(root, file);
                // `code` sits on the block's top-level meta block only, beside the `c4` it maps to.
                var meta = MetaBlocks(File.ReadAllText(file)).FirstOrDefault();
                if (meta is null) continue;
                var code = List(meta, "code");
                if (code.Count == 0) continue;
                var c4 = List(meta, "c4");
                if (c4.Count == 0)
                {
                    report.Add("no-element", $"{block} lists `code` but names no `c4` element; its types are left out");
                    continue;
                }
                if (c4.Count > 1)
                    report.Add("several-elements", $"{block} names {c4.Count} `c4` elements; its code is drawn under the first, {c4[0]}");
                folders.AddRange(code.Select(f => new CodeFolder(f.Replace('\\', '/').TrimEnd('/'), c4[0], block)));
            }
        }

        HashSet<string>? aliases = null;
        var domain = Path.Combine(devbook, "domain");
        if (Directory.Exists(domain))
        {
            aliases = new HashSet<string>(StringComparer.Ordinal);
            foreach (var file in Directory.EnumerateFiles(domain, "*.md", SearchOption.AllDirectories))
            {
                if (Relative(root, file).Contains("/_meta/", StringComparison.Ordinal)) continue;
                foreach (var meta in MetaBlocks(File.ReadAllText(file)))
                    aliases.UnionWith(List(meta, "aliases"));
            }
        }
        else
        {
            report.Add("no-domain", ".devbook/domain/ is not adopted, so no type's class name is checked against `aliases`");
        }

        return new DevbookFolder
        {
            CodeFolders = folders,
            Aliases = aliases,
            GeneratedFolder = Path.Combine(devbook, "arc42", "c4", "generated"),
        };
    }

    public static string Relative(string root, string file) => Path.GetRelativePath(root, file).Replace('\\', '/');

    // The body of every ```meta fence, as key/value lines.
    private static IEnumerable<Dictionary<string, string>> MetaBlocks(string text)
    {
        Dictionary<string, string>? open = null;
        foreach (var raw in text.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.Trim();
            if (open is null)
            {
                if (line == "```meta") open = new Dictionary<string, string>(StringComparer.Ordinal);
                continue;
            }
            if (line.StartsWith("```", StringComparison.Ordinal))
            {
                yield return open;
                open = null;
                continue;
            }
            var colon = line.IndexOf(':');
            if (colon > 0) open[line[..colon].Trim()] = line[(colon + 1)..].Trim();
        }
    }

    // A flow list, `["a", "b"]` or `[a, b]`, as its plain strings.
    private static List<string> List(Dictionary<string, string> meta, string key)
    {
        if (!meta.TryGetValue(key, out var value)) return [];
        value = value.Trim();
        if (!value.StartsWith('[') || !value.EndsWith(']')) return value.Length == 0 ? [] : [Unquote(value)];
        return value[1..^1]
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(Unquote)
            .Where(v => v.Length > 0)
            .ToList();
    }

    private static string Unquote(string value) =>
        value.Length >= 2 && (value[0] == '"' || value[0] == '\'') && value[^1] == value[0] ? value[1..^1] : value;
}
