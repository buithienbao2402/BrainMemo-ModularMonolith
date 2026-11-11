using System.Data;
using System.Data.Common;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.Events;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace BrainMemo.Identity.Infrastructure.Contracts;

/// <summary>
/// EF Core / MySQL 8 implementation of <see cref="IIdentityContract"/> with atomic last-admin locking
/// and ambient <see cref="IModerationTransaction"/> participation (DEC-04).
/// </summary>
internal sealed class IdentityContractService(
    IdentityDbContext dbContext,
    IClock clock,
    IEventBus eventBus,
    ILogger<IdentityContractService> logger,
    IAmbientTransactionAccessor? ambientTransactionAccessor = null)
    : IIdentityContract
{
    private const int MySqlDeadlockErrorNumber = 1213;

    public async Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        User? user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == userId, ct)
            .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        if (user.IsTemporaryLockExpired(utcNow))
        {
            bool unlockedNow = await TryAutoUnlockExpiredAsync(user, utcNow, ct).ConfigureAwait(false);
            if (unlockedNow || user.GetEffectiveStatus(utcNow) == AccountStatus.Active)
            {
                return new AccountStatusDto(
                    AccountStatuses.Active,
                    null,
                    null,
                    user.IsEmailVerified);
            }
        }

        return new AccountStatusDto(
            user.AccountStatus.ToDatabaseValue(),
            user.LockedUntil,
            user.LockReason,
            user.IsEmailVerified);
    }

    public async Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty)
        {
            return false;
        }

        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        bool isAdmin = await dbContext.AdminGrants
            .AsNoTracking()
            .AnyAsync(g => g.UserId == userId && g.RevokedAt == null, ct)
            .ConfigureAwait(false);

        return isAdmin;
    }

    public async Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty)
        {
            return false;
        }

        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        DateTimeOffset utcNow = clock.UtcNow;

        var activeAdminUsers = await dbContext.AdminGrants
            .AsNoTracking()
            .Where(g => g.RevokedAt == null)
            .Join(
                dbContext.Users.AsNoTracking(),
                g => g.UserId,
                u => u.Id,
                (g, u) => new { g.UserId, u.AccountStatus, u.LockedUntil })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        if (!activeAdminUsers.Any(a => a.UserId == userId))
        {
            return false;
        }

        bool hasAnotherActiveAdmin = activeAdminUsers.Any(a =>
            a.UserId != userId
            && IsEffectivelyActive(a.AccountStatus, a.LockedUntil, utcNow));

        return !hasAnotherActiveAdmin;
    }

    public async Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(
        IReadOnlyList<Guid> userIds,
        CancellationToken ct = default)
    {
        if (userIds is null)
        {
            return Error.Validation("Danh sách userIds không được để trống.");
        }

        Guid[] distinctIds = userIds
            .Where(static id => id != Guid.Empty)
            .Distinct()
            .ToArray();

        if (distinctIds.Length == 0)
        {
            return Array.Empty<UserSummaryDto>();
        }

        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        DateTimeOffset utcNow = clock.UtcNow;

        var rows = await dbContext.Users
            .AsNoTracking()
            .Where(u => distinctIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.AccountStatus,
                u.LockedUntil,
                u.CreatedAt,
                u.Email,
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        UserSummaryDto[] summaries = rows
            .Select(r =>
            {
                string effectiveStatus = IsEffectivelyActive(r.AccountStatus, r.LockedUntil, utcNow)
                    ? AccountStatuses.Active
                    : r.AccountStatus.ToDatabaseValue();

                return new UserSummaryDto(r.Id, effectiveStatus, r.CreatedAt, r.Email);
            })
            .ToArray();

        return summaries;
    }

    public async Task<Result<Page<Guid>>> ListActiveUserIds(
        Guid? afterId,
        int limit,
        CancellationToken ct = default)
    {
        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        int normalizedLimit = new CursorPageRequest(afterId, limit).Normalize().PageSize;
        DateTimeOffset utcNow = clock.UtcNow;

        List<Guid> fetched = dbContext.Database.IsRelational()
            ? await FetchActiveUserIdsRelationalAsync(afterId, normalizedLimit + 1, utcNow, ct).ConfigureAwait(false)
            : await FetchActiveUserIdsInMemoryAsync(afterId, normalizedLimit + 1, utcNow, ct).ConfigureAwait(false);

        bool hasMore = fetched.Count > normalizedLimit;
        if (hasMore)
        {
            fetched.RemoveAt(fetched.Count - 1);
        }

        Guid? nextCursor = fetched.Count > 0 ? fetched[^1] : null;
        return new Page<Guid>(fetched, nextCursor, hasMore);
    }

    public async Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default)
    {
        Result<EmailAddress> emailResult = EmailAddress.Create(email);
        if (emailResult.IsFailure)
        {
            return emailResult.Error;
        }

        await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        Guid? userId = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Email == emailResult.Value.Value)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);

        return userId;
    }

    public async Task<Result> LockAccount(
        Guid userId,
        LockType type,
        DateTimeOffset? until,
        string reason,
        Guid sanctionId,
        Guid actorAdminId,
        CancellationToken ct = default)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        Result validationResult = ValidateLockInputs(userId, type, until, reason, sanctionId, actorAdminId, utcNow);
        if (validationResult.IsFailure)
        {
            return validationResult;
        }

        if (userId == actorAdminId)
        {
            return Error.Conflict(ErrorCodes.SelfLock, "Bạn không thể tự khóa tài khoản của chính mình.");
        }

        bool isAmbient = await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);
        if (isAmbient)
        {
            return await ExecuteLockAttemptAsync(
                    userId,
                    type,
                    until,
                    reason,
                    sanctionId,
                    utcNow,
                    isOwnedTransaction: false,
                    ct)
                .ConfigureAwait(false);
        }

        return await ExecuteWithDeadlockRetryAsync(
                async () => await ExecuteLockWithOwnedTransactionAsync(
                        userId,
                        type,
                        until,
                        reason,
                        sanctionId,
                        utcNow,
                        ct)
                    .ConfigureAwait(false),
                ct)
            .ConfigureAwait(false);
    }

    public async Task<Result> UnlockAccount(
        Guid userId,
        string reason,
        Guid actorAdminId,
        CancellationToken ct = default)
    {
        if (userId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (actorAdminId == Guid.Empty)
        {
            return Error.Validation("ID quản trị viên thực hiện không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > User.MaxLockReasonLength)
        {
            return Error.Validation($"Lý do mở khóa tài khoản phải từ 1 đến {User.MaxLockReasonLength} ký tự.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        bool isAmbient = await TryEnlistAmbientTransactionAsync(ct).ConfigureAwait(false);

        if (isAmbient)
        {
            return await ExecuteUnlockAttemptAsync(userId, utcNow, isOwnedTransaction: false, ct)
                .ConfigureAwait(false);
        }

        if (!dbContext.Database.IsRelational())
        {
            return await ExecuteUnlockAttemptAsync(userId, utcNow, isOwnedTransaction: false, ct)
                .ConfigureAwait(false);
        }

        await using IDbContextTransaction tx = await dbContext.Database
            .BeginTransactionAsync(ct)
            .ConfigureAwait(false);

        try
        {
            Result outcome = await ExecuteUnlockAttemptAsync(userId, utcNow, isOwnedTransaction: true, ct)
                .ConfigureAwait(false);

            if (outcome.IsFailure)
            {
                await tx.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
                return outcome;
            }

            return outcome;
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            throw;
        }
    }

    private async Task<Result> ExecuteLockWithOwnedTransactionAsync(
        Guid userId,
        LockType type,
        DateTimeOffset? until,
        string reason,
        Guid sanctionId,
        DateTimeOffset utcNow,
        CancellationToken ct)
    {
        if (!dbContext.Database.IsRelational())
        {
            return await ExecuteLockAttemptAsync(
                    userId,
                    type,
                    until,
                    reason,
                    sanctionId,
                    utcNow,
                    isOwnedTransaction: false,
                    ct)
                .ConfigureAwait(false);
        }

        await using IDbContextTransaction tx = await dbContext.Database
            .BeginTransactionAsync(ct)
            .ConfigureAwait(false);

        try
        {
            Result outcome = await ExecuteLockAttemptAsync(
                    userId,
                    type,
                    until,
                    reason,
                    sanctionId,
                    utcNow,
                    isOwnedTransaction: true,
                    ct)
                .ConfigureAwait(false);

            if (outcome.IsFailure)
            {
                await tx.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            }

            return outcome;
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            throw;
        }
    }

    private async Task<Result> ExecuteLockAttemptAsync(
        Guid userId,
        LockType type,
        DateTimeOffset? until,
        string reason,
        Guid sanctionId,
        DateTimeOffset utcNow,
        bool isOwnedTransaction,
        CancellationToken ct)
    {
        bool relational = dbContext.Database.IsRelational();
        byte[] userIdBytes = userId.ToByteArray(true);

        // Step 1: Lock all active admin grant rows in deterministic ID order to prevent deadlocks (THIET_KE_CSDL §3.1.6.2).
        List<Guid> activeAdminUserIds = relational
            ? await dbContext.AdminGrants
                .FromSqlRaw(
                    "SELECT id, user_id, granted_at, granted_by_user_id, revoked_at, revoked_by_user_id, active_marker "
                    + "FROM idn_admin_grant WHERE active_marker = 1 ORDER BY id FOR UPDATE")
                .AsNoTracking()
                .Select(g => g.UserId)
                .ToListAsync(ct)
                .ConfigureAwait(false)
            : await dbContext.AdminGrants
                .AsNoTracking()
                .Where(g => g.RevokedAt == null)
                .OrderBy(g => g.Id)
                .Select(g => g.UserId)
                .ToListAsync(ct)
                .ConfigureAwait(false);

        // Step 2: Load target user + active sessions inside the transaction.
        User? user = relational
            ? await dbContext.Users
                .FromSqlInterpolated(
                    $"SELECT id, email, password_hash, email_verified_at, account_status, locked_at, locked_until, lock_reason, lock_sanction_id, created_at, updated_at FROM idn_user WHERE id = {userIdBytes} FOR UPDATE")
                .FirstOrDefaultAsync(ct)
                .ConfigureAwait(false)
            : await dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct)
                .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        // Step 3: Idempotent by sanctionId when already locked under that sanction.
        if (user.LockSanctionId == sanctionId && user.AccountStatus != AccountStatus.Active)
        {
            return Result.Success();
        }

        // Step 4: Enforce atomic "last ACTIVE admin" invariant.
        if (activeAdminUserIds.Contains(userId))
        {
            bool hasAnotherActiveAdmin = await HasAnotherActiveAdminLockedAsync(userId, utcNow, relational, ct)
                .ConfigureAwait(false);

            if (!hasAnotherActiveAdmin)
            {
                return Error.Conflict(
                    ErrorCodes.LastAdmin,
                    "Không thể khóa quản trị viên cuối cùng của hệ thống.");
            }
        }

        // Attach active refresh sessions so domain Lock() revokes them atomically.
        if (relational)
        {
            _ = await dbContext.RefreshSessions
                .FromSqlInterpolated(
                    $"SELECT id, user_id, token_hash, user_agent, ip_address, created_at, last_used_at, expires_at, revoked_at, revoke_reason FROM idn_refresh_session WHERE user_id = {userIdBytes} AND revoked_at IS NULL FOR UPDATE")
                .ToListAsync(ct)
                .ConfigureAwait(false);
        }
        else
        {
            _ = await dbContext.RefreshSessions
                .Where(s => s.UserId == userId && s.RevokedAt == null)
                .ToListAsync(ct)
                .ConfigureAwait(false);
        }

        Result lockResult = user.Lock(
            isPermanent: type == LockType.Permanent,
            lockedUntil: until,
            reason: reason,
            sanctionId: sanctionId,
            utcNow: utcNow);

        if (lockResult.IsFailure)
        {
            return lockResult;
        }

        IntegrationEvent[] eventsToPublish = CollectIntegrationEvents(user);

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        if (isOwnedTransaction && dbContext.Database.CurrentTransaction is { } currentTx)
        {
            await currentTx.CommitAsync(ct).ConfigureAwait(false);
        }

        await PublishEventsAsync(eventsToPublish, ct).ConfigureAwait(false);
        return Result.Success();
    }

    private async Task<Result> ExecuteUnlockAttemptAsync(
        Guid userId,
        DateTimeOffset utcNow,
        bool isOwnedTransaction,
        CancellationToken ct)
    {
        bool relational = dbContext.Database.IsRelational();
        byte[] userIdBytes = userId.ToByteArray(true);

        User? user = relational
            ? await dbContext.Users
                .FromSqlInterpolated(
                    $"SELECT id, email, password_hash, email_verified_at, account_status, locked_at, locked_until, lock_reason, lock_sanction_id, created_at, updated_at FROM idn_user WHERE id = {userIdBytes} FOR UPDATE")
                .FirstOrDefaultAsync(ct)
                .ConfigureAwait(false)
            : await dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct)
                .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        Result unlockResult = user.UnlockManual(utcNow);
        if (unlockResult.IsFailure)
        {
            return unlockResult;
        }

        IntegrationEvent[] eventsToPublish = CollectIntegrationEvents(user);

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        if (isOwnedTransaction && dbContext.Database.CurrentTransaction is { } currentTx)
        {
            await currentTx.CommitAsync(ct).ConfigureAwait(false);
        }

        await PublishEventsAsync(eventsToPublish, ct).ConfigureAwait(false);
        return Result.Success();
    }

    private async Task<bool> HasAnotherActiveAdminLockedAsync(
        Guid targetAdminUserId,
        DateTimeOffset utcNow,
        bool relational,
        CancellationToken ct)
    {
        if (!relational)
        {
            List<Guid> otherIds = await dbContext.AdminGrants
                .AsNoTracking()
                .Where(g => g.RevokedAt == null && g.UserId != targetAdminUserId)
                .Select(g => g.UserId)
                .Distinct()
                .ToListAsync(ct)
                .ConfigureAwait(false);

            if (otherIds.Count == 0)
            {
                return false;
            }

            var otherAdmins = await dbContext.Users
                .AsNoTracking()
                .Where(u => otherIds.Contains(u.Id))
                .Select(u => new { u.AccountStatus, u.LockedUntil })
                .ToListAsync(ct)
                .ConfigureAwait(false);

            return otherAdmins.Any(a => IsEffectivelyActive(a.AccountStatus, a.LockedUntil, utcNow));
        }

        byte[] targetBytes = targetAdminUserId.ToByteArray(true);
        var lockedOtherAdmins = await dbContext.Users
            .FromSqlInterpolated(
                $"SELECT u.id, u.email, u.password_hash, u.email_verified_at, u.account_status, u.locked_at, u.locked_until, u.lock_reason, u.lock_sanction_id, u.created_at, u.updated_at FROM idn_user u INNER JOIN idn_admin_grant g ON g.user_id = u.id WHERE g.active_marker = 1 AND u.id <> {targetBytes} ORDER BY u.id FOR UPDATE")
            .AsNoTracking()
            .Select(u => new { u.AccountStatus, u.LockedUntil })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return lockedOtherAdmins.Any(a => IsEffectivelyActive(a.AccountStatus, a.LockedUntil, utcNow));
    }

    private async Task<bool> TryAutoUnlockExpiredAsync(
        User snapshotUser,
        DateTimeOffset utcNow,
        CancellationToken ct)
    {
        Guid sanctionId = snapshotUser.LockSanctionId ?? Guid.Empty;

        if (!dbContext.Database.IsRelational())
        {
            User? tracked = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == snapshotUser.Id, ct)
                .ConfigureAwait(false);

            if (tracked is null)
            {
                return false;
            }

            Guid? unlockedSanctionId = tracked.UnlockIfExpired(utcNow);
            if (!unlockedSanctionId.HasValue)
            {
                return false;
            }

            IntegrationEvent[] events = CollectIntegrationEvents(tracked);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            await PublishEventsAsync(events, ct).ConfigureAwait(false);
            return true;
        }

        byte[] userIdBytes = snapshotUser.Id.ToByteArray(true);
        DateTime utcNowDateTime = utcNow.UtcDateTime;

        int affected = await dbContext.Database
            .ExecuteSqlInterpolatedAsync(
                $"UPDATE idn_user SET account_status = 'ACTIVE', locked_at = NULL, locked_until = NULL, lock_reason = NULL, lock_sanction_id = NULL, updated_at = {utcNowDateTime} WHERE id = {userIdBytes} AND account_status = 'LOCKED_TEMPORARY' AND locked_until IS NOT NULL AND locked_until <= {utcNowDateTime}",
                ct)
            .ConfigureAwait(false);

        if (affected == 1)
        {
            await eventBus
                .Publish(
                    new AccountUnlocked(
                        UuidV7.NewGuid(utcNow),
                        utcNow,
                        snapshotUser.Id,
                        sanctionId,
                        UnlockKind.AutoExpired),
                    ct)
                .ConfigureAwait(false);
            return true;
        }

        return false;
    }

    private async Task<List<Guid>> FetchActiveUserIdsRelationalAsync(
        Guid? afterId,
        int take,
        DateTimeOffset utcNow,
        CancellationToken ct)
    {
        DbConnection connection = dbContext.Database.GetDbConnection();
        bool shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(ct).ConfigureAwait(false);
        }

        try
        {
            await using DbCommand command = connection.CreateCommand();
            if (dbContext.Database.CurrentTransaction is { } efTx)
            {
                command.Transaction = efTx.GetDbTransaction();
            }

            command.CommandText = afterId.HasValue
                ? "SELECT id FROM idn_user "
                  + "WHERE (account_status = 'ACTIVE' OR (account_status = 'LOCKED_TEMPORARY' AND locked_until IS NOT NULL AND locked_until <= @utcNow)) "
                  + "AND id > @afterId "
                  + "ORDER BY id ASC LIMIT @take"
                : "SELECT id FROM idn_user "
                  + "WHERE (account_status = 'ACTIVE' OR (account_status = 'LOCKED_TEMPORARY' AND locked_until IS NOT NULL AND locked_until <= @utcNow)) "
                  + "ORDER BY id ASC LIMIT @take";

            DbParameter utcParam = command.CreateParameter();
            utcParam.ParameterName = "@utcNow";
            utcParam.Value = utcNow.UtcDateTime;
            command.Parameters.Add(utcParam);

            if (afterId.HasValue)
            {
                DbParameter afterParam = command.CreateParameter();
                afterParam.ParameterName = "@afterId";
                afterParam.Value = afterId.Value.ToByteArray(true);
                command.Parameters.Add(afterParam);
            }

            DbParameter takeParam = command.CreateParameter();
            takeParam.ParameterName = "@take";
            takeParam.Value = take;
            command.Parameters.Add(takeParam);

            List<Guid> ids = [];
            byte[] buffer = new byte[16];
            await using DbDataReader reader = await command.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                long read = reader.GetBytes(0, 0, buffer, 0, 16);
                if (read == 16)
                {
                    ids.Add(new Guid(buffer, true));
                }
            }

            return ids;
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync().ConfigureAwait(false);
            }
        }
    }

    private async Task<List<Guid>> FetchActiveUserIdsInMemoryAsync(
        Guid? afterId,
        int take,
        DateTimeOffset utcNow,
        CancellationToken ct)
    {
        List<Guid> activeIds = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.AccountStatus == AccountStatus.Active
                || (u.AccountStatus == AccountStatus.LockedTemporary
                    && u.LockedUntil != null
                    && u.LockedUntil <= utcNow))
            .Select(u => u.Id)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return activeIds
            .Where(id => !afterId.HasValue || CompareBigEndian(id, afterId.Value) > 0)
            .OrderBy(static id => id, BigEndianGuidComparer.Instance)
            .Take(take)
            .ToList();
    }

    private async Task<bool> TryEnlistAmbientTransactionAsync(CancellationToken ct)
    {
        IModerationTxContext? ambient = ambientTransactionAccessor?.Current;
        if (ambient is null)
        {
            return false;
        }

        if (dbContext.Database.IsRelational())
        {
            if (dbContext.Database.GetDbConnection() != ambient.Connection)
            {
                await dbContext.Database.CloseConnectionAsync().ConfigureAwait(false);
                dbContext.Database.SetDbConnection(ambient.Connection, contextOwnsConnection: false);
            }

            if (dbContext.Database.CurrentTransaction is null)
            {
                await dbContext.Database.UseTransactionAsync(ambient.Transaction, ct).ConfigureAwait(false);
            }
        }

        return true;
    }

    private async Task<Result> ExecuteWithDeadlockRetryAsync(Func<Task<Result>> action, CancellationToken ct)
    {
        try
        {
            return await action().ConfigureAwait(false);
        }
        catch (DbUpdateException ex) when (IsDeadlock(ex) && !ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Deadlock encountered during Identity lock transaction; retrying once.");
            dbContext.ChangeTracker.Clear();
            return await action().ConfigureAwait(false);
        }
        catch (MySqlException ex) when (ex.Number == MySqlDeadlockErrorNumber && !ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "MySQL deadlock 1213 encountered during Identity lock transaction; retrying once.");
            dbContext.ChangeTracker.Clear();
            return await action().ConfigureAwait(false);
        }
    }

    private static bool IsDeadlock(DbUpdateException ex)
        => ex.InnerException is MySqlException { Number: MySqlDeadlockErrorNumber };

    private static Result ValidateLockInputs(
        Guid userId,
        LockType type,
        DateTimeOffset? until,
        string reason,
        Guid sanctionId,
        Guid actorAdminId,
        DateTimeOffset utcNow)
    {
        if (userId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (sanctionId == Guid.Empty)
        {
            return Error.Validation("ID quyết định xử phạt không hợp lệ.");
        }

        if (actorAdminId == Guid.Empty)
        {
            return Error.Validation("ID quản trị viên thực hiện không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > User.MaxLockReasonLength)
        {
            return Error.Validation($"Lý do khóa tài khoản phải từ 1 đến {User.MaxLockReasonLength} ký tự.");
        }

        if (type == LockType.Temporary)
        {
            if (!until.HasValue || until.Value <= utcNow)
            {
                return Error.Validation("Khóa tài khoản có thời hạn phải có thời điểm kết thúc lớn hơn hiện tại.");
            }
        }
        else if (until.HasValue)
        {
            return Error.Validation("Khóa tài khoản vĩnh viễn không được có thời hạn until.");
        }

        return Result.Success();
    }

    private static bool IsEffectivelyActive(
        AccountStatus status,
        DateTimeOffset? lockedUntil,
        DateTimeOffset utcNow)
        => status == AccountStatus.Active
           || (status == AccountStatus.LockedTemporary
               && lockedUntil.HasValue
               && lockedUntil.Value <= utcNow);

    private static IntegrationEvent[] CollectIntegrationEvents(User user)
    {
        if (user.DomainEvents.Count == 0)
        {
            return [];
        }

        List<IntegrationEvent> events = [];

        foreach (IDomainEvent domainEvent in user.DomainEvents)
        {
            switch (domainEvent)
            {
                case AccountLockedDomainEvent locked:
                    events.Add(new AccountLocked(
                        locked.EventId,
                        locked.OccurredAt,
                        locked.UserId,
                        locked.Status == AccountStatus.LockedPermanent ? LockType.Permanent : LockType.Temporary,
                        locked.LockedUntil,
                        locked.SanctionId));
                    break;

                case AccountUnlockedDomainEvent unlocked:
                    events.Add(new AccountUnlocked(
                        unlocked.EventId,
                        unlocked.OccurredAt,
                        unlocked.UserId,
                        unlocked.SanctionId,
                        unlocked.IsAutoExpired ? UnlockKind.AutoExpired : UnlockKind.Manual));
                    break;
            }
        }

        user.ClearDomainEvents();
        return [.. events];
    }

    private async Task PublishEventsAsync(IntegrationEvent[] events, CancellationToken ct)
    {
        foreach (IntegrationEvent integrationEvent in events)
        {
            await eventBus.Publish(integrationEvent, ct).ConfigureAwait(false);
        }
    }

    private static int CompareBigEndian(Guid left, Guid right)
    {
        Span<byte> leftBytes = stackalloc byte[16];
        Span<byte> rightBytes = stackalloc byte[16];
        left.TryWriteBytes(leftBytes, bigEndian: true, out _);
        right.TryWriteBytes(rightBytes, bigEndian: true, out _);
        return leftBytes.SequenceCompareTo(rightBytes);
    }

    private sealed class BigEndianGuidComparer : IComparer<Guid>
    {
        public static readonly BigEndianGuidComparer Instance = new();

        public int Compare(Guid x, Guid y) => CompareBigEndian(x, y);
    }
}

