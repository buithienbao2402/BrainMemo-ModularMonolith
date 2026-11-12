using BrainMemo.Identity.Application.Abstractions;

namespace BrainMemo.Identity.Infrastructure.Security;

/// <summary>
/// BCrypt password hashing service aligned with work factor 11 (<c>db/seed/01_seed_admin.sql</c>).
/// </summary>
internal sealed class BCryptPasswordHasher : IPasswordHasher
{
    public const int WorkFactor = 11;

    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrEmpty(password);
        return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
    }

    public bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}

