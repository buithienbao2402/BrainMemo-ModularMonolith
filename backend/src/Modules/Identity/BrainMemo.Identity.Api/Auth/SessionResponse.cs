namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Session schema matching openapi/modules/identity.yaml #/components/schemas/SessionDto.
/// </summary>
public sealed record SessionResponse(
    Guid Id,
    string? UserAgent,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastUsedAt,
    bool IsCurrent);
