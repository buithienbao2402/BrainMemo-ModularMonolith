namespace BrainMemo.SharedKernel.Events;

/// <summary>
/// Base integration event shared across module contracts (contracts/README.md §1, events.md).
/// </summary>
public abstract record IntegrationEvent(Guid EventId, DateTimeOffset OccurredAt);
