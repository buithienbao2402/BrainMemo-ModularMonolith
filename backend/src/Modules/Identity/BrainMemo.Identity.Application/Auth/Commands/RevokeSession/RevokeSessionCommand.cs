using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Commands.RevokeSession;

/// <summary>
/// Revokes a specific session belonging to the user (FR-IDN-09).
/// </summary>
public sealed record RevokeSessionCommand(
    Guid SessionId,
    Guid UserId,
    string? RawRefreshToken = null) : ICommand<RevokeSessionResult>
{
    public override string ToString()
        => $"RevokeSessionCommand {{ SessionId = {SessionId}, UserId = {UserId}, RawRefreshToken = [REDACTED] }}";
}
