namespace Devbook.C4.CodeModel;

/// <summary>Brings the files this script owns level with what it generated, or only compares them.</summary>
internal static class Output
{
    /// <summary>
    /// The script owns code.dsl and every .mmd under code/. Writes a file that differs, removes a
    /// diagram no component produces any more, and returns every path that differed — writing
    /// nothing when <paramref name="check"/> is set.
    /// </summary>
    public static List<string> Apply(SortedDictionary<string, string> files, string folder, string root, bool check)
    {
        var drift = new List<string>();
        foreach (var (relative, content) in files)
        {
            var path = Path.Combine(folder, relative);
            var current = File.Exists(path) ? File.ReadAllText(path).Replace("\r\n", "\n") : null;
            if (current == content) continue;
            drift.Add(DevbookFolder.Relative(root, path));
            if (check) continue;
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, content);
        }

        var code = Path.Combine(folder, "code");
        if (Directory.Exists(code))
        {
            foreach (var path in Directory.EnumerateFiles(code, "*.mmd").Order(StringComparer.Ordinal))
            {
                if (files.ContainsKey($"code/{Path.GetFileName(path)}")) continue;
                drift.Add(DevbookFolder.Relative(root, path));
                if (!check) File.Delete(path);
            }
        }
        return drift;
    }
}
