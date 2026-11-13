using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Application.Queries.ListMyCourses;

internal sealed class ListMyCoursesQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract profileContract,
    IFileStorage? fileStorage = null,
    ILogger<ListMyCoursesQueryHandler>? logger = null) : IQueryHandler<ListMyCoursesQuery, Page<CourseCardDto>>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<Page<CourseCardDto>>> Handle(ListMyCoursesQuery request, CancellationToken cancellationToken)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 50);
        int skip = (page - 1) * pageSize;

        bool isOwned = string.Equals(request.Relation, "OWNED", StringComparison.OrdinalIgnoreCase);

        IReadOnlyList<Entities.Course> courses;
        int totalCount;

        if (isOwned)
        {
            courses = await courseRepository.ListOwnedCoursesAsync(request.UserId, skip, pageSize, cancellationToken).ConfigureAwait(false);
            totalCount = await courseRepository.CountOwnedCoursesAsync(request.UserId, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            courses = await courseRepository.ListEnrolledCoursesAsync(request.UserId, skip, pageSize, cancellationToken).ConfigureAwait(false);
            totalCount = await courseRepository.CountEnrolledCoursesAsync(request.UserId, cancellationToken).ConfigureAwait(false);
        }

        List<Guid> ownerIds = courses.Select(static c => c.OwnerUserId).Distinct().ToList();
        Dictionary<Guid, UserRefDto> ownersMap = await ResolveOwnersMapAsync(ownerIds, cancellationToken).ConfigureAwait(false);

        List<CourseCardDto> items = new(courses.Count);
        foreach (Entities.Course course in courses)
        {
            ownersMap.TryGetValue(course.OwnerUserId, out UserRefDto? owner);
            owner ??= new UserRefDto(course.OwnerUserId, "Chủ khóa", null);

            string? coverUrl = null;
            if (!string.IsNullOrWhiteSpace(course.CoverStorageKey) && fileStorage is not null)
            {
                try
                {
                    coverUrl = await fileStorage.CreateDownloadUrl(course.CoverStorageKey, CoverUrlTtl, ct: cancellationToken).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "Failed to create cover URL for {CourseId}", course.Id);
                }
            }

            int learnerCount = await courseRepository.CountActiveLearnersAsync(course.Id, cancellationToken).ConfigureAwait(false);
            int nominationCount = await courseRepository.CountActiveNominationsAsync(course.Id, cancellationToken).ConfigureAwait(false);

            items.Add(new CourseCardDto(
                course.Id,
                course.Name,
                coverUrl,
                owner,
                course.AccessMode.ToString().ToUpperInvariant(),
                course.Status.ToString().ToUpperInvariant(),
                course.Tags.Select(static t => t.Tag).ToList(),
                learnerCount,
                RatingAvg: null,
                RatingCount: 0,
                NominationCount: nominationCount,
                ProgressPercent: null));
        }

        Page<CourseCardDto> resultPage = new(items, totalCount, page, pageSize);
        return resultPage;
    }

    private async Task<Dictionary<Guid, UserRefDto>> ResolveOwnersMapAsync(IReadOnlyList<Guid> ownerIds, CancellationToken ct)
    {
        Dictionary<Guid, UserRefDto> map = [];
        if (ownerIds.Count == 0)
        {
            return map;
        }

        try
        {
            Result<IReadOnlyList<DisplayInfoDto>> result = await profileContract.GetDisplayInfo(ownerIds, ct).ConfigureAwait(false);
            if (result.IsSuccess)
            {
                foreach (DisplayInfoDto info in result.Value)
                {
                    map[info.UserId] = new UserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
                }
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to resolve owner display infos");
        }

        return map;
    }
}
