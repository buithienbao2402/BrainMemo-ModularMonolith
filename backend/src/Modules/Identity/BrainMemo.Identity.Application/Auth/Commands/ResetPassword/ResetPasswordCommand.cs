using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.ResetPassword;

/// <summary>
/// Consumes a one-time password reset token, updates the password hash, and revokes all active sessions.
/// </summary>
public sealed record ResetPasswordCommand(string? Token, string? NewPassword) : ICommand
{
    public override string ToString()
        => "ResetPasswordCommand { Token = [REDACTED], NewPassword = [REDACTED] }";
}
