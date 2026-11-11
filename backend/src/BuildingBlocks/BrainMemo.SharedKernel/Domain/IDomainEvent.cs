namespace BrainMemo.SharedKernel.Domain;

/// <summary>
/// Marker interface for domain events raised by aggregates within a single module boundary.
/// </summary>
public interface IDomainEvent
{
    Guid EventId { get; }

    DateTimeOffset OccurredAt { get; }
}
