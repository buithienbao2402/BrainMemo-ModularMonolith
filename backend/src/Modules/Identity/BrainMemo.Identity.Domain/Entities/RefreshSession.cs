using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.Entities;

/// <summary>
/// Rotating refresh token session owned by <see cref="User"/> (<c>idn_refresh_session</c>).
/// </summary>
public sealed class RefreshSession : Entity
{
    public const int MaxUserAgentLength = 512;
    public const int MaxIpAddressLength = 45;

    private RefreshSession()
    {
    }

    private RefreshSession(
        Guid id,
        Guid userId,
        byte[] tokenHash,
        string? userAgent,
        string? ipAddress,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt)
        : base(id)
    {
        UserId = userId;
        TokenHash = tokenHash;
        UserAgent = userAgent;
        IpAddress = ipAddress;
        CreatedAt = createdAt;
        LastUsedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public Guid UserId { get; private set; }

    public byte[] TokenHash { get; private set; } = [];

    public string? UserAgent { get; private set; }

    public string? IpAddress { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastUsedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public SessionRevokeReason? RevokeReason { get; private set; }

    public bool IsActive(DateTimeOffset utcNow)
        => RevokedAt is null && ExpiresAt > utcNow;

    internal static Result<RefreshSession> Create(
        Guid id,
        Guid userId,
        byte[] tokenHash,
        DateTimeOffset expiresAt,
        DateTimeOffset utcNow,
        string? userAgent,
        string? ipAddress)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID phiên đăng nhập không hợp lệ.");
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
            return Error.Validation("Thời điểm hết hạn phiên đăng nhập phải lớn hơn thời điểm hiện tại.");
        }

        string? normalizedAgent = NormalizeOptional(userAgent, MaxUserAgentLength, out Error? agentError, "User-Agent");
        if (agentError is not null)
        {
            return agentError;
        }

        string? normalizedIp = NormalizeOptional(ipAddress, MaxIpAddressLength, out Error? ipError, "Địa chỉ IP");
        if (ipError is not null)
        {
            return ipError;
        }

        return Result.Success(new RefreshSession(
            id,
            userId,
            hashResult.Value.ToArray(),
            normalizedAgent,
            normalizedIp,
            utcNow,
            expiresAt));
    }

    public Result Rotate(byte[] newTokenHash, DateTimeOffset newExpiresAt, DateTimeOffset utcNow)
    {
        if (!IsActive(utcNow))
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.");
        }

        Result<TokenHash> hashResult = ValueObjects.TokenHash.Create(newTokenHash);
        if (hashResult.IsFailure)
        {
            return hashResult.Error;
        }

        if (newExpiresAt <= utcNow)
        {
            return Error.Validation("Thời điểm hết hạn mới phải lớn hơn thời điểm hiện tại.");
        }

        TokenHash = hashResult.Value.ToArray();
        LastUsedAt = utcNow;
        ExpiresAt = newExpiresAt;
        return Result.Success();
    }

    public Result Revoke(SessionRevokeReason reason, DateTimeOffset utcNow)
    {
        if (RevokedAt is not null)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Phiên đăng nhập đã được thu hồi trước đó.");
        }

        RevokedAt = utcNow;
        RevokeReason = reason;
        return Result.Success();
    }

    private static string? NormalizeOptional(
        string? value,
        int maxLength,
        out Error? error,
        string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            error = null;
            return null;
        }

        string trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            error = Error.Validation($"{fieldLabel} không được vượt quá {maxLength} ký tự.");
            return null;
        }

        error = null;
        return trimmed;
    }
}

