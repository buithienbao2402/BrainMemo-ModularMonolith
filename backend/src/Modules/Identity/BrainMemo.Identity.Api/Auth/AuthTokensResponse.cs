namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Auth tokens schema matching openapi/modules/identity.yaml #/components/schemas/AuthTokens.
/// </summary>
public sealed record AuthTokensResponse(
    string AccessToken,
    int ExpiresIn,
    CurrentUserResponse User);
