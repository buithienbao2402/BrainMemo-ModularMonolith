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
        => dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);

    private static bool IsEmailDuplicateKeyException(DbUpdateException ex)
        => ex.InnerException is MySqlException { Number: MySqlDuplicateKeyErrorNumber } mysqlEx
           && mysqlEx.Message.Contains("uk_idn_user_email", StringComparison.OrdinalIgnoreCase);
}
