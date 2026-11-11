using System.Xml.Linq;
using Architecture.Tests.Support;

namespace Architecture.Tests.Rules;

/// <summary>
/// Validates MSBuild &lt;ProjectReference&gt; edges in .csproj files against REPO_STRUCTURE §2.
/// </summary>
public static class ProjectReferenceRuleValidator
{
    public static IReadOnlyList<string> ValidateCsprojFiles(IEnumerable<string> csprojPaths)
    {
        ArgumentNullException.ThrowIfNull(csprojPaths);

        List<string> violations = [];

        foreach (string csprojPath in csprojPaths)
        {
            string sourceProjectName = Path.GetFileNameWithoutExtension(csprojPath);
            if (!ModuleArchitectureSpec.TryDescribe(sourceProjectName, out BrainMemoAssemblyDescriptor? sourceDescriptor)
                || sourceDescriptor is null)
            {
                violations.Add($"Unrecognized project '{sourceProjectName}' at '{csprojPath}' does not match REPO_STRUCTURE §3 naming.");
                continue;
            }

            XDocument doc = XDocument.Load(csprojPath);
            IEnumerable<string> includePaths = doc
                .Descendants()
                .Where(static element => string.Equals(element.Name.LocalName, "ProjectReference", StringComparison.Ordinal))
                .Select(static element => (string?)element.Attribute("Include"))
                .Where(static include => !string.IsNullOrWhiteSpace(include))
                .Select(static include => include!);

            foreach (string includePath in includePaths)
            {
                string normalized = includePath.Replace('\\', Path.DirectorySeparatorChar).Replace('/', Path.DirectorySeparatorChar);
                string targetProjectName = Path.GetFileNameWithoutExtension(normalized);

                if (!ModuleArchitectureSpec.IsAllowedReference(sourceProjectName, targetProjectName))
                {
                    violations.Add(
                        $"Forbidden ProjectReference: '{sourceProjectName}' ({sourceDescriptor.Layer}) -> '{targetProjectName}'.");
                }
            }
        }

        return violations;
    }
}

