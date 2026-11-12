using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.Events;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;

namespace Identity.UnitTests.Domain;

public sealed class UserTests
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void CreateWithPassword_NormalizesEmail_RaisesRegisteredEvent_AndSetsActive()
    {
        EmailAddress email = EmailAddress.Create("  HocVien.Test@Example.COM  ").Value;
        Guid userId = UuidV7.NewGuid(BaseUtc);

        Result<User> result = User.CreateWithPassword(
            userId,
            email,
            "$2a$11$validbcryptplaceholderhash0000000000000000000000000000",
            BaseUtc);

        Assert.True(result.IsSuccess);
        User user = result.Value;
        Assert.Equal("hocvien.test@example.com", user.Email);
        Assert.Equal(AccountStatus.Active, user.AccountStatus);
        Assert.False(user.IsEmailVerified);
        Assert.Null(user.LockedAt);
        Assert.Null(user.LockedUntil);
        Assert.Null(user.LockReason);
        Assert.Null(user.LockSanctionId);

        UserRegisteredDomainEvent domainEvent = Assert.Single(user.DomainEvents) as UserRegisteredDomainEvent
            ?? throw new InvalidOperationException("Expected UserRegisteredDomainEvent.");
        Assert.Equal(userId, domainEvent.UserId);
    }

    [Fact]
    public void CreateWithExternalIdentity_SetsVerifiedEmailAndGoogleLink()
    {
        EmailAddress email = EmailAddress.Create("oauth.user@brainmemo.local").Value;
        Guid userId = UuidV7.NewGuid(BaseUtc);
        Guid externalId = UuidV7.NewGuid(BaseUtc);

        Result<User> result = User.CreateWithExternalIdentity(
            userId,
            externalId,
            email,
            ExternalProvider.Google,
            "google-sub-12345",
            BaseUtc);

        Assert.True(result.IsSuccess);
        User user = result.Value;
        Assert.Null(user.PasswordHash);
        Assert.True(user.IsEmailVerified);
        ExternalIdentity link = Assert.Single(user.ExternalIdentities);
        Assert.Equal(ExternalProvider.Google, link.Provider);
        Assert.Equal("google-sub-12345", link.ProviderSubject);

        // Idempotent link with same subject returns success; different subject conflicts.
        Result<ExternalIdentity> sameLink = user.LinkExternalIdentity(UuidV7.NewGuid(), ExternalProvider.Google, "google-sub-12345", BaseUtc.AddMinutes(1));
        Assert.True(sameLink.IsSuccess);

        Result<ExternalIdentity> conflictingLink = user.LinkExternalIdentity(UuidV7.NewGuid(), ExternalProvider.Google, "other-sub", BaseUtc.AddMinutes(2));
        Assert.True(conflictingLink.IsFailure);
        Assert.Equal(ErrorCodes.InvalidState, conflictingLink.Error.Code);
    }

    [Fact]
    public void LockTemporaryAndPermanent_EnforceInvariantsIdempotencyAndSessionRevocation()
    {
        User user = CreateActiveUser();
        Guid sessionId = UuidV7.NewGuid(BaseUtc);
        byte[] hash = Enumerable.Repeat((byte)0xAB, TokenHash.ExpectedByteLength).ToArray();
        Assert.True(user.IssueRefreshSession(sessionId, hash, BaseUtc.AddDays(14), BaseUtc, "Mozilla/5.0", "127.0.0.1").IsSuccess);
        user.ClearDomainEvents();

        Guid sanctionId = UuidV7.NewGuid(BaseUtc.AddMinutes(1));
        DateTimeOffset lockedAt = BaseUtc.AddMinutes(1);
        DateTimeOffset lockUntil = BaseUtc.AddDays(3);

        Result tempLock = user.Lock(false, lockUntil, "  Vi pham noi quy  ", sanctionId, lockedAt);
        Assert.True(tempLock.IsSuccess);
        Assert.Equal(AccountStatus.LockedTemporary, user.AccountStatus);
        Assert.Equal(lockedAt, user.LockedAt);
        Assert.Equal(lockUntil, user.LockedUntil);
        Assert.Equal("Vi pham noi quy", user.LockReason);
        Assert.Equal(sanctionId, user.LockSanctionId);

        RefreshSession session = Assert.Single(user.RefreshSessions);
        Assert.Equal(lockedAt, session.RevokedAt);
        Assert.Equal(SessionRevokeReason.AccountLocked, session.RevokeReason);
        Assert.Single(user.DomainEvents, static e => e is AccountLockedDomainEvent);

        // Replay with identical sanctionId is idempotent and does not raise duplicate domain events.
        user.ClearDomainEvents();
        Result replay = user.Lock(false, lockUntil, "Vi pham noi quy", sanctionId, lockedAt.AddSeconds(10));
        Assert.True(replay.IsSuccess);
        Assert.Empty(user.DomainEvents);

        // New sanction while temporary lock is still active fails with ALREADY_LOCKED (including upgrade to Permanent).
        Result newSanctionWhileLocked = user.Lock(true, null, "Second sanction", UuidV7.NewGuid(), lockedAt.AddHours(1));
        Assert.True(newSanctionWhileLocked.IsFailure);
        Assert.Equal(ErrorCodes.AlreadyLocked, newSanctionWhileLocked.Error.Code);
    }

    [Fact]
    public void LockAfterTemporaryLockExpired_ClearsExpiredLockFirstThenAppliesNewSanction()
    {
        User user = CreateActiveUser();
        Guid firstSanction = UuidV7.NewGuid(BaseUtc);
        DateTimeOffset expiredAt = BaseUtc.AddHours(2);
        Assert.True(user.Lock(false, expiredAt, "Temp lock", firstSanction, BaseUtc).IsSuccess);
        user.ClearDomainEvents();

        DateTimeOffset now = expiredAt.AddMinutes(1);
        Assert.True(user.IsTemporaryLockExpired(now));
        Assert.True(user.IsEffectivelyActive(now));

        Guid secondSanction = UuidV7.NewGuid(now);
        Result permLock = user.Lock(true, null, "Permanent violation", secondSanction, now);

        Assert.True(permLock.IsSuccess);
        Assert.Equal(AccountStatus.LockedPermanent, user.AccountStatus);
        Assert.Null(user.LockedUntil);
        Assert.Equal(secondSanction, user.LockSanctionId);
        Assert.Equal(2, user.DomainEvents.Count);
        Assert.Contains(user.DomainEvents, e => e is AccountUnlockedDomainEvent { IsAutoExpired: true } unlocked && unlocked.SanctionId == firstSanction);
        Assert.Contains(user.DomainEvents, e => e is AccountLockedDomainEvent { Status: AccountStatus.LockedPermanent } locked && locked.SanctionId == secondSanction);
    }

    [Fact]
    public void UnlockManual_ClearsAllLockColumns_AndFailsWhenAlreadyActive()
    {
        User user = CreateActiveUser();
        Result activeUnlock = user.UnlockManual(BaseUtc);
        Assert.True(activeUnlock.IsFailure);
        Assert.Equal(ErrorCodes.InvalidState, activeUnlock.Error.Code);

        Guid sanctionId = UuidV7.NewGuid();
        Assert.True(user.Lock(true, null, "Permanent", sanctionId, BaseUtc).IsSuccess);
        user.ClearDomainEvents();

        Result unlockResult = user.UnlockManual(BaseUtc.AddHours(1));
        Assert.True(unlockResult.IsSuccess);
        Assert.Equal(AccountStatus.Active, user.AccountStatus);
        Assert.Null(user.LockedAt);
        Assert.Null(user.LockedUntil);
        Assert.Null(user.LockReason);
        Assert.Null(user.LockSanctionId);

        AccountUnlockedDomainEvent ev = Assert.Single(user.DomainEvents) as AccountUnlockedDomainEvent
            ?? throw new InvalidOperationException("Expected AccountUnlockedDomainEvent.");
        Assert.False(ev.IsAutoExpired);
        Assert.Equal(sanctionId, ev.SanctionId);
    }

    [Fact]
    public void UserToken_Consume_SucceedsOnceAndRejectsExpiredOrReused()
    {
        User user = CreateActiveUser();
        byte[] tokenHash = Enumerable.Repeat((byte)0xCD, TokenHash.ExpectedByteLength).ToArray();
        Result<UserToken> tokenResult = user.IssueToken(
            UuidV7.NewGuid(BaseUtc),
            UserTokenPurpose.VerifyEmail,
            tokenHash,
            BaseUtc.AddHours(24),
            BaseUtc);

        Assert.True(tokenResult.IsSuccess);
        UserToken token = tokenResult.Value;

        Assert.True(token.Consume(BaseUtc.AddHours(1)).IsSuccess);
        Result reuse = token.Consume(BaseUtc.AddHours(2));
        Assert.True(reuse.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, reuse.Error.Code);

        byte[] tokenHash2 = Enumerable.Repeat((byte)0xEF, TokenHash.ExpectedByteLength).ToArray();
        UserToken expiredToken = user.IssueToken(
            UuidV7.NewGuid(BaseUtc),
            UserTokenPurpose.ResetPassword,
            tokenHash2,
            BaseUtc.AddMinutes(30),
            BaseUtc).Value;

        Result expiredConsume = expiredToken.Consume(BaseUtc.AddMinutes(31));
        Assert.True(expiredConsume.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, expiredConsume.Error.Code);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@localhost")]
    [InlineData("a b@example.com")]
    public void EmailAddress_RejectsInvalidFormats(string? invalidEmail)
    {
        Result<EmailAddress> result = EmailAddress.Create(invalidEmail);
        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
    }

    private static User CreateActiveUser()
    {
        EmailAddress email = EmailAddress.Create("learner@brainmemo.local").Value;
        return User.CreateWithPassword(
            UuidV7.NewGuid(BaseUtc),
            email,
            "$2a$11$validbcryptplaceholderhash0000000000000000000000000000",
            BaseUtc).Value;
    }
}

