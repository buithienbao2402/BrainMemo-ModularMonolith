namespace Architecture.Tests.Support;

public enum AssemblyLayerKind
{
    Unknown = 0,
    SharedKernel,
    BuildingBlocksAbstractions,
    BuildingBlocksInfrastructure,
    HostWebApi,
    ModuleContracts,
    ModuleDomain,
    ModuleApplication,
    ModuleInfrastructure,
    ModuleApi,
}

public sealed record BrainMemoAssemblyDescriptor(
    string AssemblyName,
    AssemblyLayerKind Layer,
    string? ModuleName,
    string? TablePrefix);

/// <summary>
/// Canonical catalog of BrainMemo modules, table prefixes, and allowed layer dependencies from REPO_STRUCTURE.md §2.
/// </summary>
public static class ModuleArchitectureSpec
{
    public const string SharedKernelAssembly = "BrainMemo.SharedKernel";
    public const string AbstractionsAssembly = "BrainMemo.BuildingBlocks.Abstractions";
    public const string BuildingBlocksInfrastructureAssembly = "BrainMemo.BuildingBlocks.Infrastructure";
    public const string WebApiAssembly = "BrainMemo.WebApi";

    public static IReadOnlyDictionary<string, string> ModuleTablePrefixes { get; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Identity"] = "idn_",
            ["Profile"] = "prf_",
            ["Moderation"] = "mod_",
            ["Notification"] = "ntf_",
            ["Course"] = "crs_",
            ["Content"] = "cnt_",
            ["Learning"] = "lrn_",
            ["Assessment"] = "ast_",
            ["Discovery"] = "dsc_",
            ["AI"] = "ai_",
        };

    public static IReadOnlyList<string> AllModuleNames { get; } =
        ModuleTablePrefixes.Keys.OrderBy(static m => m, StringComparer.Ordinal).ToArray();

    private static readonly IReadOnlyDictionary<string, AssemblyLayerKind> LayerSuffixMap =
        new Dictionary<string, AssemblyLayerKind>(StringComparer.Ordinal)
        {
            ["Contracts"] = AssemblyLayerKind.ModuleContracts,
            ["Domain"] = AssemblyLayerKind.ModuleDomain,
            ["Application"] = AssemblyLayerKind.ModuleApplication,
            ["Infrastructure"] = AssemblyLayerKind.ModuleInfrastructure,
            ["Api"] = AssemblyLayerKind.ModuleApi,
        };

    public static bool TryDescribe(string assemblyName, out BrainMemoAssemblyDescriptor? descriptor)
    {
        descriptor = assemblyName switch
        {
            SharedKernelAssembly => new BrainMemoAssemblyDescriptor(assemblyName, AssemblyLayerKind.SharedKernel, null, null),
            AbstractionsAssembly => new BrainMemoAssemblyDescriptor(assemblyName, AssemblyLayerKind.BuildingBlocksAbstractions, null, null),
            BuildingBlocksInfrastructureAssembly => new BrainMemoAssemblyDescriptor(assemblyName, AssemblyLayerKind.BuildingBlocksInfrastructure, null, null),
            WebApiAssembly => new BrainMemoAssemblyDescriptor(assemblyName, AssemblyLayerKind.HostWebApi, null, null),
            _ => TryParseModuleAssembly(assemblyName),
        };

        return descriptor is not null;
    }

    public static bool IsBrainMemoRuntimeAssembly(string assemblyName) =>
        assemblyName.StartsWith("BrainMemo.", StringComparison.Ordinal)
        && !assemblyName.EndsWith(".Tests", StringComparison.OrdinalIgnoreCase);

    public static bool IsModerationAssembly(string assemblyName) =>
        TryDescribe(assemblyName, out BrainMemoAssemblyDescriptor? descriptor)
        && string.Equals(descriptor!.ModuleName, "Moderation", StringComparison.OrdinalIgnoreCase);

    public static bool IsCourseAssembly(string assemblyName) =>
        TryDescribe(assemblyName, out BrainMemoAssemblyDescriptor? descriptor)
        && string.Equals(descriptor!.ModuleName, "Course", StringComparison.OrdinalIgnoreCase);

    public static bool IsAllowedReference(string sourceAssemblyName, string targetAssemblyName)
    {
        if (string.Equals(sourceAssemblyName, targetAssemblyName, StringComparison.Ordinal))
        {
            return true;
        }

        if (!IsBrainMemoRuntimeAssembly(targetAssemblyName))
        {
            return true;
        }

        if (!TryDescribe(sourceAssemblyName, out BrainMemoAssemblyDescriptor? source) || source is null)
        {
            return false;
        }

        if (!TryDescribe(targetAssemblyName, out BrainMemoAssemblyDescriptor? target) || target is null)
        {
            return false;
        }

        return IsAllowedDescriptorReference(source, target);
    }

    public static string[] GetForbiddenBrainMemoDependencies(string sourceAssemblyName)
    {
        if (!TryDescribe(sourceAssemblyName, out BrainMemoAssemblyDescriptor? source) || source is null)
        {
            return [];
        }

        List<string> allKnownTargets =
        [
            SharedKernelAssembly,
            AbstractionsAssembly,
            BuildingBlocksInfrastructureAssembly,
            WebApiAssembly,
        ];

        foreach (string moduleName in AllModuleNames)
        {
            foreach (string layerSuffix in LayerSuffixMap.Keys)
            {
                allKnownTargets.Add($"BrainMemo.{moduleName}.{layerSuffix}");
            }
        }

        return allKnownTargets
            .Where(targetName => !string.Equals(targetName, sourceAssemblyName, StringComparison.Ordinal)
                && !IsAllowedReference(sourceAssemblyName, targetName))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(static name => name, StringComparer.Ordinal)
            .ToArray();
    }

    private static BrainMemoAssemblyDescriptor? TryParseModuleAssembly(string assemblyName)
    {
        if (!assemblyName.StartsWith("BrainMemo.", StringComparison.Ordinal))
        {
            return null;
        }

        string remainder = assemblyName["BrainMemo.".Length..];
        int dotIndex = remainder.IndexOf('.', StringComparison.Ordinal);
        if (dotIndex <= 0)
        {
            return null;
        }

        string moduleName = remainder[..dotIndex];
        string layerSuffix = remainder[(dotIndex + 1)..];
        if (!ModuleTablePrefixes.TryGetValue(moduleName, out string? tablePrefix)
            || !LayerSuffixMap.TryGetValue(layerSuffix, out AssemblyLayerKind layer))
        {
            return null;
        }

        return new BrainMemoAssemblyDescriptor(assemblyName, layer, moduleName, tablePrefix);
    }

    private static bool IsAllowedDescriptorReference(
        BrainMemoAssemblyDescriptor source,
        BrainMemoAssemblyDescriptor target)
    {
        bool sameModule = string.Equals(source.ModuleName, target.ModuleName, StringComparison.Ordinal);

        return source.Layer switch
        {
            AssemblyLayerKind.SharedKernel => false,

            AssemblyLayerKind.BuildingBlocksAbstractions =>
                target.Layer == AssemblyLayerKind.SharedKernel,

            AssemblyLayerKind.BuildingBlocksInfrastructure =>
                target.Layer is AssemblyLayerKind.SharedKernel or AssemblyLayerKind.BuildingBlocksAbstractions,

            // Rule 1: *.Contracts cannot reference any project other than SharedKernel.
            AssemblyLayerKind.ModuleContracts =>
                target.Layer == AssemblyLayerKind.SharedKernel,

            // Rule 2: Domain cannot reference anything other than SharedKernel.
            AssemblyLayerKind.ModuleDomain =>
                target.Layer == AssemblyLayerKind.SharedKernel,

            // Rule 3 & 6: Application -> own Domain, Contracts (own + other modules), Abstractions, SharedKernel.
            AssemblyLayerKind.ModuleApplication =>
                target.Layer is AssemblyLayerKind.SharedKernel or AssemblyLayerKind.BuildingBlocksAbstractions
                || target.Layer == AssemblyLayerKind.ModuleContracts
                || (sameModule && target.Layer == AssemblyLayerKind.ModuleDomain),

            // Rule 4 & 6: Infrastructure -> own Application & Domain, BuildingBlocks, Contracts; never Api/WebApi or foreign Application/Domain/Infrastructure/Api.
            AssemblyLayerKind.ModuleInfrastructure =>
                target.Layer is AssemblyLayerKind.SharedKernel
                    or AssemblyLayerKind.BuildingBlocksAbstractions
                    or AssemblyLayerKind.BuildingBlocksInfrastructure
                    or AssemblyLayerKind.ModuleContracts
                || (sameModule && target.Layer is AssemblyLayerKind.ModuleApplication or AssemblyLayerKind.ModuleDomain),

            // Rule 5 & 6: Api -> own Application, Contracts, Abstractions, SharedKernel.
            AssemblyLayerKind.ModuleApi =>
                target.Layer is AssemblyLayerKind.SharedKernel
                    or AssemblyLayerKind.BuildingBlocksAbstractions
                    or AssemblyLayerKind.ModuleContracts
                || (sameModule && target.Layer == AssemblyLayerKind.ModuleApplication),

            // Rule 5 Host: Host references BuildingBlocks and module Api + Infrastructure (+ Contracts), not direct Domain/Application coupling.
            AssemblyLayerKind.HostWebApi =>
                target.Layer is AssemblyLayerKind.SharedKernel
                    or AssemblyLayerKind.BuildingBlocksAbstractions
                    or AssemblyLayerKind.BuildingBlocksInfrastructure
                    or AssemblyLayerKind.ModuleApi
                    or AssemblyLayerKind.ModuleInfrastructure
                    or AssemblyLayerKind.ModuleContracts,

            _ => false,
        };
    }
}

