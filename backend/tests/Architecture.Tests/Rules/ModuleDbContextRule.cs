using System.Reflection;
using Architecture.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Architecture.Tests.Rules;

/// <summary>
/// Validates REPO_STRUCTURE §2 rules 4 & 8 on module Infrastructure assemblies:
/// each DbContext maps only tables with the module prefix and has migrations in Infrastructure/Migrations.
/// </summary>
public static class ModuleDbContextRule
{
    public static IReadOnlyList<string> ValidateModuleInfrastructure(Assembly assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        string assemblyName = assembly.GetName().Name ?? string.Empty;
        if (!ModuleArchitectureSpec.TryDescribe(assemblyName, out BrainMemoAssemblyDescriptor? descriptor)
            || descriptor is null
            || descriptor.Layer != AssemblyLayerKind.ModuleInfrastructure
            || string.IsNullOrEmpty(descriptor.ModuleName)
            || string.IsNullOrEmpty(descriptor.TablePrefix))
        {
            return [];
        }

        List<string> violations = [];
        Type[] allTypes = GetLoadableTypes(assembly);

        Type[] dbContextTypes = allTypes
            .Where(static type => typeof(DbContext).IsAssignableFrom(type)
                && type is { IsAbstract: false, IsInterface: false, IsGenericTypeDefinition: false })
            .ToArray();

        if (dbContextTypes.Length == 0)
        {
            return violations;
        }

        string expectedMigrationsPrefix = $"{assemblyName}.Migrations";
        bool hasMigration = allTypes.Any(type => typeof(Migration).IsAssignableFrom(type)
            && type is { IsAbstract: false, IsInterface: false }
            && !string.IsNullOrWhiteSpace(type.Namespace)
            && (string.Equals(type.Namespace, expectedMigrationsPrefix, StringComparison.Ordinal)
                || type.Namespace.StartsWith($"{expectedMigrationsPrefix}.", StringComparison.Ordinal)));

        if (!hasMigration)
        {
            violations.Add(
                $"{assemblyName}: defines DbContext ({string.Join(", ", dbContextTypes.Select(static t => t.Name))}) without any EF Core Migration in namespace '{expectedMigrationsPrefix}'.");
        }

        foreach (Type dbContextType in dbContextTypes)
        {
            using DbContext context = CreateInMemoryDbContext(dbContextType);
            foreach (IEntityType entityType in context.Model.GetEntityTypes())
            {
                string? tableName = entityType.GetTableName();
                if (string.IsNullOrWhiteSpace(tableName))
                {
                    violations.Add(
                        $"{assemblyName} ({dbContextType.Name}): entity '{entityType.ClrType.Name}' has no mapped relational table name starting with '{descriptor.TablePrefix}'.");
                    continue;
                }

                if (!tableName.StartsWith(descriptor.TablePrefix, StringComparison.Ordinal))
                {
                    violations.Add(
                        $"{assemblyName} ({dbContextType.Name}): entity '{entityType.ClrType.Name}' maps table '{tableName}', expected prefix '{descriptor.TablePrefix}'.");
                }
            }
        }

        return violations;
    }

    private static DbContext CreateInMemoryDbContext(Type dbContextType)
    {
        ConstructorInfo? typedOptionsCtor = dbContextType.GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .FirstOrDefault(ctor =>
            {
                ParameterInfo[] parameters = ctor.GetParameters();
                return parameters.Length == 1
                    && parameters[0].ParameterType.IsGenericType
                    && parameters[0].ParameterType.GetGenericTypeDefinition() == typeof(DbContextOptions<>);
            });

        if (typedOptionsCtor is not null)
        {
            Type optionsBuilderType = typeof(DbContextOptionsBuilder<>).MakeGenericType(dbContextType);
            DbContextOptionsBuilder optionsBuilder = (DbContextOptionsBuilder)Activator.CreateInstance(optionsBuilderType)!;
            optionsBuilder.UseInMemoryDatabase($"arch-test-{dbContextType.FullName}-{Guid.NewGuid():N}");
            return (DbContext)typedOptionsCtor.Invoke([optionsBuilder.Options]);
        }

        ConstructorInfo? untypedOptionsCtor = dbContextType.GetConstructor(
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance,
            [typeof(DbContextOptions)]);

        if (untypedOptionsCtor is not null)
        {
            DbContextOptionsBuilder optionsBuilder = new();
            optionsBuilder.UseInMemoryDatabase($"arch-test-{dbContextType.FullName}-{Guid.NewGuid():N}");
            return (DbContext)untypedOptionsCtor.Invoke([optionsBuilder.Options]);
        }

        ConstructorInfo? parameterlessCtor = dbContextType.GetConstructor(
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance,
            Type.EmptyTypes);

        if (parameterlessCtor is not null)
        {
            return (DbContext)parameterlessCtor.Invoke(null);
        }

        throw new InvalidOperationException(
            $"DbContext '{dbContextType.FullName}' does not expose a supported constructor ((DbContextOptions<T>), (DbContextOptions), or ()).");
    }

    private static Type[] GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(static type => type is not null).Cast<Type>().ToArray();
        }
    }
}

