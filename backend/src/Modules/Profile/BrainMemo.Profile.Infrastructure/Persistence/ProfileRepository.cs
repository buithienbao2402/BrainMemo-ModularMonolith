using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Profile.Infrastructure.Persistence;

public sealed class ProfileRepository(
    ProfileDbContext dbContext,
    ILogger<ProfileRepository>? logger = null) : IProfileRepository
{
    public async Task<UserProfile?> FindByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.UserProfiles
            .FirstOrDefaultAsync(p => p.Id == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<UserProfile>> FindByUserIdsAsync(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        return await dbContext.UserProfiles
            .Where(p => userIds.Contains(p.Id))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<Result> AddAsync(UserProfile profile, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(profile);

        try
        {
            await dbContext.UserProfiles.AddAsync(profile, ct).ConfigureAwait(false);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogWarning(ex, "Failed to insert profile for user {UserId}. Record may already exist.", profile.UserId);
            return Error.Conflict("PROFILE_EXISTS", "Hồ sơ người dùng đã tồn tại.");
        }
    }

    public async Task<Result> UpdateAsync(UserProfile profile, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(profile);

        try
        {
            dbContext.UserProfiles.Update(profile);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogError(ex, "Failed to update profile for user {UserId}", profile.UserId);
            return new Error("INTERNAL_SERVER_ERROR", "Lỗi khi cập nhật hồ sơ người dùng.");
        }
    }
}
