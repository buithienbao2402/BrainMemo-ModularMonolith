using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.ListMyCourses;

public sealed class ListMyCoursesQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract,
    IFileStorage? fileStorage = null,
    ILogger<ListMyCoursesQueryHandler>? logger = null) : IQueryHandler<ListMyCoursesQuery, PagedResult<CourseCardDto>>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<PagedResult<CourseCardDto>>> Handle(ListMyCoursesQuery request, CancellationToken cancellationToken)
    {
        int page = request.Page <= 0 ? 1 : request.Page;
        int pageSize = request.PageSize <= 0 ? 12 : Math.Min(request.PageSize, 50);

        bool isOwned = string.Equals(request.Relation, "OWNED", StringComparison.OrdinalIgnoreCase);

        PagedResult<CourseEntity> pagedCourses = isOwned
            ? await courseRepository.ListMyOwnedCoursesPagedAsync(request.UserId, page, pageSize, cancellationToken).ConfigureAwait(false)
            : await courseRepository.ListMyEnrolledCoursesPagedAsync(request.UserId, page, pageSize, cancellationToken).ConfigureAwait(false);

        List<CourseCardDto> cards = [];

        foreach (CourseEntity c in pagedCourses.Items)
        {
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

            string ownerDisplayName = "User";
            string? ownerAvatarUrl = null;
            if (profileContract != null)
            {
                Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(c.OwnerUserId, cancellationToken).ConfigureAwait(false);
                if (profileResult.IsSuccess && !string.IsNullOrWhiteSpace(profileResult.Value.DisplayName))
                {
                    ownerDisplayName = profileResult.Value.DisplayName;
                    ownerAvatarUrl = profileResult.Value.AvatarUrl;
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
