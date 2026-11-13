using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.ForgotPassword;

/// <summary>
/// Initiates password reset for a user email and emits PasswordResetRequested event with in-memory raw token (FR-IDN-07).
/// </summary>
public sealed record ForgotPasswordCommand(string? Email) : ICommand
{
    public override string ToString()
        => "ForgotPasswordCommand { Email = [REDACTED] }";
}
