using System.Reflection;
using Architecture.Tests.Rules;
using Architecture.Tests.Support;
using Xunit;

namespace Architecture.Tests;

/// <summary>
/// Verifies REPO_STRUCTURE §2 architectural invariants across all real BrainMemo projects, assemblies, and db/schema.sql.
/// </summary>
public sealed class SolutionArchitectureTests
{
    [Fact]
    public void CoreSolutionAssemblies_AreDiscoveredAndNonEmpty()
    {
        string repoRoot = SolutionDiscovery.FindRepositoryRoot();
        IReadOnlyList<Assembly> assemblies = SolutionDiscovery.DiscoverBrainMemoRuntimeAssemblies(repoRoot);
        HashSet<string> names = assemblies
            .Select(static a => a.GetName().Name!)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains(ModuleArchitectureSpec.SharedKernelAssembly, names);
        Assert.Contains(ModuleArchitectureSpec.AbstractionsAssembly, names);
        Assert.Contains(ModuleArchitectureSpec.BuildingBlocksInfrastructureAssembly, names);
        Assert.Contains(ModuleArchitectureSpec.WebApiAssembly, names);

        foreach (Assembly assembly in assemblies)
        {
            Assert.NotEmpty(assembly.GetTypes());
        }
    }

    [Fact]
    public void SourceCsprojFiles_ComplyWithRepoStructureDependencyRules()
    {
        string repoRoot = SolutionDiscovery.FindRepositoryRoot();
        IReadOnlyList<string> csprojFiles = SolutionDiscovery.DiscoverSourceCsprojFiles(repoRoot);

        Assert.NotEmpty(csprojFiles);
        IReadOnlyList<string> violations = ProjectReferenceRuleValidator.ValidateCsprojFiles(csprojFiles);
        Assert.Empty(violations);
    }

    [Fact]
    public void DiscoveredRuntimeAssemblies_ComplyWithNetArchTestAndModerationRules()
    {
        string repoRoot = SolutionDiscovery.FindRepositoryRoot();
        IReadOnlyList<Assembly> assemblies = SolutionDiscovery.DiscoverBrainMemoRuntimeAssemblies(repoRoot);

        Assert.NotEmpty(assemblies);
        IReadOnlyList<string> violations = ArchitectureRuleRunner.ValidateAssemblies(assemblies);
        Assert.Empty(violations);
    }

    [Fact]
    public void DatabaseSchemaSql_ContainsNoCrossModulePhysicalForeignKeys()
    {
        string repoRoot = SolutionDiscovery.FindRepositoryRoot();
        string schemaPath = Path.Combine(repoRoot, "db", "schema.sql");

        Assert.True(File.Exists(schemaPath), $"Expected baseline schema file at '{schemaPath}'.");
        string sqlContent = File.ReadAllText(schemaPath);

        IReadOnlyList<string> violations = SqlSchemaArchitectureRule.ValidateNoCrossModuleForeignKeys(sqlContent, "db/schema.sql");
        Assert.Empty(violations);
    }
}

