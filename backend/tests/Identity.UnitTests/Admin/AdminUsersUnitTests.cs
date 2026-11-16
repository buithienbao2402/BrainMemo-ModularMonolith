using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Admin.Commands.AdminLockUser;
using BrainMemo.Identity.Application.Admin.Commands.AdminUnlockUser;
using BrainMemo.Identity.Application.Admin.Commands.GrantAdmin;
using BrainMemo.Identity.Application.Admin.Commands.RevokeAdmin;
using BrainMemo.Identity.Application.Admin.DTOs;
using BrainMemo.Identity.Application.Admin.Queries.AdminListUsers;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.BackgroundJobs;
using BrainMemo.Identity.Infrastructure.Contracts;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Identity.UnitTests.Admin;

public sealed class AdminUsersUnitTests
{
    private static readonly DateTimeOffset BaseTime = new(2026, 11, 16, 12, 0, 0, TimeSpan.Zero);

    private sealed class TestClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = now;
    }

    private sealed class FakeEventBus : IEventBus
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
        {
            PublishedEvents.Add(@event);
            return Task.CompletedTask;
        }
    }

    private static IdentityDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<IdentityDbContext> options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase($"idn_admin_test_{Guid.NewGuid():N}")
            .Options;

        return new IdentityDbContext(options);
    }

    private static User CreateTestUser(string email, DateTimeOffset createdAt)
    {
        EmailAddress emailVo = EmailAddress.Create(email).Value;
        return User.CreateWithPassword(Guid.NewGuid(), emailVo, "some-password-hash", createdAt, markEmailVerified: true).Value;
    }

    [Fact]
    public async Task AdminListUsersQuery_FiltersSearchAndPaginatesCorrectly()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        IdentityAdminRepository repo = new(db, clock);

        User user1 = CreateTestUser("alice@example.com", BaseTime);
        User user2 = CreateTestUser("bob@example.com", BaseTime.AddMinutes(1));
        User user3 = CreateTestUser("charlie@other.org", BaseTime.AddMinutes(2));

        AdminGrant grant1 = AdminGrant.Create(Guid.NewGuid(), user1.Id, BaseTime, user1.Id).Value;

        db.Users.AddRange(user1, user2, user3);
        db.AdminGrants.Add(grant1);
        await db.SaveChangesAsync();

        AdminListUsersQueryHandler handler = new(repo);

        // 1. Search for "example"
        Result<AdminUserListResponse> searchResult = await handler.Handle(
            new AdminListUsersQuery(1, 10, "example", null),
            CancellationToken.None);

        Assert.True(searchResult.IsSuccess);
        Assert.Equal(2, searchResult.Value.Meta.Total);
        Assert.Equal(2, searchResult.Value.Items.Count);
        AdminUserDto aliceDto = searchResult.Value.Items.First(u => u.Email == "alice@example.com");
        Assert.True(aliceDto.IsAdmin);
        Assert.Equal("ACTIVE", aliceDto.AccountStatus);

        AdminUserDto bobDto = searchResult.Value.Items.First(u => u.Email == "bob@example.com");
        Assert.False(bobDto.IsAdmin);

        // 2. Filter by status ACTIVE
        Result<AdminUserListResponse> activeResult = await handler.Handle(
            new AdminListUsersQuery(1, 10, null, "ACTIVE"),
            CancellationToken.None);
        Assert.True(activeResult.IsSuccess);
        Assert.Equal(3, activeResult.Value.Meta.Total);
    }

    [Fact]
    public async Task GrantAdminCommand_IsIdempotent()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        IdentityAdminRepository repo = new(db, clock);

        User targetUser = CreateTestUser("learner@example.com", BaseTime);
        Guid actorAdminId = Guid.NewGuid();

        db.Users.Add(targetUser);
        await db.SaveChangesAsync();

        GrantAdminCommandHandler handler = new(repo, clock);

        // First grant
        Result grant1 = await handler.Handle(new GrantAdminCommand(targetUser.Id, actorAdminId), CancellationToken.None);
        Assert.True(grant1.IsSuccess);

        bool isAdminNow = await repo.IsUserAdminAsync(targetUser.Id);
        Assert.True(isAdminNow);

        // Second grant (idempotent)
        Result grant2 = await handler.Handle(new GrantAdminCommand(targetUser.Id, actorAdminId), CancellationToken.None);
        Assert.True(grant2.IsSuccess);

        int grantCount = await db.AdminGrants.CountAsync(g => g.UserId == targetUser.Id && g.RevokedAt == null);
        Assert.Equal(1, grantCount);
    }

    [Fact]
    public async Task RevokeAdminCommand_FailsWithLastAdmin_WhenOnlyOneAdminExists()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        IdentityAdminRepository repo = new(db, clock);

        User adminUser = CreateTestUser("superadmin@example.com", BaseTime);
        AdminGrant grant = AdminGrant.Create(Guid.NewGuid(), adminUser.Id, BaseTime, adminUser.Id).Value;

        db.Users.Add(adminUser);
        db.AdminGrants.Add(grant);
        await db.SaveChangesAsync();

        RevokeAdminCommandHandler handler = new(repo, clock);

        // Try revoking the only admin
        Result result = await handler.Handle(new RevokeAdminCommand(adminUser.Id, adminUser.Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.LastAdmin, result.Error.Code);
    }

    [Fact]
    public async Task RevokeAdminCommand_Succeeds_WhenMultipleAdminsExist()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        IdentityAdminRepository repo = new(db, clock);

        User admin1 = CreateTestUser("admin1@example.com", BaseTime);
        User admin2 = CreateTestUser("admin2@example.com", BaseTime);

        AdminGrant grant1 = AdminGrant.Create(Guid.NewGuid(), admin1.Id, BaseTime, admin1.Id).Value;
        AdminGrant grant2 = AdminGrant.Create(Guid.NewGuid(), admin2.Id, BaseTime, admin1.Id).Value;

        db.Users.AddRange(admin1, admin2);
        db.AdminGrants.AddRange(grant1, grant2);
        await db.SaveChangesAsync();

        RevokeAdminCommandHandler handler = new(repo, clock);

        // Revoke admin2
        Result result = await handler.Handle(new RevokeAdminCommand(admin2.Id, admin1.Id), CancellationToken.None);
        Assert.True(result.IsSuccess);

        bool admin2StillAdmin = await repo.IsUserAdminAsync(admin2.Id);
        Assert.False(admin2StillAdmin);

        bool admin1StillAdmin = await repo.IsUserAdminAsync(admin1.Id);
        Assert.True(admin1StillAdmin);
    }

    [Fact]
    public async Task AdminLockUserCommand_FailsOnSelfLock_AndLastAdmin()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        FakeEventBus eventBus = new();
        IdentityContractService contractService = new(db, clock, eventBus, NullLogger<IdentityContractService>.Instance);

        User adminUser = CreateTestUser("soleadmin@example.com", BaseTime);
        AdminGrant grant = AdminGrant.Create(Guid.NewGuid(), adminUser.Id, BaseTime, adminUser.Id).Value;

        db.Users.Add(adminUser);
        db.AdminGrants.Add(grant);
        await db.SaveChangesAsync();

        AdminLockUserCommandHandler handler = new(contractService);

        // 1. Self lock
        Result selfLockResult = await handler.Handle(
            new AdminLockUserCommand(adminUser.Id, LockType.Permanent, null, "Self lock test", adminUser.Id),
            CancellationToken.None);
        Assert.True(selfLockResult.IsFailure);
        Assert.Equal(ErrorCodes.SelfLock, selfLockResult.Error.Code);

        // 2. Lock when caller is another admin but target is the only active admin
        Guid otherCallerId = Guid.NewGuid();
        Result lastAdminResult = await handler.Handle(
            new AdminLockUserCommand(adminUser.Id, LockType.Permanent, null, "Lock last admin", otherCallerId),
            CancellationToken.None);
        Assert.True(lastAdminResult.IsFailure);
        Assert.Equal(ErrorCodes.LastAdmin, lastAdminResult.Error.Code);
    }

    [Fact]
    public async Task AdminLockAndUnlockUser_RevokesSessionsAndEmitsEvents()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        FakeEventBus eventBus = new();
        IdentityContractService contractService = new(db, clock, eventBus, NullLogger<IdentityContractService>.Instance);

        User adminUser = CreateTestUser("admin@example.com", BaseTime);
        User targetUser = CreateTestUser("baduser@example.com", BaseTime);

        // User has an active refresh session
        targetUser.IssueRefreshSession(
            Guid.NewGuid(),
            new byte[32],
            BaseTime.AddDays(7),
            BaseTime,
            "Mozilla",
            "127.0.0.1");

        db.Users.AddRange(adminUser, targetUser);
        await db.SaveChangesAsync();

        AdminLockUserCommandHandler lockHandler = new(contractService);
        AdminUnlockUserCommandHandler unlockHandler = new(contractService);

        // Lock user
        Result lockResult = await lockHandler.Handle(
            new AdminLockUserCommand(targetUser.Id, LockType.Permanent, null, "Spamming", adminUser.Id),
            CancellationToken.None);

        Assert.True(lockResult.IsSuccess);

        // Check user status
        User? reloadedTarget = await db.Users
            .Include(u => u.RefreshSessions)
            .FirstOrDefaultAsync(u => u.Id == targetUser.Id);
        Assert.NotNull(reloadedTarget);
        Assert.Equal(AccountStatus.LockedPermanent, reloadedTarget.AccountStatus);

        // Session must be revoked
        RefreshSession? activeSession = reloadedTarget.RefreshSessions.FirstOrDefault();
        Assert.NotNull(activeSession);
        Assert.NotNull(activeSession.RevokedAt);

        // Unlock user
        Result unlockResult = await unlockHandler.Handle(
            new AdminUnlockUserCommand(targetUser.Id, "Pardoned", adminUser.Id),
            CancellationToken.None);

        Assert.True(unlockResult.IsSuccess);

        User? unlockedTarget = await db.Users.FindAsync(targetUser.Id);
        Assert.NotNull(unlockedTarget);
        Assert.Equal(AccountStatus.Active, unlockedTarget.AccountStatus);
    }

    [Fact]
    public async Task UnlockExpiredAccountsWorker_UnlocksOnlyExpiredTemporaryAccounts()
    {
        await using IdentityDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        FakeEventBus eventBus = new();

        ServiceCollection sc = new();
        sc.AddSingleton(db);
        sc.AddSingleton<IEventBus>(eventBus);
        using ServiceProvider sp = sc.BuildServiceProvider();

        User userExpired = CreateTestUser("expired@example.com", BaseTime);
        Guid sanction1 = Guid.NewGuid();
        userExpired.Lock(false, BaseTime.AddHours(-1), "Temp lock 1", sanction1, BaseTime.AddHours(-2));

        User userNotExpired = CreateTestUser("notexpired@example.com", BaseTime);
        Guid sanction2 = Guid.NewGuid();
        userNotExpired.Lock(false, BaseTime.AddHours(2), "Temp lock 2", sanction2, BaseTime);

        User userPermanent = CreateTestUser("perm@example.com", BaseTime);
        Guid sanction3 = Guid.NewGuid();
        userPermanent.Lock(true, null, "Perm lock", sanction3, BaseTime);

        db.Users.AddRange(userExpired, userNotExpired, userPermanent);
        await db.SaveChangesAsync();

        UnlockExpiredAccountsWorker worker = new(sp, clock, NullLogger<UnlockExpiredAccountsWorker>.Instance);

        int unlockedCount = await worker.ProcessExpiredAccountsAsync(CancellationToken.None);

        Assert.Equal(1, unlockedCount);

        User? reloadedExpired = await db.Users.FindAsync(userExpired.Id);
        Assert.NotNull(reloadedExpired);
        Assert.Equal(AccountStatus.Active, reloadedExpired.AccountStatus);
        Assert.Null(reloadedExpired.LockedUntil);

        User? reloadedNotExpired = await db.Users.FindAsync(userNotExpired.Id);
        Assert.NotNull(reloadedNotExpired);
        Assert.Equal(AccountStatus.LockedTemporary, reloadedNotExpired.AccountStatus);

        User? reloadedPerm = await db.Users.FindAsync(userPermanent.Id);
        Assert.NotNull(reloadedPerm);
        Assert.Equal(AccountStatus.LockedPermanent, reloadedPerm.AccountStatus);

        // Event published
        Assert.Single(eventBus.PublishedEvents);
        AccountUnlocked unlockedEvent = Assert.IsType<AccountUnlocked>(eventBus.PublishedEvents[0]);
        Assert.Equal(userExpired.Id, unlockedEvent.UserId);
        Assert.Equal(UnlockKind.AutoExpired, unlockedEvent.Kind);
        Assert.Equal(sanction1, unlockedEvent.SanctionId);
    }
}
