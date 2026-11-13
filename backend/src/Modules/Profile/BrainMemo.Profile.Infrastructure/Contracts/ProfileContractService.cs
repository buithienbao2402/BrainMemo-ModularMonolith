using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Profile.Infrastructure.Contracts;

public sealed class ProfileContractService(
    IProfileRepository profileRepository,
    IIdentityContract identityContract,
    IFileStorage? fileStorage = null,
    IClock? clock = null,
    ILogger<ProfileContractService>? logger = null) : IProfileContract
{
    private static readonly TimeSpan AvatarUrlTtl = TimeSpan.FromHours(1);

    public async Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default)
    {
        UserProfile? profile = await profileRepository
            .FindByUserIdAsync(userId, ct)
            .ConfigureAwait(false);

        DateTimeOffset utcNow = clock?.UtcNow ?? DateTimeOffset.UtcNow;
        DateTimeOffset joinedAt = utcNow;

        if (profile is null)
        {
            // Self-heal: ensure user exists in Identity before creating default profile
            Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
                .GetUserSummary([userId], ct)
                .ConfigureAwait(false);

            if (summaryResult.IsFailure || summaryResult.Value.Count == 0)
            {
                return Error.NotFound("Không tìm thấy hồ sơ người dùng.");
            }

            joinedAt = summaryResult.Value[0].CreatedAt;

            Result<UserProfile> createResult = UserProfile.CreateDefault(userId, utcNow);
            if (createResult.IsFailure)
            {
                return createResult.Error;
            }

            profile = createResult.Value;
            Result addResult = await profileRepository
                .AddAsync(profile, ct)
                .ConfigureAwait(false);

            if (addResult.IsFailure)
            {
                profile = await profileRepository
                    .FindByUserIdAsync(userId, ct)
                    .ConfigureAwait(false);

                if (profile is null)
                {
                    return new Error("INTERNAL_SERVER_ERROR", "Không thể khởi tạo hồ sơ người dùng.");
                }
            }
        }
        else
        {
            Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
                .GetUserSummary([userId], ct)
                .ConfigureAwait(false);

            if (summaryResult.IsSuccess && summaryResult.Value.Count > 0)
            {
                joinedAt = summaryResult.Value[0].CreatedAt;
            }
            else
            {
                joinedAt = profile.CreatedAt;
            }
        }

        string? avatarUrl = null;
        if (!string.IsNullOrWhiteSpace(profile.AvatarStorageKey) && fileStorage is not null)
        {
            try
            {
                avatarUrl = await fileStorage
                    .CreateDownloadUrl(profile.AvatarStorageKey, AvatarUrlTtl, ct: ct)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to create presigned avatar download URL for public profile {UserId}", userId);
            }
        }

        PublicProfileDto dto = new(
            profile.UserId,
            profile.DisplayName,
            avatarUrl,
            profile.Bio,
            joinedAt,
            profile.ShowCourseList);

        return dto;
    }

    public async Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
    {
        if (userIds.Count == 0)
        {
            return Result.Success<IReadOnlyList<DisplayInfoDto>>([]);
        }

        IReadOnlyList<UserProfile> profiles = await profileRepository
            .FindByUserIdsAsync(userIds, ct)
            .ConfigureAwait(false);

        List<DisplayInfoDto> result = new(profiles.Count);
        foreach (UserProfile profile in profiles)
        {
            string? avatarUrl = null;
            if (!string.IsNullOrWhiteSpace(profile.AvatarStorageKey) && fileStorage is not null)
            {
                try
                {
                    avatarUrl = await fileStorage
                        .CreateDownloadUrl(profile.AvatarStorageKey, AvatarUrlTtl, ct: ct)
                        .ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "Failed to generate presigned avatar URL for user {UserId}", profile.UserId);
                }
            }

            result.Add(new DisplayInfoDto(profile.UserId, profile.DisplayName, avatarUrl));
        }

        return Result.Success<IReadOnlyList<DisplayInfoDto>>(result);
    }
}
