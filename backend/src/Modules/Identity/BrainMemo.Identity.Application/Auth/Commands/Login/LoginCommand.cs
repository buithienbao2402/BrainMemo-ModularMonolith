using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Commands.Login;

/// <summary>
/// Authenticates credentials and issues access tokens and a rotating refresh session (FR-IDN-03).
/// </summary>
public sealed record LoginCommand(
    string? Email,
    string? Password,
    string? UserAgent = null,
    string? IpAddress = null) : ICommand<AuthTokensResult>
{
    public override string ToString()
        => $"LoginCommand {{ Email = [REDACTED], Password = [REDACTED], UserAgent = {UserAgent}, IpAddress = {IpAddress} }}";
}
