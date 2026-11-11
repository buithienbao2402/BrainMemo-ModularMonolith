using BrainMemo.SharedKernel.Events;

namespace BrainMemo.BuildingBlocks.Abstractions.Outbox;

/// <summary>
/// Writes integration events to the owning module's transactional outbox store so they commit atomically
/// with domain changes and are dispatched only after commit.
/// </summary>
public interface IOutboxWriter
{
    Task WriteAsync(
        string moduleName,
        Guid aggregateId,
        IntegrationEvent @event,
        CancellationToken ct = default);

    Task WriteAsync(
        Guid aggregateId,
        IntegrationEvent @event,
        CancellationToken ct = default);
}
