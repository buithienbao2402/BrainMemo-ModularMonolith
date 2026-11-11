using System.Reflection;
using System.Text.RegularExpressions;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.WebApi.Modules;

public sealed record ModuleCatalog(IReadOnlyList<string> RegisteredModules);

/// <summary>
/// Dynamically discovers BrainMemo module Api/Application/Infrastructure assemblies, registers MVC parts, MediatR handlers, and IModule installers.
/// </summary>
public static partial class ModuleRegistry
{
    [GeneratedRegex(@"^BrainMemo\.(?!SharedKernel$|BuildingBlocks\.|WebApi$)[^.]+\.(Api|Application|Infrastructure)$", RegexOptions.CultureInvariant)]
    private static partial Regex ModuleAssemblyPattern();

    public static IServiceCollection AddBrainMemoModules(
        this IServiceCollection services,
        IMvcBuilder mvcBuilder,
        IConfiguration configuration,
        params Assembly[] additionalAssemblies)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(mvcBuilder);
        ArgumentNullException.ThrowIfNull(configuration);

        IReadOnlyList<Assembly> moduleAssemblies = DiscoverModuleAssemblies(additionalAssemblies);

        Assembly[] apiAssemblies = moduleAssemblies
            .Where(asm => asm.GetName().Name?.EndsWith(".Api", StringComparison.Ordinal) == true)
            .ToArray();

        foreach (Assembly apiAssembly in apiAssemblies)
        {
            mvcBuilder.AddApplicationPart(apiAssembly);
        }

        Assembly[] applicationAssemblies = moduleAssemblies
            .Where(asm => asm.GetName().Name?.EndsWith(".Application", StringComparison.Ordinal) == true)
            .Concat(additionalAssemblies)
            .Distinct()
            .ToArray();

        services.AddBuildingBlocksInfrastructure(applicationAssemblies);

        List<string> registeredNames = [];
        IModule[] modules = moduleAssemblies
            .Concat(additionalAssemblies)
            .Distinct()
            .SelectMany(GetLoadableTypes)
            .Where(type => typeof(IModule).IsAssignableFrom(type)
                && type is { IsInterface: false, IsAbstract: false }
                && type.GetConstructor(Type.EmptyTypes) is not null)
            .Select(type => (IModule)Activator.CreateInstance(type)!)
            .OrderBy(module => module.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (IModule module in modules)
        {
            module.RegisterServices(services, configuration);
            registeredNames.Add(module.Name);
        }

        services.AddSingleton(new ModuleCatalog(registeredNames));

        return services;
    }

    private static IReadOnlyList<Assembly> DiscoverModuleAssemblies(Assembly[] additionalAssemblies)
    {
        Dictionary<string, Assembly> discovered = new(StringComparer.OrdinalIgnoreCase);

        foreach (Assembly loaded in AppDomain.CurrentDomain.GetAssemblies().Concat(additionalAssemblies))
        {
            string? name = loaded.GetName().Name;
            if (!string.IsNullOrWhiteSpace(name) && ModuleAssemblyPattern().IsMatch(name))
            {
                discovered.TryAdd(name, loaded);
            }
        }

        string baseDir = AppContext.BaseDirectory;
        if (Directory.Exists(baseDir))
        {
            foreach (string dllPath in Directory.EnumerateFiles(baseDir, "BrainMemo.*.dll", SearchOption.TopDirectoryOnly))
            {
                string fileNameWithoutExt = Path.GetFileNameWithoutExtension(dllPath);
                if (!ModuleAssemblyPattern().IsMatch(fileNameWithoutExt) || discovered.ContainsKey(fileNameWithoutExt))
                {
                    continue;
                }

                Assembly loaded = Assembly.Load(new AssemblyName(fileNameWithoutExt));
                discovered.TryAdd(fileNameWithoutExt, loaded);
            }
        }

        return discovered.Values.ToArray();
    }

    private static IEnumerable<Type> GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(type => type is not null)!;
        }
    }
}

