using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;

namespace BrainMemo.Identity.Application.Abstractions;

/// <summary>
/// Generates signed JWT access tokens containing standard user claims and permissions.
/// </summary>
public interface IJwtTokenGenerator
{
    string GenerateAccessToken(
        Guid userId,
        string email,
        bool emailVerified,
        bool isAdmin,
        AccountStatus accountStatus,
        DateTimeOffset utcNow);
}
