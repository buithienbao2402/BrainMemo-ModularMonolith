using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Application.DTOs;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Profile.Application.Queries.GetMyProfile;

internal sealed class GetMyProfileQueryHandler(
    IProfileRepository profileRepository,
    IIdentityContract identityContract,
    IClock clock,
    IFileStorage? fileStorage = null,
    ILogger<GetMyProfileQueryHandler>? logger = null) : IQueryHandler<GetMyProfileQuery, ProfileDto>
{
    private static readonly TimeSpan AvatarUrlTtl = TimeSpan.FromHours(1);

    public async Task<Result<ProfileDto>> Handle(GetMyProfileQuery request, CancellationToken cancellationToken)
    {
        UserProfile? profile = await profileRepository
            .FindByUserIdAsync(request.UserId, cancellationToken)
            .ConfigureAwait(false);

        DateTimeOffset joinedAt = clock.UtcNow;
        UserSummaryDto? summary = null;

        // Self-heal: If profile does not exist in prf_user_profile, verify user exists in Identity and create default profile.
        if (profile is null)
        {
            Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
                .GetUserSummary([request.UserId], cancellationToken)
                .ConfigureAwait(false);

            if (summaryResult.IsFailure || summaryResult.Value.Count == 0)
            {
                return Error.NotFound("Không tìm thấy hồ sơ người dùng.");
            }

            summary = summaryResult.Value[0];
            joinedAt = summary.CreatedAt;

            Result<UserProfile> createResult = UserProfile.CreateDefault(request.UserId, clock.UtcNow);
            if (createResult.IsFailure)
            {
                return createResult.Error;
            }

            profile = createResult.Value;
            Result addResult = await profileRepository
                .AddAsync(profile, cancellationToken)
                .ConfigureAwait(false);

            if (addResult.IsFailure)
            {
                // Concurrently created: re-read
                profile = await profileRepository
                    .FindByUserIdAsync(request.UserId, cancellationToken)
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
                .GetUserSummary([request.UserId], cancellationToken)
                .ConfigureAwait(false);

            if (summaryResult.IsSuccess && summaryResult.Value.Count > 0)
            {
                summary = summaryResult.Value[0];
                joinedAt = summary.CreatedAt;
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
                    .CreateDownloadUrl(profile.AvatarStorageKey, AvatarUrlTtl, ct: cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to create presigned avatar download URL for user {UserId}", request.UserId);
            }
        }

        ProfileDto dto = new(
            profile.UserId,
            profile.DisplayName,
            avatarUrl,
            profile.Bio,
            profile.ShowCourseList,
            profile.UiTheme.ToString().ToUpperInvariant(),
            joinedAt);

        return dto;
    }
}
