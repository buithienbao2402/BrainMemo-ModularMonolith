using BrainMemo.SharedKernel.Events;

namespace BrainMemo.BuildingBlocks.Abstractions.Events;

/// <summary>
/// In-process event bus for publishing integration events after commit (contracts/README.md §2).
/// </summary>
public interface IEventBus
{
    Task Publish(IntegrationEvent @event, CancellationToken ct = default);
}
