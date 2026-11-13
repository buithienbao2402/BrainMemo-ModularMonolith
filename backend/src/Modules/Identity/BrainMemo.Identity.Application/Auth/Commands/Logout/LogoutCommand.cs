using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.Logout;

/// <summary>
/// Revokes current refresh session by token (FR-IDN-04).
/// </summary>
public sealed record LogoutCommand(string? RawRefreshToken) : ICommand
{
    public override string ToString()
        => "LogoutCommand { RawRefreshToken = [REDACTED] }";
}
