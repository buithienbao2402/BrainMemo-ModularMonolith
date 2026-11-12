using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;

/// <summary>
/// Consumes a one-time email verification token and marks the account email as verified (FR-IDN-02).
/// </summary>
public sealed record VerifyEmailCommand(string? Token) : ICommand
{
    public override string ToString()
        => "VerifyEmailCommand { Token = [REDACTED] }";
}
