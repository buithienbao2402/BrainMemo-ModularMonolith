namespace BrainMemo.Identity.Contracts;

/// <summary>
/// Current account lock and email verification state returned across module boundaries.
/// </summary>
public sealed record AccountStatusDto(
    string Status,
    DateTimeOffset? LockedUntil,
    string? LockReason,
    bool EmailVerified);

