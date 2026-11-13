using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.Events;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Domain.Entities;

/// <summary>
/// Identity user aggregate root (<c>idn_user</c>), owning external OAuth identities, refresh sessions, and one-time tokens.
/// </summary>
public sealed class User : AggregateRoot
{
    public const int MaxPasswordHashLength = 100;
    public const int MaxLockReasonLength = 1000;

    private readonly List<ExternalIdentity> _externalIdentities = [];
    private readonly List<RefreshSession> _refreshSessions = [];
    private readonly List<UserToken> _tokens = [];

    private User()
    {
    }

    private User(
        Guid id,
        string email,
        string? passwordHash,
        DateTimeOffset? emailVerifiedAt,
        DateTimeOffset createdAt)
        : base(id)
    {
        Email = email;
        PasswordHash = passwordHash;
        EmailVerifiedAt = emailVerifiedAt;
        AccountStatus = AccountStatus.Active;
        CreatedAt = createdAt;
        UpdatedAt = createdAt;
    }

    public string Email { get; private set; } = string.Empty;

    public string? PasswordHash { get; private set; }

    public DateTimeOffset? EmailVerifiedAt { get; private set; }

    public AccountStatus AccountStatus { get; private set; }

    public DateTimeOffset? LockedAt { get; private set; }

    public DateTimeOffset? LockedUntil { get; private set; }

    public string? LockReason { get; private set; }

    public Guid? LockSanctionId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<ExternalIdentity> ExternalIdentities => _externalIdentities.AsReadOnly();

    public IReadOnlyCollection<RefreshSession> RefreshSessions => _refreshSessions.AsReadOnly();

    public IReadOnlyCollection<UserToken> Tokens => _tokens.AsReadOnly();

    public bool IsEmailVerified => EmailVerifiedAt is not null;

    public bool IsTemporaryLockExpired(DateTimeOffset utcNow)
        => AccountStatus == AccountStatus.LockedTemporary
           && LockedUntil is not null
           && LockedUntil.Value <= utcNow;

    public AccountStatus GetEffectiveStatus(DateTimeOffset utcNow)
        => IsTemporaryLockExpired(utcNow) ? AccountStatus.Active : AccountStatus;

    public bool IsEffectivelyActive(DateTimeOffset utcNow)
        => GetEffectiveStatus(utcNow) == AccountStatus.Active;

    public static Result<User> CreateWithPassword(
        Guid id,
        EmailAddress email,
        string passwordHash,
        DateTimeOffset utcNow,
        bool markEmailVerified = false)
    {
        ArgumentNullException.ThrowIfNull(email);

        if (id == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(passwordHash) || passwordHash.Length > MaxPasswordHashLength)
        {
            return Error.Validation("Hash mật khẩu không hợp lệ.");
        }

        User user = new(
            id,
            email.Value,
            passwordHash,
            markEmailVerified ? utcNow : null,
            utcNow);

        user.RaiseDomainEvent(new UserRegisteredDomainEvent(UuidV7.NewGuid(utcNow), utcNow, user.Id));
        return Result.Success(user);
    }

    public static Result<User> CreateWithExternalIdentity(
        Guid id,
        Guid externalIdentityId,
        EmailAddress email,
        ExternalProvider provider,
        string providerSubject,
        DateTimeOffset utcNow)
    {
        ArgumentNullException.ThrowIfNull(email);

        if (id == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        User user = new(
            id,
            email.Value,
            passwordHash: null,
            emailVerifiedAt: utcNow,
            createdAt: utcNow);

        Result<ExternalIdentity> linkResult = user.LinkExternalIdentity(
            externalIdentityId,
            provider,
            providerSubject,
            utcNow);

        if (linkResult.IsFailure)
        {
            return linkResult.Error;
        }

        user.RaiseDomainEvent(new UserRegisteredDomainEvent(UuidV7.NewGuid(utcNow), utcNow, user.Id));
        return Result.Success(user);
    }

    public Result VerifyEmail(DateTimeOffset utcNow)
    {
        if (EmailVerifiedAt is null)
        {
            EmailVerifiedAt = utcNow;
            UpdatedAt = utcNow;
        }

        return Result.Success();
    }

    public Result SetPasswordHash(string passwordHash, DateTimeOffset utcNow)
    {
        if (string.IsNullOrWhiteSpace(passwordHash) || passwordHash.Length > MaxPasswordHashLength)
        {
            return Error.Validation("Hash mật khẩu không hợp lệ.");
        }

        PasswordHash = passwordHash;
        UpdatedAt = utcNow;
        return Result.Success();
    }

    public Result<ExternalIdentity> LinkExternalIdentity(
        Guid externalIdentityId,
        ExternalProvider provider,
        string providerSubject,
        DateTimeOffset utcNow)
    {
        Result<ExternalIdentity> created = ExternalIdentity.Create(
            externalIdentityId,
            Id,
            provider,
            providerSubject,
            utcNow);

        if (created.IsFailure)
        {
            return created.Error;
        }

        ExternalIdentity? existing = _externalIdentities.FirstOrDefault(x => x.Provider == provider);
        if (existing is not null)
        {
            if (string.Equals(existing.ProviderSubject, created.Value.ProviderSubject, StringComparison.Ordinal))
            {
                return Result.Success(existing);
            }

            return Error.Conflict(
                ErrorCodes.InvalidState,
                "Tài khoản đã được liên kết với một định danh ngoài khác cho nhà cung cấp này.");
        }

        _externalIdentities.Add(created.Value);
        UpdatedAt = utcNow;
        return created;
    }

    public Result<UserToken> IssueToken(
        Guid tokenId,
        UserTokenPurpose purpose,
        byte[] tokenHash,
        DateTimeOffset expiresAt,
        DateTimeOffset utcNow)
    {
        Result<UserToken> created = UserToken.Create(
            tokenId,
            Id,
            purpose,
            tokenHash,
            expiresAt,
            utcNow);

        if (created.IsFailure)
        {
            return created.Error;
        }

        _tokens.Add(created.Value);
        UpdatedAt = utcNow;
        return created;
    }

    public int InvalidateTokens(UserTokenPurpose purpose, DateTimeOffset utcNow)
    {
        int count = 0;
        foreach (UserToken token in _tokens)
        {
            if (token.Purpose == purpose && token.ConsumedAt is null)
            {
                token.Invalidate(utcNow);
                count++;
            }
        }

        if (count > 0)
        {
            UpdatedAt = utcNow;
        }

        return count;
    }

    public Result<RefreshSession> IssueRefreshSession(
        Guid sessionId,
        byte[] tokenHash,
        DateTimeOffset expiresAt,
        DateTimeOffset utcNow,
        string? userAgent = null,
        string? ipAddress = null)
    {
        if (!IsEffectivelyActive(utcNow))
        {
            return Error.Forbidden("Tài khoản đang bị khóa và không thể tạo phiên đăng nhập mới.");
        }

        Result<RefreshSession> created = RefreshSession.Create(
            sessionId,
            Id,
            tokenHash,
            expiresAt,
            utcNow,
            userAgent,
            ipAddress);

        if (created.IsFailure)
        {
            return created.Error;
        }

        _refreshSessions.Add(created.Value);
        UpdatedAt = utcNow;
        return created;
    }

    public int RevokeAllActiveSessions(SessionRevokeReason reason, DateTimeOffset utcNow)
    {
        int revokedCount = 0;

        foreach (RefreshSession session in _refreshSessions)
        {
            if (session.RevokedAt is null)
            {
                Result result = session.Revoke(reason, utcNow);
                if (result.IsSuccess)
                {
                    revokedCount++;
                }
            }
        }

        if (revokedCount > 0)
        {
            UpdatedAt = utcNow;
        }

        return revokedCount;
    }

    public Result Lock(
        bool isPermanent,
        DateTimeOffset? lockedUntil,
        string reason,
        Guid sanctionId,
        DateTimeOffset utcNow)
    {
        if (sanctionId == Guid.Empty)
        {
            return Error.Validation("ID quyết định xử phạt không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            return Error.Validation("Lý do khóa tài khoản không được để trống.");
        }

        string normalizedReason = reason.Trim();
        if (normalizedReason.Length > MaxLockReasonLength)
        {
            return Error.Validation($"Lý do khóa tài khoản không được vượt quá {MaxLockReasonLength} ký tự.");
        }

        if (isPermanent)
        {
            if (lockedUntil is not null)
            {
                return Error.Validation("Khóa tài khoản vĩnh viễn không được có thời hạn lockedUntil.");
            }
        }
        else if (lockedUntil is null || lockedUntil.Value <= utcNow)
        {
            return Error.Validation("Khóa tài khoản có thời hạn phải có thời điểm kết thúc lớn hơn hiện tại.");
        }

        // Idempotent by sanctionId when already holding that lock (THIET_KE_CSDL §3.1.7 / contracts/identity.md).
        if (LockSanctionId == sanctionId && AccountStatus != AccountStatus.Active)
        {
            return Result.Success();
        }

        // Lazily clear an expired temporary lock before checking ALREADY_LOCKED for a new sanction.
        if (IsTemporaryLockExpired(utcNow))
        {
            UnlockInternal(utcNow, isAutoExpired: true);
        }

        if (AccountStatus != AccountStatus.Active)
        {
            return Error.Conflict(ErrorCodes.AlreadyLocked, "Tài khoản đã ở trạng thái khóa.");
        }

        AccountStatus = isPermanent ? AccountStatus.LockedPermanent : AccountStatus.LockedTemporary;
        LockedAt = utcNow;
        LockedUntil = isPermanent ? null : lockedUntil;
        LockReason = normalizedReason;
        LockSanctionId = sanctionId;
        UpdatedAt = utcNow;

        RevokeAllActiveSessions(SessionRevokeReason.AccountLocked, utcNow);

        RaiseDomainEvent(new AccountLockedDomainEvent(
            UuidV7.NewGuid(utcNow),
            utcNow,
            Id,
            AccountStatus,
            LockedUntil,
            sanctionId));

        return Result.Success();
    }

    public Result UnlockManual(DateTimeOffset utcNow)
    {
        if (AccountStatus == AccountStatus.Active)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Tài khoản hiện không ở trạng thái bị khóa.");
        }

        UnlockInternal(utcNow, isAutoExpired: false);
        return Result.Success();
    }

    public Guid? UnlockIfExpired(DateTimeOffset utcNow)
    {
        if (!IsTemporaryLockExpired(utcNow))
        {
            return null;
        }

        return UnlockInternal(utcNow, isAutoExpired: true);
    }

    private Guid UnlockInternal(DateTimeOffset utcNow, bool isAutoExpired)
    {
        Guid sanctionId = LockSanctionId ?? Guid.Empty;

        AccountStatus = AccountStatus.Active;
        LockedAt = null;
        LockedUntil = null;
        LockReason = null;
        LockSanctionId = null;
        UpdatedAt = utcNow;

        RaiseDomainEvent(new AccountUnlockedDomainEvent(
            UuidV7.NewGuid(utcNow),
            utcNow,
            Id,
            sanctionId,
            isAutoExpired));

        return sanctionId;
    }
}

