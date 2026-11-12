using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Contracts;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Identity.UnitTests.Contracts;

public sealed class IdentityContractServiceUnitTests : IDisposable
{
    private readonly IdentityDbContext _dbContext;
    private readonly FakeClock _clock = new(new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero));
    private readonly RecordingEventBus _eventBus = new();
    private readonly IdentityContractService _contract;

    public IdentityContractServiceUnitTests()
    {
        DbContextOptions<IdentityDbContext> options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase($"identity-contract-unit-{Guid.NewGuid():N}")
            .Options;

        _dbContext = new IdentityDbContext(options);
        _contract = new IdentityContractService(
            _dbContext,
            _clock,
            _eventBus,
            NullLogger<IdentityContractService>.Instance);
    }

    public void Dispose() => _dbContext.Dispose();

    [Fact]
    public async Task GetAccountStatus_ReturnsNotFoundForMissingUser_AndAutoUnlocksExpiredTempLock()
    {
        Result<AccountStatusDto> missing = await _contract.GetAccountStatus(UuidV7.NewGuid());
        Assert.True(missing.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, missing.Error.Code);

        User user = CreateUser("temp@brainmemo.local", _clock.UtcNow, verified: true);
        Guid sanctionId = UuidV7.NewGuid(_clock.UtcNow);
        Assert.True(user.Lock(false, _clock.UtcNow.AddHours(1), "Spam", sanctionId, _clock.UtcNow).IsSuccess);
        user.ClearDomainEvents();
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        Result<AccountStatusDto> locked = await _contract.GetAccountStatus(user.Id);
        Assert.True(locked.IsSuccess);
        Assert.Equal(AccountStatuses.LockedTemporary, locked.Value.Status);
        Assert.True(locked.Value.EmailVerified);
        Assert.Equal("Spam", locked.Value.LockReason);

        // Advance past lock expiration -> lazy auto-unlock persists ACTIVE and emits AccountUnlocked(AutoExpired).
        _clock.Advance(TimeSpan.FromHours(2));
        Result<AccountStatusDto> unlocked = await _contract.GetAccountStatus(user.Id);
        Assert.True(unlocked.IsSuccess);
        Assert.Equal(AccountStatuses.Active, unlocked.Value.Status);
        Assert.Null(unlocked.Value.LockedUntil);
        Assert.Null(unlocked.Value.LockReason);

        AccountUnlocked unlockedEvent = Assert.Single(_eventBus.Events) as AccountUnlocked
            ?? throw new InvalidOperationException("Expected AccountUnlocked.");
        Assert.Equal(UnlockKind.AutoExpired, unlockedEvent.Kind);
        Assert.Equal(sanctionId, unlockedEvent.SanctionId);
        Assert.Equal(user.Id, unlockedEvent.UserId);
    }

    [Fact]
    public async Task IsAdminAndIsLastAdmin_ConsiderRevokedGrantsAndLockedOtherAdmins()
    {
        User admin1 = CreateUser("admin1@brainmemo.local", _clock.UtcNow);
        User admin2 = CreateUser("admin2@brainmemo.local", _clock.UtcNow);
        User learner = CreateUser("learner@brainmemo.local", _clock.UtcNow);
        _dbContext.Users.AddRange(admin1, admin2, learner);

        AdminGrant grant1 = AdminGrant.Create(UuidV7.NewGuid(), admin1.Id, _clock.UtcNow).Value;
        AdminGrant grant2 = AdminGrant.Create(UuidV7.NewGuid(), admin2.Id, _clock.UtcNow).Value;
        _dbContext.AdminGrants.AddRange(grant1, grant2);
        await _dbContext.SaveChangesAsync();

        Assert.True((await _contract.IsAdmin(admin1.Id)).Value);
        Assert.False((await _contract.IsAdmin(learner.Id)).Value);
        Assert.False((await _contract.IsLastAdmin(admin1.Id)).Value);
        Assert.False((await _contract.IsLastAdmin(learner.Id)).Value);

        // Locking admin2 makes admin1 the last ACTIVE admin even though grant2 is not revoked.
        Assert.True((await _contract.LockAccount(admin2.Id, LockType.Permanent, null, "Rule violation", UuidV7.NewGuid(), admin1.Id)).IsSuccess);
        Assert.True((await _contract.IsLastAdmin(admin1.Id)).Value);

        // Attempting to lock the last active admin returns LAST_ADMIN; self-lock returns SELF_LOCK.
        Result selfLock = await _contract.LockAccount(admin1.Id, LockType.Permanent, null, "Self", UuidV7.NewGuid(), admin1.Id);
        Assert.True(selfLock.IsFailure);
        Assert.Equal(ErrorCodes.SelfLock, selfLock.Error.Code);

        Result lastAdminLock = await _contract.LockAccount(admin1.Id, LockType.Permanent, null, "Other admin", UuidV7.NewGuid(), UuidV7.NewGuid());
        Assert.True(lastAdminLock.IsFailure);
        Assert.Equal(ErrorCodes.LastAdmin, lastAdminLock.Error.Code);
    }

    [Fact]
    public async Task LockAccount_And_UnlockAccount_RevokeSessionsAndEmitEvents()
    {
        User learner = CreateUser("student@brainmemo.local", _clock.UtcNow);
        Guid adminId = UuidV7.NewGuid();
        byte[] sessionHash = Enumerable.Repeat((byte)0x12, 32).ToArray();
        Assert.True(learner.IssueRefreshSession(UuidV7.NewGuid(), sessionHash, _clock.UtcNow.AddDays(14), _clock.UtcNow).IsSuccess);
        learner.ClearDomainEvents();
        _dbContext.Users.Add(learner);
        await _dbContext.SaveChangesAsync();

        Guid sanctionId = UuidV7.NewGuid();
        Result lockResult = await _contract.LockAccount(
            learner.Id,
            LockType.Temporary,
            _clock.UtcNow.AddDays(7),
            "Academic dishonesty",
            sanctionId,
            adminId);

        Assert.True(lockResult.IsSuccess);
        Assert.Single(_eventBus.Events, static e => e is AccountLocked);

        // Refresh session was revoked with ACCOUNT_LOCKED.
        RefreshSession storedSession = await _dbContext.RefreshSessions.AsNoTracking().SingleAsync();
        Assert.Equal(SessionRevokeReason.AccountLocked, storedSession.RevokeReason);

        // Manual unlock restores ACTIVE and emits AccountUnlocked(Manual).
        _eventBus.Events.Clear();
        Result unlockResult = await _contract.UnlockAccount(learner.Id, "Appeal approved", adminId);
        Assert.True(unlockResult.IsSuccess);
        AccountUnlocked unlockedEvent = Assert.Single(_eventBus.Events) as AccountUnlocked
            ?? throw new InvalidOperationException("Expected AccountUnlocked.");
        Assert.Equal(UnlockKind.Manual, unlockedEvent.Kind);
        Assert.Equal(sanctionId, unlockedEvent.SanctionId);

        AccountStatusDto afterUnlock = (await _contract.GetAccountStatus(learner.Id)).Value;
        Assert.Equal(AccountStatuses.Active, afterUnlock.Status);
    }

    [Fact]
    public async Task FindUserIdByEmail_GetUserSummary_And_ListActiveUserIds_WorkCorrectly()
    {
        // Note timestamps crossing short sign boundary (0x01967FFF vs 0x01968000) verify big-endian ordering.
        Guid id1 = Guid.Parse("01967fff-0001-7000-8000-000000000001");
        Guid id2 = Guid.Parse("01968000-0001-7000-8000-000000000002");
        Guid id3 = Guid.Parse("01968001-0001-7000-8000-000000000003");
        Guid lockedId = Guid.Parse("01968002-0001-7000-8000-000000000004");

        User u1 = User.CreateWithPassword(id1, EmailAddress.Create("u1@brainmemo.local").Value, "hash", _clock.UtcNow).Value;
        User u2 = User.CreateWithPassword(id2, EmailAddress.Create("u2@brainmemo.local").Value, "hash", _clock.UtcNow).Value;
        User u3 = User.CreateWithPassword(id3, EmailAddress.Create("u3@brainmemo.local").Value, "hash", _clock.UtcNow).Value;
        User uLocked = User.CreateWithPassword(lockedId, EmailAddress.Create("locked@brainmemo.local").Value, "hash", _clock.UtcNow).Value;
        uLocked.Lock(true, null, "Permanent", UuidV7.NewGuid(), _clock.UtcNow);
        _dbContext.Users.AddRange(u2, uLocked, u1, u3);
        await _dbContext.SaveChangesAsync();

        Guid? found = (await _contract.FindUserIdByEmail("  U2@BRAINMEMO.LOCAL ")).Value;
        Assert.Equal(id2, found);
        Assert.Null((await _contract.FindUserIdByEmail("missing@brainmemo.local")).Value);

        IReadOnlyList<UserSummaryDto> summaries = (await _contract.GetUserSummary([id1, id1, lockedId])).Value;
        Assert.Equal(2, summaries.Count);

        Page<Guid> page1 = (await _contract.ListActiveUserIds(null, 2)).Value;
        Assert.Equal([id1, id2], page1.Items);
        Assert.Equal(id2, page1.AfterId);
        Assert.True(page1.HasMore);

        Page<Guid> page2 = (await _contract.ListActiveUserIds(page1.AfterId, 2)).Value;
        Assert.Equal([id3], page2.Items);
        Assert.Equal(id3, page2.AfterId);
        Assert.False(page2.HasMore);
    }

    private static User CreateUser(string email, DateTimeOffset utcNow, bool verified = false)
        => User.CreateWithPassword(
            UuidV7.NewGuid(utcNow),
            EmailAddress.Create(email).Value,
            "$2a$11$validbcryptplaceholderhash0000000000000000000000000000",
            utcNow,
            verified).Value;

    private sealed class FakeClock(DateTimeOffset initialUtc) : IClock
    {
        public DateTimeOffset UtcNow { get; private set; } = initialUtc;

        public void Advance(TimeSpan delta) => UtcNow = UtcNow.Add(delta);
    }

    private sealed class RecordingEventBus : IEventBus
    {
        public List<IntegrationEvent> Events { get; } = [];

        public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
        {
            Events.Add(@event);
            return Task.CompletedTask;
        }
    }
}

