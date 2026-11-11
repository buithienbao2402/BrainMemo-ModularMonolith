using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Infrastructure.MediatR;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Writes serialized <see cref="IntegrationEvent"/> records into the owning module's <see cref="IOutboxStore"/>
/// within the caller's unit-of-work transaction, deduplicating by <see cref="IntegrationEvent.EventId"/>.
/// </summary>
public sealed class OutboxWriter(
    IEnumerable<IOutboxStore> stores,
    IOutboxEventTypeRegistry eventTypeRegistry,
    IClock clock,
    ILogger<OutboxWriter> logger) : IOutboxWriter
{
    private readonly Dictionary<string, IOutboxStore> _storesByModule = BuildStoreMap(stores);
    private readonly IOutboxEventTypeRegistry _eventTypeRegistry = eventTypeRegistry ?? throw new ArgumentNullException(nameof(eventTypeRegistry));
    private readonly IClock _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    private readonly ILogger<OutboxWriter> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    public async Task WriteAsync(
        string moduleName,
        Guid aggregateId,
        IntegrationEvent @event,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(moduleName);
        ArgumentNullException.ThrowIfNull(@event);

        if (aggregateId == Guid.Empty)
        {
            throw new ArgumentException("Outbox AggregateId cannot be empty.", nameof(aggregateId));
        }

        if (@event.EventId == Guid.Empty)
        {
            throw new ArgumentException("IntegrationEvent.EventId cannot be empty.", nameof(@event));
        }

        string normalizedModule = moduleName.Trim();
        if (!_storesByModule.TryGetValue(normalizedModule, out IOutboxStore? store))
        {
            throw new InvalidOperationException(
                $"No IOutboxStore is registered for module '{normalizedModule}'. Call AddOutboxStore<TDbContext>(\"{normalizedModule}\").");
        }

        if (await store.ExistsAsync(@event.EventId, ct).ConfigureAwait(false))
        {
            _logger.LogDebug(
                "Skipped duplicate outbox event {EventType} ({EventId}) in module {ModuleName}",
                @event.GetType().Name,
                @event.EventId,
                store.ModuleName);
            return;
        }

        string eventType = _eventTypeRegistry.GetEventTypeName(@event.GetType());
        string payload = OutboxJson.Serialize(@event);
        OutboxMessage message = OutboxMessage.Create(
            @event.EventId,
            eventType,
            aggregateId,
            payload,
            _clock.UtcNow);

        await store.AddAsync(message, ct).ConfigureAwait(false);
    }

    public Task WriteAsync(
        Guid aggregateId,
        IntegrationEvent @event,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        string? moduleName = TransactionBehavior<object, object>.TryExtractModuleName(@event.GetType());
        if (string.IsNullOrWhiteSpace(moduleName))
        {
            throw new InvalidOperationException(
                $"Cannot infer outbox module from event type '{@event.GetType().FullName}'. Place the event under namespace 'BrainMemo.<Module>.*' or pass moduleName explicitly.");
        }

        return WriteAsync(moduleName, aggregateId, @event, ct);
    }

    private static Dictionary<string, IOutboxStore> BuildStoreMap(IEnumerable<IOutboxStore> stores)
    {
        ArgumentNullException.ThrowIfNull(stores);

        Dictionary<string, IOutboxStore> map = new(StringComparer.OrdinalIgnoreCase);
        foreach (IOutboxStore store in stores)
        {
            if (!map.TryAdd(store.ModuleName, store))
            {
                throw new InvalidOperationException(
                    $"Duplicate IOutboxStore registration detected for module '{store.ModuleName}'.");
            }
        }

        return map;
    }
}
