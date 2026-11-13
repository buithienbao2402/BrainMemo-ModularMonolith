using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.ListProfileCourses;

public sealed class ListProfileCoursesQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract,
    IFileStorage? fileStorage = null,
    ILogger<ListProfileCoursesQueryHandler>? logger = null) : IQueryHandler<ListProfileCoursesQuery, PagedResult<CourseCardDto>>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<PagedResult<CourseCardDto>>> Handle(ListProfileCoursesQuery request, CancellationToken cancellationToken)
    {
        int page = request.Page <= 0 ? 1 : request.Page;
        int pageSize = request.PageSize <= 0 ? 12 : Math.Min(request.PageSize, 50);

        bool isOwner = request.ViewerUserId.HasValue && request.ViewerUserId.Value == request.UserId;

        // Check user's profile privacy setting: showCourseList
        string ownerDisplayName = "User";
        string? ownerAvatarUrl = null;

        if (profileContract != null)
        {
            Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(request.UserId, cancellationToken).ConfigureAwait(false);
            if (profileResult.IsFailure)
            {
                return Result.Failure<PagedResult<CourseCardDto>>(new Error("PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người dùng."));
            }

            if (!isOwner && !profileResult.Value.ShowCourseList)
            {
                // Hidden by profile privacy setting: return empty
                return Result.Success(new PagedResult<CourseCardDto>([], page, pageSize, 0));
            }

            if (!string.IsNullOrWhiteSpace(profileResult.Value.DisplayName))
            {
                ownerDisplayName = profileResult.Value.DisplayName;
                ownerAvatarUrl = profileResult.Value.AvatarUrl;
            }
        }

        PagedResult<CourseEntity> pagedCourses = await courseRepository
            .ListProfileCoursesPagedAsync(request.UserId, page, pageSize, cancellationToken)
            .ConfigureAwait(false);

        List<CourseCardDto> cards = [];

        foreach (CourseEntity c in pagedCourses.Items)
        {
            // For non-owner, never show non-public or hidden/deleted courses
            if (!isOwner && (c.AccessMode != CourseAccessMode.Public || c.IsHidden || c.IsDeleted))
            {
                continue;
            }

            string? coverUrl = null;
            if (!string.IsNullOrEmpty(c.CoverStorageKey) && fileStorage != null)
            {
                try
                {
                    coverUrl = await fileStorage.CreateDownloadUrl(c.CoverStorageKey, CoverUrlTtl, null, cancellationToken).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "Failed to create presigned download URL for course cover: {StorageKey}", c.CoverStorageKey);
                }
            }

            int learnerCount = await courseRepository.GetLearnerCountAsync(c.Id, cancellationToken).ConfigureAwait(false);
            int nominationCount = await courseRepository.GetNominationCountAsync(c.Id, cancellationToken).ConfigureAwait(false);

            cards.Add(new CourseCardDto(
                Id: c.Id,
                Name: c.Name,
                CoverUrl: coverUrl,
                Owner: new UserRefDto(c.OwnerUserId, ownerDisplayName, ownerAvatarUrl),
                AccessMode: c.AccessMode.ToString().ToUpperInvariant(),
                Status: c.Status.ToString().ToUpperInvariant(),
                Tags: c.Tags.Select(t => t.Tag).ToArray(),
                LearnerCount: learnerCount,
                RatingAvg: null,
                RatingCount: 0,
                NominationCount: nominationCount,
                ProgressPercent: null));
        }

        PagedResult<CourseCardDto> result = new(
            Items: cards,
            Page: pagedCourses.Page,
            PageSize: pagedCourses.PageSize,
            TotalItems: pagedCourses.TotalItems);

        return Result.Success(result);
    }
}
