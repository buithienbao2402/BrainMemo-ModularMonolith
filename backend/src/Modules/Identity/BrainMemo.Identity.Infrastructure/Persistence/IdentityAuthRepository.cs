using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BrainMemo.Identity.Infrastructure.Persistence;

internal sealed class IdentityAuthRepository(IdentityDbContext dbContext) : IIdentityAuthRepository
{
    private const int MySqlDuplicateKeyErrorNumber = 1062;

    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default)
        => dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == normalizedEmail, ct);

    public async Task<Result> AddUserAndSaveAsync(User user, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(user);

        await dbContext.Users.AddAsync(user, ct).ConfigureAwait(false);

        try
        {
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex) when (IsEmailDuplicateKeyException(ex))
        {
            dbContext.ChangeTracker.Clear();
            return Error.Conflict(ErrorCodes.EmailTaken, "Địa chỉ email đã được sử dụng.");
        }
    }

    public async Task<Guid?> TryConsumeUserTokenAsync(
        UserTokenPurpose purpose,
        byte[] tokenHash,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(tokenHash);

        if (dbContext.Database.IsRelational())
        {
            string purposeDb = purpose.ToDatabaseValue();
            DateTime utcNowDt = utcNow.UtcDateTime;

            int affected = await dbContext.Database
                .ExecuteSqlInterpolatedAsync(
                    $"UPDATE idn_user_token SET consumed_at = {utcNowDt} WHERE token_hash = {tokenHash} AND purpose = {purposeDb} AND consumed_at IS NULL AND expires_at > {utcNowDt}",
                    ct)
                .ConfigureAwait(false);

            if (affected != 1)
            {
                return null;
            }

            return await dbContext.UserTokens
                .AsNoTracking()
                .Where(t => t.TokenHash == tokenHash && t.Purpose == purpose)
                .Select(t => (Guid?)t.UserId)
                .FirstOrDefaultAsync(ct)
                .ConfigureAwait(false);
        }

        List<UserToken> candidates = await dbContext.UserTokens
            .Where(t => t.Purpose == purpose)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        UserToken? matched = candidates.FirstOrDefault(
            t => t.TokenHash.AsSpan().SequenceEqual(tokenHash));

        if (matched is null)
        {
            return null;
        }

        Result consumeResult = matched.Consume(utcNow);
        if (consumeResult.IsFailure)
        {
            return null;
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return matched.UserId;
    }

    public Task<User?> FindUserByIdAsync(Guid userId, CancellationToken ct = default)
        => dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<User?> FindUserByEmailAsync(string normalizedEmail, CancellationToken ct = default)
        => dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

    public Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct = default)
        => dbContext.AdminGrants
            .AsNoTracking()
            .AnyAsync(g => g.UserId == userId && g.RevokedAt == null, ct);

    public async Task<Result> SaveUserAsync(User user, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(user);

        foreach (RefreshSession session in user.RefreshSessions)
        {
            if (dbContext.Entry(session).State == EntityState.Detached)
            {
                await dbContext.RefreshSessions.AddAsync(session, ct).ConfigureAwait(false);
            }
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }

    public async Task<RefreshSession?> FindSessionByTokenHashAsync(byte[] tokenHash, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(tokenHash);

        if (dbContext.Database.IsRelational())
        {
            return await dbContext.RefreshSessions
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct)
                .ConfigureAwait(false);
        }

        List<RefreshSession> all = await dbContext.RefreshSessions.ToListAsync(ct).ConfigureAwait(false);
        return all.FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(tokenHash));
    }

    public async Task<bool> TryRotateSessionAsync(
        byte[] oldTokenHash,
        byte[] newTokenHash,
        DateTimeOffset newExpiresAt,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(oldTokenHash);
        ArgumentNullException.ThrowIfNull(newTokenHash);

        if (dbContext.Database.IsRelational())
        {
            DateTime utcNowDt = utcNow.UtcDateTime;
            DateTime newExpiresAtDt = newExpiresAt.UtcDateTime;

            int affected = await dbContext.Database
                .ExecuteSqlInterpolatedAsync(
                    $"UPDATE idn_refresh_session SET token_hash = {newTokenHash}, last_used_at = {utcNowDt}, expires_at = {newExpiresAtDt} WHERE token_hash = {oldTokenHash} AND revoked_at IS NULL AND expires_at > {utcNowDt}",
                    ct)
                .ConfigureAwait(false);

            return affected == 1;
        }

        RefreshSession? session = await dbContext.RefreshSessions
            .FirstOrDefaultAsync(s => s.TokenHash.SequenceEqual(oldTokenHash), ct)
            .ConfigureAwait(false);

        if (session is null || !session.IsActive(utcNow))
        {
            return false;
        }

        Result rotateResult = session.Rotate(newTokenHash, newExpiresAt, utcNow);
        if (rotateResult.IsFailure)
        {
            return false;
        }

        try
        {
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> RevokeSessionByTokenHashAsync(
        byte[] tokenHash,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(tokenHash);

        if (dbContext.Database.IsRelational())
        {
            DateTime utcNowDt = utcNow.UtcDateTime;
            string reasonDb = reason.ToDatabaseValue();

            int affected = await dbContext.Database
                .ExecuteSqlInterpolatedAsync(
                    $"UPDATE idn_refresh_session SET revoked_at = {utcNowDt}, revoke_reason = {reasonDb} WHERE token_hash = {tokenHash} AND revoked_at IS NULL",
                    ct)
                .ConfigureAwait(false);

            return affected > 0;
        }

        List<RefreshSession> candidates = await dbContext.RefreshSessions
            .Where(s => s.RevokedAt == null)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        RefreshSession? session = candidates.FirstOrDefault(s => s.TokenHash.SequenceEqual(tokenHash));
        if (session is null)
        {
            return false;
        }

        Result revokeResult = session.Revoke(reason, utcNow);
        if (revokeResult.IsFailure)
        {
            return false;
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    public async Task<int> RevokeAllUserSessionsAsync(
        Guid userId,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        if (dbContext.Database.IsRelational())
        {
            DateTime utcNowDt = utcNow.UtcDateTime;
            string reasonDb = reason.ToDatabaseValue();
            byte[] userIdBytes = userId.ToByteArray(true);

            return await dbContext.Database
                .ExecuteSqlInterpolatedAsync(
                    $"UPDATE idn_refresh_session SET revoked_at = {utcNowDt}, revoke_reason = {reasonDb} WHERE user_id = {userIdBytes} AND revoked_at IS NULL",
                    ct)
                .ConfigureAwait(false);
        }

        List<RefreshSession> sessions = await dbContext.RefreshSessions
            .Where(s => s.UserId == userId && s.RevokedAt == null)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        int revoked = 0;
        foreach (RefreshSession session in sessions)
        {
            if (session.Revoke(reason, utcNow).IsSuccess)
            {
                revoked++;
            }
        }

        if (revoked > 0)
        {
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        return revoked;
    }

    public async Task<IReadOnlyList<RefreshSession>> GetActiveSessionsForUserAsync(
        Guid userId,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        return await dbContext.RefreshSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.RevokedAt == null && s.ExpiresAt > utcNow)
            .OrderByDescending(s => s.LastUsedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public Task<RefreshSession?> FindSessionByIdAsync(Guid sessionId, CancellationToken ct = default)
        => dbContext.RefreshSessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct);

    public async Task<bool> RevokeSessionByIdAsync(
        Guid sessionId,
        Guid userId,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        if (dbContext.Database.IsRelational())
        {
            DateTime utcNowDt = utcNow.UtcDateTime;
            string reasonDb = reason.ToDatabaseValue();
            byte[] sessionIdBytes = sessionId.ToByteArray(true);
            byte[] userIdBytes = userId.ToByteArray(true);

            int affected = await dbContext.Database
                .ExecuteSqlInterpolatedAsync(
                    $"UPDATE idn_refresh_session SET revoked_at = {utcNowDt}, revoke_reason = {reasonDb} WHERE id = {sessionIdBytes} AND user_id = {userIdBytes} AND revoked_at IS NULL",
                    ct)
                .ConfigureAwait(false);

            return affected > 0;
        }

        RefreshSession? session = await dbContext.RefreshSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId && s.RevokedAt == null, ct)
            .ConfigureAwait(false);

        if (session is null)
        {
            return false;
        }

        Result revokeResult = session.Revoke(reason, utcNow);
        if (revokeResult.IsFailure)
        {
            return false;
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    private static bool IsEmailDuplicateKeyException(DbUpdateException ex)
        => ex.InnerException is MySqlException { Number: MySqlDuplicateKeyErrorNumber } mysqlEx
           && mysqlEx.Message.Contains("uk_idn_user_email", StringComparison.OrdinalIgnoreCase);
}
