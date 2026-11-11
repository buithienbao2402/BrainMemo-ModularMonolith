using System.Collections.Concurrent;
using System.Reflection;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.SharedKernel.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BrainMemo.BuildingBlocks.Infrastructure.Events;

/// <summary>
/// Dispatches integration events in-process after commit to all registered <see cref="IIntegrationEventHandler{TEvent}"/> instances.
/// </summary>
public sealed class InProcessEventBus(
    IServiceProvider serviceProvider,
    ILogger<InProcessEventBus> logger) : IEventBus
{
    private static readonly ConcurrentDictionary<Type, Func<IServiceProvider, IntegrationEvent, ILogger, CancellationToken, Task>> Dispatchers = new();

    public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        Type eventType = @event.GetType();
        Func<IServiceProvider, IntegrationEvent, ILogger, CancellationToken, Task> dispatcher = Dispatchers.GetOrAdd(
            eventType,
            static type =>
            {
                MethodInfo method = typeof(InProcessEventBus)
                    .GetMethod(nameof(DispatchTypedAsync), BindingFlags.NonPublic | BindingFlags.Static)!
                    .MakeGenericMethod(type);
                return method.CreateDelegate<Func<IServiceProvider, IntegrationEvent, ILogger, CancellationToken, Task>>();
            });

        return dispatcher(serviceProvider, @event, logger, ct);
    }

    private static async Task DispatchTypedAsync<TEvent>(
        IServiceProvider serviceProvider,
        IntegrationEvent @event,
        ILogger logger,
        CancellationToken ct)
        where TEvent : IntegrationEvent
    {
        TEvent typedEvent = (TEvent)@event;
        IIntegrationEventHandler<TEvent>[] handlers = serviceProvider
            .GetServices<IIntegrationEventHandler<TEvent>>()
            .ToArray();

        logger.LogDebug(
            "Publishing integration event {EventType} ({EventId}) to {HandlerCount} handler(s)",
            typeof(TEvent).Name,
            @event.EventId,
            handlers.Length);

        foreach (IIntegrationEventHandler<TEvent> handler in handlers)
        {
            await handler.HandleAsync(typedEvent, ct).ConfigureAwait(false);
        }
    }
}
