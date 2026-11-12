namespace BrainMemo.Identity.Application.Auth.Models;

/// <summary>
/// Result containing access token, expiration metadata, refresh cookie secret, and current user snapshot.
/// </summary>
public sealed record AuthTokensResult(
    string RawRefreshToken,
    string AccessToken,
    int ExpiresIn,
    DateTimeOffset ExpiresAt,
    CurrentUserDto User);
