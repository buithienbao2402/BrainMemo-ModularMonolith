using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Admin.DTOs;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BrainMemo.Identity.Infrastructure.Persistence;

public sealed class IdentityAdminRepository(
    IdentityDbContext dbContext,
    IClock clock) : IIdentityAdminRepository
{
    public async Task<AdminUserListResponse> ListUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        CancellationToken ct = default)
    {
        IQueryable<User> query = dbContext.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = search.Trim();
            query = query.Where(u => u.Email.Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            string normStatus = status.Trim().ToUpperInvariant();
            if (Enum.TryParse<AccountStatus>(normStatus, true, out AccountStatus parsedStatus))
            {
                query = query.Where(u => u.AccountStatus == parsedStatus);
            }
        }

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        int totalPages = (int)Math.Ceiling(total / (double)pageSize);

        List<User> users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        List<Guid> userIds = users.Select(u => u.Id).ToList();

        HashSet<Guid> activeAdminIds = (await dbContext.AdminGrants
            .AsNoTracking()
            .Where(g => g.RevokedAt == null && userIds.Contains(g.UserId))
            .Select(g => g.UserId)
            .ToListAsync(ct)
            .ConfigureAwait(false))
            .ToHashSet();

        DateTimeOffset utcNow = clock.UtcNow;

        List<AdminUserDto> dtos = users.Select(u =>
        {
            bool isExpired = u.IsTemporaryLockExpired(utcNow);
            string effectiveStatus = isExpired ? "ACTIVE" : u.AccountStatus.ToDatabaseValue();
            DateTimeOffset? effectiveUntil = isExpired ? null : u.LockedUntil;

            return new AdminUserDto(
                u.Id,
                u.Email,
                effectiveStatus,
                effectiveUntil,
                activeAdminIds.Contains(u.Id),
                u.IsEmailVerified,
                u.CreatedAt);
        }).ToList();

        return new AdminUserListResponse(
            dtos,
            new PageMetaDto(page, pageSize, total, totalPages));
    }

    public async Task<User?> FindUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.AdminGrants
            .AsNoTracking()
            .AnyAsync(g => g.UserId == userId && g.RevokedAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<Result> GrantAdminRoleAsync(
        Guid targetUserId,
        Guid actorAdminId,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        bool alreadyAdmin = await dbContext.AdminGrants
            .AnyAsync(g => g.UserId == targetUserId && g.RevokedAt == null, ct)
            .ConfigureAwait(false);

        if (alreadyAdmin)
        {
            // Idempotent success
            return Result.Success();
        }

        Result<AdminGrant> grantResult = AdminGrant.Create(
            Guid.NewGuid(),
            targetUserId,
            utcNow,
            actorAdminId);

        if (grantResult.IsFailure)
        {
            return grantResult.Error;
        }

        dbContext.AdminGrants.Add(grantResult.Value);
        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success();
    }

    public async Task<Result> RevokeAdminRoleAsync(
        Guid targetUserId,
        Guid actorAdminId,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        bool relational = dbContext.Database.IsRelational();
        IDbContextTransaction? tx = null;

        if (relational && dbContext.Database.CurrentTransaction is null)
        {
            tx = await dbContext.Database.BeginTransactionAsync(ct).ConfigureAwait(false);
        }

        try
        {
            // 1. Lock active admin grant rows in deterministic order (THIET_KE_CSDL §3.1.6.2)
            List<AdminGrant> activeGrants = relational
                ? await dbContext.AdminGrants
                    .FromSqlRaw(
                        "SELECT id, user_id, granted_at, granted_by_user_id, revoked_at, revoked_by_user_id, active_marker "
                        + "FROM idn_admin_grant WHERE active_marker = 1 ORDER BY id FOR UPDATE")
                    .ToListAsync(ct)
                    .ConfigureAwait(false)
                : await dbContext.AdminGrants
                    .Where(g => g.RevokedAt == null)
                    .OrderBy(g => g.Id)
                    .ToListAsync(ct)
                    .ConfigureAwait(false);

            AdminGrant? targetGrant = activeGrants.FirstOrDefault(g => g.UserId == targetUserId);
            if (targetGrant is null)
            {
                // Not an active admin
                return Error.Conflict(ErrorCodes.InvalidState, "Người dùng không phải là quản trị viên hoặc đã bị thu hồi quyền.");
            }

            // 2. Enforce LAST_ADMIN check: ensure there is at least one other active admin
            List<Guid> otherAdminUserIds = activeGrants
                .Where(g => g.UserId != targetUserId)
                .Select(g => g.UserId)
                .Distinct()
                .ToList();

            if (otherAdminUserIds.Count == 0)
            {
                return Error.Conflict(
                    ErrorCodes.LastAdmin,
                    "Không thể thu hồi quyền của quản trị viên cuối cùng của hệ thống.");
            }

            // Verify at least one other admin is effectively active
            List<User> otherAdmins = await dbContext.Users
                .Where(u => otherAdminUserIds.Contains(u.Id))
                .ToListAsync(ct)
                .ConfigureAwait(false);

            bool hasAnotherActiveAdmin = otherAdmins.Any(u =>
                u.AccountStatus == AccountStatus.Active
                || u.IsTemporaryLockExpired(utcNow));

            if (!hasAnotherActiveAdmin)
            {
                return Error.Conflict(
                    ErrorCodes.LastAdmin,
                    "Không thể thu hồi quyền của quản trị viên cuối cùng của hệ thống.");
            }

            // 3. Revoke grant
            Result revokeResult = targetGrant.Revoke(utcNow, actorAdminId);
            if (revokeResult.IsFailure)
            {
                return revokeResult;
            }

            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

            if (tx is not null)
            {
                await tx.CommitAsync(ct).ConfigureAwait(false);
            }

            return Result.Success();
        }
        catch
        {
            if (tx is not null)
            {
                await tx.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            }
            throw;
        }
        finally
        {
            if (tx is not null)
            {
                await tx.DisposeAsync().ConfigureAwait(false);
            }
        }
    }
}
