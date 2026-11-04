namespace BrainMemo.Identity.Domain.Entities;

public enum UserRoleType
{
    STUDENT,
    CREATOR
}

public class User
{
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public long? AvatarMediaId { get; set; } // Logical ID (không lưu link URL)
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class UserRole
{
    public long UserId { get; set; }
    public UserRoleType Role { get; set; }
    public User? User { get; set; }
}

public class EmailOtp
{
    public long OtpId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class RefreshToken
{
    public long TokenId { get; set; }
    public long UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty; // Chuỗi băm SHA-256
    public long? ReplacedByTokenId { get; set; } // Token Rotation chống Replay
    public bool IsRevoked { get; set; } = false;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}