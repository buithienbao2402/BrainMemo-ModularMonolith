using System.Reflection;
using Architecture.Tests.Support;
using NetArchTest.Rules;

namespace Architecture.Tests.Rules;

/// <summary>
/// Evaluates all REPO_STRUCTURE §2 NetArchTest, assembly reference, DbContext, and MODERATION_REVIEW rules.
/// </summary>
public static class ArchitectureRuleRunner
{
    private static readonly ModerationReviewPurposeRule ModerationPurposeRule = new();

    public static IReadOnlyList<string> ValidateAssemblies(
        IEnumerable<Assembly> assemblies,
        IEnumerable<string>? additionalSearchDirectories = null)
    {
        ArgumentNullException.ThrowIfNull(assemblies);

        Assembly[] targetAssemblies = assemblies.ToArray();
        string[] searchDirectories = SolutionDiscovery.BuildSearchDirectories(targetAssemblies)
            .Concat(additionalSearchDirectories ?? [])
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        List<string> violations = [];

        foreach (Assembly assembly in targetAssemblies)
        {
            string assemblyName = assembly.GetName().Name ?? string.Empty;
            if (!ModuleArchitectureSpec.TryDescribe(assemblyName, out BrainMemoAssemblyDescriptor? descriptor)
                || descriptor is null)
            {
                violations.Add($"Unrecognized BrainMemo assembly '{assemblyName}'.");
                continue;
            }

            ValidateAssemblyReferences(assembly, assemblyName, descriptor, violations);
            ValidateNetArchDependencies(assembly, assemblyName, searchDirectories, violations);
            ValidateModerationReviewUsage(assembly, assemblyName, searchDirectories, violations);

            if (descriptor.Layer == AssemblyLayerKind.ModuleInfrastructure)
            {
                violations.AddRange(ModuleDbContextRule.ValidateModuleInfrastructure(assembly));
            }
        }

        return violations;
    }

    public static TestResult EvaluateForbiddenDependenciesWithNetArchTest(
        Assembly assembly,
        IEnumerable<string> searchDirectories)
    {
        ArgumentNullException.ThrowIfNull(assembly);
        ArgumentNullException.ThrowIfNull(searchDirectories);

        string assemblyName = assembly.GetName().Name ?? string.Empty;
        string[] forbidden = ModuleArchitectureSpec.GetForbiddenBrainMemoDependencies(assemblyName);

        return Types.InAssembly(assembly, searchDirectories)
            .ShouldNot()
            .HaveDependencyOnAny(forbidden)
            .GetResult();
    }

    public static TestResult EvaluateModerationReviewRuleWithNetArchTest(
        Assembly assembly,
        IEnumerable<string> searchDirectories)
    {
        ArgumentNullException.ThrowIfNull(assembly);
        ArgumentNullException.ThrowIfNull(searchDirectories);

        return Types.InAssembly(assembly, searchDirectories)
            .Should()
            .MeetCustomRule(ModerationPurposeRule)
            .GetResult();
    }

    private static void ValidateAssemblyReferences(
        Assembly assembly,
        string assemblyName,
        BrainMemoAssemblyDescriptor descriptor,
        List<string> violations)
    {
        foreach (AssemblyName referenced in assembly.GetReferencedAssemblies())
        {
            string targetName = referenced.Name ?? string.Empty;
            if (!ModuleArchitectureSpec.IsBrainMemoRuntimeAssembly(targetName))
            {
                continue;
            }

            if (!ModuleArchitectureSpec.IsAllowedReference(assemblyName, targetName))
            {
                violations.Add(
                    $"Forbidden assembly reference: '{assemblyName}' ({descriptor.Layer}) -> '{targetName}'.");
            }
        }
    }

    private static void ValidateNetArchDependencies(
        Assembly assembly,
        string assemblyName,
        string[] searchDirectories,
        List<string> violations)
    {
        TestResult result = EvaluateForbiddenDependenciesWithNetArchTest(assembly, searchDirectories);
        if (!result.IsSuccessful)
        {
            string failingTypes = FormatFailingTypeNames(result);
            violations.Add(
                $"NetArchTest dependency violation in '{assemblyName}': failing types [{failingTypes}].");
        }
    }

    private static void ValidateModerationReviewUsage(
        Assembly assembly,
        string assemblyName,
        string[] searchDirectories,
        List<string> violations)
    {
        TestResult result = EvaluateModerationReviewRuleWithNetArchTest(assembly, searchDirectories);
        if (!result.IsSuccessful)
        {
            string failingTypes = FormatFailingTypeNames(result);
            violations.Add(
                $"Rule 9 (purpose=MODERATION_REVIEW only from Moderation) violation in '{assemblyName}': failing types [{failingTypes}].");
        }
    }

    private static string FormatFailingTypeNames(TestResult result) =>
        result.FailingTypeNames is null
            ? "unknown"
            : string.Join(", ", result.FailingTypeNames);
}

