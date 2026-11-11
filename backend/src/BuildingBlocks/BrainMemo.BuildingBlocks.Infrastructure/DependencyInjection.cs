using System.Reflection;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.BuildingBlocks.Infrastructure.Events;
using BrainMemo.BuildingBlocks.Infrastructure.MediatR;
using BrainMemo.BuildingBlocks.Infrastructure.Time;
using BrainMemo.BuildingBlocks.Infrastructure.Transactions;
using BrainMemo.SharedKernel.Time;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BrainMemo.BuildingBlocks.Infrastructure;

/// <summary>
/// Registers shared BuildingBlocks infrastructure services and default MediatR pipeline behaviors.
/// </summary>
public static class DependencyInjection
{
    public static MediatRServiceConfiguration AddBuildingBlocksBehaviors(
        this MediatRServiceConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        configuration.AddOpenBehavior(typeof(LoggingBehavior<,>));
        configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
        configuration.AddOpenBehavior(typeof(TransactionBehavior<,>));

        return configuration;
    }

    public static IServiceCollection AddBuildingBlocksInfrastructure(
        this IServiceCollection services,
        params Assembly[] mediatRAssemblies)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddSingleton<IClock, SystemClock>();
        services.TryAddSingleton<AmbientTransactionAccessor>();
        services.TryAddSingleton<IAmbientTransactionAccessor>(
            sp => sp.GetRequiredService<AmbientTransactionAccessor>());
        services.TryAddScoped<IEventBus, InProcessEventBus>();

        Assembly[] assembliesToScan = mediatRAssemblies.Length > 0
            ? mediatRAssemblies
            : [typeof(DependencyInjection).Assembly];

        services.AddMediatR(config =>
        {
            config.RegisterServicesFromAssemblies(assembliesToScan);
            config.AddBuildingBlocksBehaviors();
        });

        services.AddValidatorsFromAssemblies(assembliesToScan, includeInternalTypes: true);

        return services;
    }
}
