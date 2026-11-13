namespace BrainMemo.Identity.Application.Options;

/// <summary>
/// Configuration options for JWT access token and refresh session issuance (DEC-19 & Section "Jwt").
/// </summary>
public sealed class IdentityJwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "brainmemo-api";

    public string Audience { get; set; } = "brainmemo-web";

    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 30;

    public int RefreshTokenDays { get; set; } = 14;
}
