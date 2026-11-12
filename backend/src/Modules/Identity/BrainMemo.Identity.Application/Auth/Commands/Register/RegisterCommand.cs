using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.Register;

/// <summary>
/// Registers a new password-based account and emits in-memory email verification data after commit (FR-IDN-01).
/// </summary>
public sealed record RegisterCommand(string? Email, string? Password) : ICommand
{
    public override string ToString()
        => "RegisterCommand { Email = [REDACTED], Password = [REDACTED] }";
}
