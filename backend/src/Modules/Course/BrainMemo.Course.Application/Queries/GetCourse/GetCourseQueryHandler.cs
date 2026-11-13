using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Application.Queries.GetCourse;

internal sealed class GetCourseQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract profileContract,
    IFileStorage? fileStorage = null,
    ILogger<GetCourseQueryHandler>? logger = null) : IQueryHandler<GetCourseQuery, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(GetCourseQuery request, CancellationToken cancellationToken)
    {
        Entities.Course? course = await courseRepository
            .FindByIdWithTagsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        Enrollment? enrollment = null;
        if (request.ViewerUserId.HasValue && course is not null)
        {
            enrollment = await courseRepository
                .FindEnrollmentAsync(course.Id, request.ViewerUserId.Value, cancellationToken)
                .ConfigureAwait(false);
        }

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(
            course,
            request.ViewerUserId,
            enrollment);

        if (!access.CanViewInfo)
        {
            // DEC-16: 404 to hide existence of Only Me, Hidden, Deleted courses
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        UserRefDto ownerRef = await ResolveOwnerRefAsync(course!.OwnerUserId, cancellationToken).ConfigureAwait(false);

        bool hasNominated = false;
        if (request.ViewerUserId.HasValue)
        {
            Nomination? nomination = await courseRepository
                .FindActiveNominationAsync(course.Id, request.ViewerUserId.Value, cancellationToken)
                .ConfigureAwait(false);

            hasNominated = nomination is not null;
        }

        string? coverUrl = null;
        if (!string.IsNullOrWhiteSpace(course.CoverStorageKey) && fileStorage is not null)
        {
            try
            {
                coverUrl = await fileStorage
                    .CreateDownloadUrl(course.CoverStorageKey, CoverUrlTtl, ct: cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to create cover download URL for course {CourseId}", course.Id);
            }
        }

        CourseDto dto = new(
            course.Id,
            ownerRef,
            course.Name,
            course.Description,
            coverUrl,
            course.AccessMode.ToString().ToUpperInvariant(),
            course.Status.ToString().ToUpperInvariant(),
            course.IsHidden,
            course.IsDeleted,
            course.Tags.Select(static t => t.Tag).ToList(),
            course.CreatedAt,
            course.UpdatedAt,
            new ViewerAccessDto(
                access.IsOwner,
                access.EnrollmentStatus,
                access.CanReadContent,
                access.CanLearn,
                hasNominated),
            RatingAvg: null,
            RatingCount: 0);

        return dto;
    }

    private async Task<UserRefDto> ResolveOwnerRefAsync(Guid ownerUserId, CancellationToken ct)
    {
        try
        {
            Result<IReadOnlyList<DisplayInfoDto>> displayResult = await profileContract
                .GetDisplayInfo([ownerUserId], ct)
                .ConfigureAwait(false);

            if (displayResult.IsSuccess && displayResult.Value.Count > 0)
            {
                DisplayInfoDto info = displayResult.Value[0];
                return new UserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to resolve owner display info for {OwnerUserId}", ownerUserId);
        }

        return new UserRefDto(ownerUserId, "Chủ khóa", null);
    }
}
