using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Profile.Contracts.Events;

/// <summary>
/// Emitted in-process when a user profile is updated, consumed by Discovery to refresh author read models.
/// </summary>
public sealed record ProfileUpdated(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    string DisplayName,
    string? AvatarStorageKey) : IntegrationEvent(EventId, OccurredAt);
