using System.Reflection;

namespace Architecture.Tests.Support;

/// <summary>
/// Locates the repository root, source .csproj files, schema.sql, and built BrainMemo runtime assemblies.
/// </summary>
public static class SolutionDiscovery
{
    public static string FindRepositoryRoot()
    {
        DirectoryInfo? dir = new(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "backend", "BrainMemo.sln")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate repository root containing backend/BrainMemo.sln.");
    }

    public static IReadOnlyList<string> DiscoverSourceCsprojFiles(string repoRoot)
    {
        string backendSrc = Path.Combine(repoRoot, "backend", "src");
        if (!Directory.Exists(backendSrc))
        {
            return [];
        }

        return Directory.EnumerateFiles(backendSrc, "*.csproj", SearchOption.AllDirectories)
            .Where(path => !IsBuildArtifactPath(path))
            .OrderBy(static path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static IReadOnlyList<Assembly> DiscoverBrainMemoRuntimeAssemblies(string repoRoot)
    {
        Dictionary<string, Assembly> loaded = new(StringComparer.OrdinalIgnoreCase);

        foreach (Assembly existing in AppDomain.CurrentDomain.GetAssemblies())
        {
            string? name = existing.GetName().Name;
            if (!string.IsNullOrWhiteSpace(name)
                && ModuleArchitectureSpec.IsBrainMemoRuntimeAssembly(name)
                && !string.IsNullOrWhiteSpace(existing.Location)
                && IsUnderSolutionOrAppBase(existing.Location, repoRoot))
            {
                loaded.TryAdd(name, existing);
            }
        }

        LoadMatchingDllsFromDirectory(AppContext.BaseDirectory, SearchOption.TopDirectoryOnly, loaded);

        string configuration = DetectBuildConfiguration();
        string modulesDir = Path.Combine(repoRoot, "backend", "src", "Modules");
        if (Directory.Exists(modulesDir))
        {
            foreach (string dllPath in Directory.EnumerateFiles(modulesDir, "BrainMemo.*.dll", SearchOption.AllDirectories))
            {
                if (IsBuildArtifactReferenceOrObj(dllPath) || !MatchesConfigurationSegment(dllPath, configuration))
                {
                    continue;
                }

                TryLoadAssembly(dllPath, loaded);
            }
        }

        return loaded.Values
            .OrderBy(static asm => asm.GetName().Name, StringComparer.Ordinal)
            .ToArray();
    }

    public static IReadOnlyList<string> BuildSearchDirectories(IEnumerable<Assembly> assemblies)
    {
        HashSet<string> dirs = new(StringComparer.OrdinalIgnoreCase)
        {
            AppContext.BaseDirectory,
        };

        foreach (Assembly assembly in assemblies)
        {
            if (!string.IsNullOrWhiteSpace(assembly.Location))
            {
                string? dir = Path.GetDirectoryName(assembly.Location);
                if (!string.IsNullOrWhiteSpace(dir))
                {
                    dirs.Add(dir);
                }
            }
        }

        return dirs.ToArray();
    }

    private static void LoadMatchingDllsFromDirectory(
        string directory,
        SearchOption searchOption,
        Dictionary<string, Assembly> loaded)
    {
        if (!Directory.Exists(directory))
        {
            return;
        }

        foreach (string dllPath in Directory.EnumerateFiles(directory, "BrainMemo.*.dll", searchOption))
        {
            TryLoadAssembly(dllPath, loaded);
        }
    }

    private static void TryLoadAssembly(string dllPath, Dictionary<string, Assembly> loaded)
    {
        string name = Path.GetFileNameWithoutExtension(dllPath);
        if (!ModuleArchitectureSpec.IsBrainMemoRuntimeAssembly(name) || loaded.ContainsKey(name))
        {
            return;
        }

        Assembly assembly = Assembly.LoadFrom(dllPath);
        loaded.TryAdd(name, assembly);
    }

    private static string DetectBuildConfiguration()
    {
        string location = typeof(SolutionDiscovery).Assembly.Location;
        return location.Contains($"{Path.DirectorySeparatorChar}Release{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase)
            ? "Release"
            : "Debug";
    }

    private static bool MatchesConfigurationSegment(string path, string configuration) =>
        path.Contains($"{Path.DirectorySeparatorChar}{configuration}{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase);

    private static bool IsBuildArtifactPath(string path) =>
        path.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase)
        || path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase);

    private static bool IsUnderSolutionOrAppBase(string location, string repoRoot) =>
        location.StartsWith(AppContext.BaseDirectory, StringComparison.OrdinalIgnoreCase)
        || location.StartsWith(repoRoot, StringComparison.OrdinalIgnoreCase);

    private static bool IsBuildArtifactReferenceOrObj(string path) =>
        path.Contains($"{Path.DirectorySeparatorChar}ref{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase)
        || path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase);
}
