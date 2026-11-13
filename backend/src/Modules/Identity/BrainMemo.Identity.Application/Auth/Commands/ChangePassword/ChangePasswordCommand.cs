using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.ChangePassword;

/// <summary>
/// Changes the password for an authenticated user, verifies current password, and revokes all active sessions (FR-IDN-08).
/// </summary>
public sealed record ChangePasswordCommand(
    Guid UserId,
    string? CurrentPassword,
    string? NewPassword) : ICommand
{
    public override string ToString()
        => $"ChangePasswordCommand {{ UserId = {UserId}, CurrentPassword = [REDACTED], NewPassword = [REDACTED] }}";
}
