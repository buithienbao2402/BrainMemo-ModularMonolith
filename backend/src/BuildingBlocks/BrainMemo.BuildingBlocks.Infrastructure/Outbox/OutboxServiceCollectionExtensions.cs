using System.Reflection;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// DI registration helpers for shared table-agnostic outbox writing, store binding, and hosted dispatching.
/// </summary>
public static class OutboxServiceCollectionExtensions
{
    public static IServiceCollection AddOutboxCore(
        this IServiceCollection services,
        params Assembly[] eventAssemblies)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddOptions<OutboxOptions>();
        services.TryAddSingleton<IOutboxDeliveryTracker, InMemoryOutboxDeliveryTracker>();
        services.TryAddSingleton<IOutboxEventTypeRegistry>(_ => new OutboxEventTypeRegistry(eventAssemblies));
        services.TryAddScoped<IOutboxWriter, OutboxWriter>();

        return services;
    }

    public static IServiceCollection AddOutboxDispatcher(
        this IServiceCollection services,
        IConfiguration? configuration = null)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddSingleton<IClock, Time.SystemClock>();
        services.AddOutboxCore();

        if (configuration is not null)
        {
            services.Configure<OutboxOptions>(configuration.GetSection(OutboxOptions.SectionName));
        }

        services.TryAddSingleton<OutboxDispatcher>();
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService, OutboxDispatcher>(
            sp => sp.GetRequiredService<OutboxDispatcher>()));

        return services;
    }

    public static IServiceCollection AddOutboxStore<TDbContext>(
        this IServiceCollection services,
        string moduleName)
        where TDbContext : DbContext
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentException.ThrowIfNullOrWhiteSpace(moduleName);

        string normalized = moduleName.Trim();
        services.AddScoped<IOutboxStore>(
            sp => new EfOutboxStore<TDbContext>(sp.GetRequiredService<TDbContext>(), normalized));

        return services;
    }
}
