using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Queries.ListSessions;

/// <summary>
/// Retrieves all active sessions for the specified user and marks the caller's current session (FR-IDN-09).
/// </summary>
public sealed record ListSessionsQuery(
    Guid UserId,
    string? RawRefreshToken = null) : IQuery<IReadOnlyList<SessionDto>>
{
    public override string ToString()
        => $"ListSessionsQuery {{ UserId = {UserId}, RawRefreshToken = [REDACTED] }}";
}
