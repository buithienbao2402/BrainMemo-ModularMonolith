namespace BrainMemo.Identity.Application.Auth.Models;

/// <summary>
/// Session details matching openapi/modules/identity.yaml #/components/schemas/SessionDto.
/// </summary>
public sealed record SessionDto(
    Guid Id,
    string? UserAgent,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastUsedAt,
    bool IsCurrent);
