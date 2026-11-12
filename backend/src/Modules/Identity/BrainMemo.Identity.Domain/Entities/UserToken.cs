using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.Entities;

/// <summary>
/// One-time email verification or password reset token hash owned by <see cref="User"/> (<c>idn_user_token</c>).
/// </summary>
public sealed class UserToken : Entity
{
    private UserToken()
    {
    }

    private UserToken(
        Guid id,
        Guid userId,
        UserTokenPurpose purpose,
        byte[] tokenHash,
        DateTimeOffset expiresAt,
        DateTimeOffset createdAt)
        : base(id)
    {
        UserId = userId;
        Purpose = purpose;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        CreatedAt = createdAt;
    }

    public Guid UserId { get; private set; }

    public UserTokenPurpose Purpose { get; private set; }

    public byte[] TokenHash { get; private set; } = [];

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? ConsumedAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public bool CanConsume(DateTimeOffset utcNow)
        => ConsumedAt is null && ExpiresAt > utcNow;

    internal static Result<UserToken> Create(
        Guid id,
        Guid userId,
        UserTokenPurpose purpose,
        byte[] tokenHash,
        DateTimeOffset expiresAt,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID token không hợp lệ.");
        }

        if (userId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        Result<TokenHash> hashResult = ValueObjects.TokenHash.Create(tokenHash);
        if (hashResult.IsFailure)
        {
            return hashResult.Error;
        }

        if (expiresAt <= utcNow)
        {
            return Error.Validation("Thời điểm hết hạn token phải lớn hơn thời điểm hiện tại.");
        }

        return Result.Success(new UserToken(
            id,
            userId,
            purpose,
            hashResult.Value.ToArray(),
            expiresAt,
            utcNow));
    }

    public Result Consume(DateTimeOffset utcNow)
    {
        if (!CanConsume(utcNow))
        {
            return new Error(
                ErrorCodes.TokenInvalidOrExpired,
                "Liên kết hoặc mã xác thực không hợp lệ hoặc đã hết hạn.");
        }

        ConsumedAt = utcNow;
        return Result.Success();
    }
}

