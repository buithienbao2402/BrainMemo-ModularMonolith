using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Domain.Enums;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BrainMemo.Identity.Infrastructure.Security;

/// <summary>
/// Issues signed JWT access tokens containing user id, email, verified status, roles, and account status (DEC-19).
/// </summary>
internal sealed class JwtTokenGenerator(
    IOptions<IdentityJwtOptions> jwtOptions,
    IHostEnvironment environment) : IJwtTokenGenerator
{
    private static byte[]? _ephemeralDevKey;
    private static readonly object KeyLock = new();

    public string GenerateAccessToken(
        Guid userId,
        string email,
        bool emailVerified,
        bool isAdmin,
        AccountStatus accountStatus,
        DateTimeOffset utcNow)
    {
        IdentityJwtOptions options = jwtOptions.Value;
        byte[] keyBytes = ResolveSigningKeyBytes(options.SigningKey, environment);
        SymmetricSecurityKey key = new(keyBytes);
        SigningCredentials credentials = new(key, SecurityAlgorithms.HmacSha256);

        List<Claim> claims =
        [
            new Claim("sub", userId.ToString()),
            new Claim("email", email),
            new Claim("email_verified", emailVerified ? "true" : "false", ClaimValueTypes.Boolean),
            new Claim("account_status", accountStatus.ToDatabaseValue()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        ];

        if (isAdmin)
        {
            claims.Add(new Claim("role", "ADMIN"));
        }
        else
        {
            claims.Add(new Claim("role", "USER"));
        }

        DateTime notBefore = utcNow.AddSeconds(-5).UtcDateTime;
        DateTime expires = utcNow.AddMinutes(options.AccessTokenMinutes).UtcDateTime;

        JwtSecurityToken token = new(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: notBefore,
            expires: expires,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    internal static byte[] ResolveSigningKeyBytes(string? configuredKey, IHostEnvironment environment)
    {
        if (!string.IsNullOrWhiteSpace(configuredKey) && configuredKey.Length >= 32)
        {
            return Encoding.UTF8.GetBytes(configuredKey);
        }

        if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
        {
            lock (KeyLock)
            {
                return _ephemeralDevKey ??= Encoding.UTF8.GetBytes("brainmemo-development-jwt-signing-key-minimum-32-chars-2026");
            }
        }

        throw new InvalidOperationException(
            "Jwt:SigningKey must be configured and at least 32 characters long outside Development/Testing.");
    }
}
