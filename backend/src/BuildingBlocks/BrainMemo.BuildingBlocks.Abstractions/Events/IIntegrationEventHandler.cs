using BrainMemo.SharedKernel.Events;

namespace BrainMemo.BuildingBlocks.Abstractions.Events;

/// <summary>
/// Handles a specific <see cref="IntegrationEvent"/> delivered via in-process event bus or outbox dispatcher.
/// Implementations must be idempotent by <see cref="IntegrationEvent.EventId"/>.
/// </summary>
public interface IIntegrationEventHandler<in TEvent>
    where TEvent : IntegrationEvent
{
    Task HandleAsync(TEvent @event, CancellationToken ct = default);
}
