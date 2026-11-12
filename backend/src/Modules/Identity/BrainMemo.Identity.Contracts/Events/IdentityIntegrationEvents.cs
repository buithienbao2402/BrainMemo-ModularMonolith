using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Identity.Contracts.Events;

/// <summary>
/// Emitted in-process after registration succeeds so Profile can create the default user profile.
/// </summary>
public sealed record UserRegistered(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId) : IntegrationEvent(EventId, OccurredAt);

/// <summary>
/// Emitted in-process (non-Outbox) with raw verification token held strictly in memory for Notification delivery.
/// </summary>
public sealed record EmailVerificationRequested(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid TokenId,
    string RawToken) : IntegrationEvent(EventId, OccurredAt);

/// <summary>
/// Emitted in-process (non-Outbox) with raw reset token held strictly in memory for Notification delivery.
/// </summary>
public sealed record PasswordResetRequested(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid TokenId,
    string RawToken) : IntegrationEvent(EventId, OccurredAt);

/// <summary>
/// Emitted after commit when a user account transitions into a locked state.
/// </summary>
public sealed record AccountLocked(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    LockType Type,
    DateTimeOffset? Until,
    Guid SanctionId) : IntegrationEvent(EventId, OccurredAt);

/// <summary>
/// Differentiates manual admin unlock vs lazy/scheduled expiry unlock on <see cref="AccountUnlocked"/>.
/// </summary>
public enum UnlockKind
{
    Manual = 0,
    AutoExpired = 1,
}

/// <summary>
/// Emitted after commit when a locked user account returns to ACTIVE state.
/// </summary>
public sealed record AccountUnlocked(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid SanctionId,
    UnlockKind Kind) : IntegrationEvent(EventId, OccurredAt);

