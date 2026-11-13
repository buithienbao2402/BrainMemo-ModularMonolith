using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Commands.Refresh;

/// <summary>
/// Rotates an existing refresh token session and issues new access/refresh tokens (FR-IDN-05 / §3.1.6.3).
/// </summary>
public sealed record RefreshTokenCommand(
    string? RawRefreshToken,
    string? UserAgent = null,
    string? IpAddress = null) : ICommand<AuthTokensResult>
{
    public override string ToString()
        => $"RefreshTokenCommand {{ RawRefreshToken = [REDACTED], UserAgent = {UserAgent}, IpAddress = {IpAddress} }}";
}
