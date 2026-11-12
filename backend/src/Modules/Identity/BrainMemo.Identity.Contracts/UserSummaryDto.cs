namespace BrainMemo.Identity.Contracts;

/// <summary>
/// Lightweight user identity summary for Profile, Notification, and Moderation modules.
/// </summary>
public sealed record UserSummaryDto(
    Guid Id,
    string Status,
    DateTimeOffset CreatedAt,
    string Email);

