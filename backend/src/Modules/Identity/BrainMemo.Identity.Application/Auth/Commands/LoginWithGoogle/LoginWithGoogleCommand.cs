using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Commands.LoginWithGoogle;

/// <summary>
/// Authenticates via Google OAuth ID token and issues access token and rotating refresh session (FR-IDN-06).
/// </summary>
public sealed record LoginWithGoogleCommand(
    string IdToken,
    string? UserAgent = null,
    string? IpAddress = null) : ICommand<AuthTokensResult>
{
    public override string ToString()
        => $"LoginWithGoogleCommand {{ IdToken = [REDACTED], UserAgent = {UserAgent}, IpAddress = {IpAddress} }}";
}
