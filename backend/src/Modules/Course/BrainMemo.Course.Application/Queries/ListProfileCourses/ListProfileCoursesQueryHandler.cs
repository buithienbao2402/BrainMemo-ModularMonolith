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

namespace BrainMemo.Course.Application.Queries.ListProfileCourses;

internal sealed class ListProfileCoursesQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract profileContract,
    IFileStorage? fileStorage = null,
    ILogger<ListProfileCoursesQueryHandler>? logger = null) : IQueryHandler<ListProfileCoursesQuery, Page<CourseCardDto>>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<Page<CourseCardDto>>> Handle(ListProfileCoursesQuery request, CancellationToken cancellationToken)
    {
        // 1. Check profile privacy (FR-PRF-05, OpenAPI /profiles/{userId}/courses)
        Result<PublicProfileDto> profileResult = await profileContract
            .GetPublicProfile(request.TargetUserId, cancellationToken)
            .ConfigureAwait(false);

        if (profileResult.IsFailure)
        {
            return profileResult.Error;
        }

        PublicProfileDto profile = profileResult.Value;
        bool isSelf = request.ViewerUserId.HasValue && request.ViewerUserId.Value == request.TargetUserId;
        if (!profile.ShowCourseList && !isSelf)
        {
            return Error.NotFound("Danh sách khóa học của người dùng đã bị ẩn.");
        }

        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 50);
        int skip = (page - 1) * pageSize;

        // Public profile only returns PUBLIC courses owned by target user (NEVER Only Me / Hidden / Deleted)
        IReadOnlyList<Entities.Course> courses = await courseRepository
            .ListPublicCoursesByOwnerAsync(request.TargetUserId, skip, pageSize, cancellationToken)
            .ConfigureAwait(false);

        int totalCount = await courseRepository
            .CountPublicCoursesByOwnerAsync(request.TargetUserId, cancellationToken)
            .ConfigureAwait(false);

        UserRefDto ownerRef = new(profile.UserId, profile.DisplayName, profile.AvatarUrl);

        List<CourseCardDto> items = new(courses.Count);
        foreach (Entities.Course course in courses)
        {
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
                ownerRef,
                course.AccessMode.ToString().ToUpperInvariant(),
                course.Status.ToString().ToUpperInvariant(),
                course.Tags.Select(static t => t.Tag).ToList(),
                learnerCount,
                RatingAvg: null,
                RatingCount: 0,
                NominationCount: nominationCount,
                ProgressPercent: null));
        }

        return new Page<CourseCardDto>(items, totalCount, page, pageSize);
    }
}
