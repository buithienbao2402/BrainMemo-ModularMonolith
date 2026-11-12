using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Identity.Domain.Events;

/// <summary>
/// Domain event raised when a new user aggregate is registered.
/// </summary>
public sealed record UserRegisteredDomainEvent(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId) : IDomainEvent;

/// <summary>
/// Domain event raised when a user account transitions to a locked state.
/// </summary>
public sealed record AccountLockedDomainEvent(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    AccountStatus Status,
    DateTimeOffset? LockedUntil,
    Guid SanctionId) : IDomainEvent;

/// <summary>
/// Domain event raised when a locked user account returns to ACTIVE state.
/// </summary>
public sealed record AccountUnlockedDomainEvent(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid SanctionId,
    bool IsAutoExpired) : IDomainEvent;

