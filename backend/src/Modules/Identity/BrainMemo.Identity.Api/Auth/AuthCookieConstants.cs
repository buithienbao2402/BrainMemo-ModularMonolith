namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Constants for refresh token cookie name and scoped path matching DEC-19.
/// </summary>
public static class AuthCookieConstants
{
    public const string RefreshTokenCookieName = "refreshToken";
    public const string AlternativeCookieName = "bm_refresh_token";
    public const string CookiePath = "/api/v1/auth";
}
