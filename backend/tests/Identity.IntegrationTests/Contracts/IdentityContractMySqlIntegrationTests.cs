using System.Data;
using System.Data.Common;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.BuildingBlocks.Infrastructure.Transactions;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Contracts;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Identity.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;
using Xunit;

namespace Identity.IntegrationTests.Contracts;

[Collection(MySqlCollection.Name)]
public sealed class IdentityContractMySqlIntegrationTests(MySqlTestDatabaseFixture fixture)
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 14, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task CursorPagination_LazyAutoUnlock_And_ManualUnlock_WorkAgainstMySql8()
    {
        string dbName = $"idn_int_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            await setupDb.Database.MigrateAsync();

            Guid id1 = Guid.Parse("01967fff-0000-7000-8000-000000000001");
            Guid id2 = Guid.Parse("01968000-0000-7000-8000-000000000002");
            Guid id3 = Guid.Parse("01968001-0000-7000-8000-000000000003");
            Guid lockedId = Guid.Parse("01968002-0000-7000-8000-000000000004");

            User u1 = User.CreateWithPassword(id1, EmailAddress.Create("m1@test.local").Value, "hash", BaseUtc).Value;
            User u2 = User.CreateWithPassword(id2, EmailAddress.Create("m2@test.local").Value, "hash", BaseUtc).Value;
            User u3 = User.CreateWithPassword(id3, EmailAddress.Create("m3@test.local").Value, "hash", BaseUtc).Value;
            User uLocked = User.CreateWithPassword(lockedId, EmailAddress.Create("mlocked@test.local").Value, "hash", BaseUtc).Value;
            Guid expiredSanctionId = UuidV7.NewGuid(BaseUtc);
            Assert.True(uLocked.Lock(false, BaseUtc.AddHours(1), "Temp", expiredSanctionId, BaseUtc).IsSuccess);
            uLocked.ClearDomainEvents();

            setupDb.Users.AddRange(u3, uLocked, u1, u2);
            await setupDb.SaveChangesAsync();

            MutableTestClock clock = new(BaseUtc);
            TestEventCollector eventBus = new();
            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            IdentityContractService contract = new(db, clock, eventBus, NullLogger<IdentityContractService>.Instance);

            Page<Guid> p1 = (await contract.ListActiveUserIds(null, 2)).Value;
            Assert.Equal([id1, id2], p1.Items);
            Assert.True(p1.HasMore);

            Page<Guid> p2 = (await contract.ListActiveUserIds(p1.AfterId, 2)).Value;
            Assert.Equal([id3], p2.Items);
            Assert.False(p2.HasMore);

            // Advance past temp lock expiry -> GetAccountStatus persists ACTIVE and emits AccountUnlocked(AutoExpired).
            clock.UtcNow = BaseUtc.AddHours(2);
            AccountStatusDto afterExpiry = (await contract.GetAccountStatus(lockedId)).Value;
            Assert.Equal(AccountStatuses.Active, afterExpiry.Status);
            Assert.Null(afterExpiry.LockReason);

            AccountUnlocked autoEvent = Assert.Single(eventBus.PublishedEvents) as AccountUnlocked
                ?? throw new InvalidOperationException("Expected AccountUnlocked.");
            Assert.Equal(UnlockKind.AutoExpired, autoEvent.Kind);
            Assert.Equal(expiredSanctionId, autoEvent.SanctionId);

            // Lock permanently then unlock manually cleanly.
            Guid permSanction = UuidV7.NewGuid(clock.UtcNow);
            Guid actorAdmin = UuidV7.NewGuid(clock.UtcNow);
            Assert.True((await contract.LockAccount(lockedId, LockType.Permanent, null, "Abuse", permSanction, actorAdmin)).IsSuccess);
            Assert.True((await contract.UnlockAccount(lockedId, "Appeal granted", actorAdmin)).IsSuccess);
            Assert.Equal(AccountStatuses.Active, (await contract.GetAccountStatus(lockedId)).Value.Status);
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    [Fact]
    public async Task LockAccount_ParticipatesInAmbientModerationTransaction_RollbackAndCommit()
    {
        string dbName = $"idn_tx_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            await setupDb.Database.MigrateAsync();

            User learner = User.CreateWithPassword(
                UuidV7.NewGuid(BaseUtc),
                EmailAddress.Create("sanction@test.local").Value,
                "hash",
                BaseUtc).Value;
            byte[] tokenHash = Enumerable.Repeat((byte)0x55, 32).ToArray();
            Assert.True(learner.IssueRefreshSession(UuidV7.NewGuid(), tokenHash, BaseUtc.AddDays(14), BaseUtc).IsSuccess);
            learner.ClearDomainEvents();
            setupDb.Users.Add(learner);
            await setupDb.SaveChangesAsync();

            Guid actorAdmin = UuidV7.NewGuid(BaseUtc);
            Guid sanctionId = UuidV7.NewGuid(BaseUtc);

            // 1. Ambient transaction ROLLBACK must roll back Identity lock & session revocation.
            await using (MySqlConnection modConn = new(connectionString))
            {
                await modConn.OpenAsync();
                await using MySqlTransaction modTx = await modConn.BeginTransactionAsync();

                AmbientTransactionAccessor accessor = new();
                await using IdentityDbContext scopedDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                IdentityContractService contract = new(
                    scopedDb,
                    new MutableTestClock(BaseUtc.AddMinutes(5)),
                    new TestEventCollector(),
                    NullLogger<IdentityContractService>.Instance,
                    accessor);

                using (accessor.Push(new ModerationTxContext(modConn, modTx, CancellationToken.None)))
                {
                    Result res = await contract.LockAccount(
                        learner.Id,
                        LockType.Permanent,
                        null,
                        "Rollback test",
                        sanctionId,
                        actorAdmin);
                    Assert.True(res.IsSuccess);
                }

                await modTx.RollbackAsync();
            }

            await using IdentityDbContext verifyRollbackDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            User afterRollback = await verifyRollbackDb.Users.Include(u => u.RefreshSessions).AsNoTracking().SingleAsync(u => u.Id == learner.Id);
            Assert.Equal(AccountStatus.Active, afterRollback.AccountStatus);
            Assert.Null(Assert.Single(afterRollback.RefreshSessions).RevokedAt);

            // 2. Ambient transaction COMMIT persists lock and revoked refresh session atomically.
            await using (MySqlConnection modConn = new(connectionString))
            {
                await modConn.OpenAsync();
                await using MySqlTransaction modTx = await modConn.BeginTransactionAsync();

                AmbientTransactionAccessor accessor = new();
                await using IdentityDbContext scopedDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                IdentityContractService contract = new(
                    scopedDb,
                    new MutableTestClock(BaseUtc.AddMinutes(10)),
                    new TestEventCollector(),
                    NullLogger<IdentityContractService>.Instance,
                    accessor);

                using (accessor.Push(new ModerationTxContext(modConn, modTx, CancellationToken.None)))
                {
                    Result res = await contract.LockAccount(
                        learner.Id,
                        LockType.Temporary,
                        BaseUtc.AddDays(3),
                        "Commit test",
                        sanctionId,
                        actorAdmin);
                    Assert.True(res.IsSuccess);
                }

                await modTx.CommitAsync();
            }

            await using IdentityDbContext verifyCommitDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            User afterCommit = await verifyCommitDb.Users.Include(u => u.RefreshSessions).AsNoTracking().SingleAsync(u => u.Id == learner.Id);
            Assert.Equal(AccountStatus.LockedTemporary, afterCommit.AccountStatus);
            Assert.Equal(SessionRevokeReason.AccountLocked, Assert.Single(afterCommit.RefreshSessions).RevokeReason);
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    [Fact]
    public async Task LockAccount_ConcurrentLastTwoAdmins_AllowsExactlyOneAndRejectsOtherWithLastAdmin()
    {
        string dbName = $"idn_race_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            await setupDb.Database.MigrateAsync();

            User admin1 = User.CreateWithPassword(UuidV7.NewGuid(BaseUtc), EmailAddress.Create("race1@test.local").Value, "hash", BaseUtc).Value;
            User admin2 = User.CreateWithPassword(UuidV7.NewGuid(BaseUtc), EmailAddress.Create("race2@test.local").Value, "hash", BaseUtc).Value;
            setupDb.Users.AddRange(admin1, admin2);
            setupDb.AdminGrants.AddRange(
                AdminGrant.Create(UuidV7.NewGuid(BaseUtc), admin1.Id, BaseUtc).Value,
                AdminGrant.Create(UuidV7.NewGuid(BaseUtc), admin2.Id, BaseUtc).Value);
            await setupDb.SaveChangesAsync();

            using Barrier startBarrier = new(2);
            Task<Result> lockAdmin2Task = Task.Run(async () =>
            {
                await using IdentityDbContext db1 = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                IdentityContractService svc1 = new(
                    db1,
                    new MutableTestClock(BaseUtc.AddMinutes(1)),
                    new TestEventCollector(),
                    NullLogger<IdentityContractService>.Instance);

                startBarrier.SignalAndWait();
                return await svc1.LockAccount(admin2.Id, LockType.Permanent, null, "Race 1", UuidV7.NewGuid(), admin1.Id);
            });

            Task<Result> lockAdmin1Task = Task.Run(async () =>
            {
                await using IdentityDbContext db2 = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                IdentityContractService svc2 = new(
                    db2,
                    new MutableTestClock(BaseUtc.AddMinutes(1)),
                    new TestEventCollector(),
                    NullLogger<IdentityContractService>.Instance);

                startBarrier.SignalAndWait();
                return await svc2.LockAccount(admin1.Id, LockType.Permanent, null, "Race 2", UuidV7.NewGuid(), admin2.Id);
            });

            Result[] results = await Task.WhenAll(lockAdmin2Task, lockAdmin1Task);

            Assert.Equal(1, results.Count(static r => r.IsSuccess));
            Result failure = Assert.Single(results, static r => r.IsFailure);
            Assert.Equal(ErrorCodes.LastAdmin, failure.Error.Code);

            await using IdentityDbContext verifyDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            int remainingActiveAdmins = await verifyDb.AdminGrants
                .Where(g => g.RevokedAt == null)
                .Join(verifyDb.Users, g => g.UserId, u => u.Id, (g, u) => u.AccountStatus)
                .CountAsync(status => status == AccountStatus.Active);

            Assert.Equal(1, remainingActiveAdmins);
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    private sealed record ModerationTxContext(
        DbConnection Connection,
        DbTransaction Transaction,
        CancellationToken CancellationToken) : IModerationTxContext;
}

