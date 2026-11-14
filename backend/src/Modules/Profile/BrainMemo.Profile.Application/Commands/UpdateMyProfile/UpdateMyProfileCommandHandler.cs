using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Application.DTOs;
using BrainMemo.Profile.Contracts.Events;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.Profile.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Profile.Application.Commands.UpdateMyProfile;

internal sealed class UpdateMyProfileCommandHandler(
    IProfileRepository profileRepository,
    IIdentityContract identityContract,
    IEventBus eventBus,
    IClock clock,
    IFileStorage? fileStorage = null,
    ILogger<UpdateMyProfileCommandHandler>? logger = null) : ICommandHandler<UpdateMyProfileCommand, ProfileDto>
{
    private static readonly TimeSpan AvatarUrlTtl = TimeSpan.FromHours(1);

    public async Task<Result<ProfileDto>> Handle(UpdateMyProfileCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        UserProfile? profile = await profileRepository
            .FindByUserIdAsync(request.UserId, cancellationToken)
            .ConfigureAwait(false);

        DateTimeOffset joinedAt = utcNow;

        if (profile is null)
        {
            // Self-heal: ensure user exists in Identity
            Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
                .GetUserSummary([request.UserId], cancellationToken)
                .ConfigureAwait(false);

            if (summaryResult.IsFailure || summaryResult.Value.Count == 0)
            {
                return Error.NotFound("Không tìm thấy hồ sơ người dùng.");
            }

            joinedAt = summaryResult.Value[0].CreatedAt;

            Result<UserProfile> createResult = UserProfile.CreateDefault(request.UserId, utcNow);
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
                joinedAt = summaryResult.Value[0].CreatedAt;
            }
            else
            {
                joinedAt = profile.CreatedAt;
            }
        }

        // Handle Avatar update/removal
        if (request.RemoveAvatar == true)
        {
            profile.UpdateAvatar(null, utcNow);
        }
        else if (!string.IsNullOrWhiteSpace(request.AvatarUploadKey))
        {
            if (fileStorage is null)
            {
                return new Error("INTERNAL_SERVER_ERROR", "Dịch vụ lưu trữ tệp chưa được cấu hình.");
            }

            FileHead? head = await fileStorage
                .Head(request.AvatarUploadKey, cancellationToken)
                .ConfigureAwait(false);

            Result<ValidatedFileUpload> validationResult = FileUploadPolicy.ValidateCommittedObject(
                FileUploadPurpose.Avatar,
                request.UserId,
                request.AvatarUploadKey,
                head);

            if (validationResult.IsFailure)
            {
                return validationResult.Error;
            }

            ValidatedFileUpload validated = validationResult.Value;
            string permanentKey = $"avatars/{request.UserId:D}/{Guid.NewGuid():D}{validated.NormalizedExtension}";

            await fileStorage
                .Commit(request.AvatarUploadKey, permanentKey, cancellationToken)
                .ConfigureAwait(false);

            profile.UpdateAvatar(permanentKey, utcNow);
        }

        string effectiveDisplayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? profile.DisplayName
            : request.DisplayName.Trim();

        string? effectiveBio = request.Bio is not null
            ? request.Bio
            : profile.Bio;

        bool effectiveShowCourseList = request.ShowCourseList ?? profile.ShowCourseList;

        UiTheme effectiveTheme = profile.UiTheme;
        if (!string.IsNullOrWhiteSpace(request.UiTheme))
        {
            effectiveTheme = string.Equals(request.UiTheme, "DARK", StringComparison.OrdinalIgnoreCase)
                ? UiTheme.Dark
                : UiTheme.Light;
        }

        Result updateResult = profile.Update(
            effectiveDisplayName,
            effectiveBio,
            effectiveShowCourseList,
            effectiveTheme,
            utcNow);

        if (updateResult.IsFailure)
        {
            return updateResult.Error;
        }

        Result saveResult = await profileRepository
            .UpdateAsync(profile, cancellationToken)
            .ConfigureAwait(false);

        if (saveResult.IsFailure)
        {
            return saveResult.Error;
        }

        // Emit ProfileUpdated in-process event for Discovery
        ProfileUpdated profileUpdatedEvent = new(
            Guid.NewGuid(),
            utcNow,
            profile.UserId,
            profile.DisplayName,
            profile.AvatarStorageKey);

        try
        {
            await eventBus
                .Publish(profileUpdatedEvent, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Failed to publish ProfileUpdated event for user {UserId}", profile.UserId);
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
                logger?.LogWarning(ex, "Failed to generate avatar download url for user {UserId}", profile.UserId);
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
