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
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.GetCourse;

public sealed class GetCourseQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract,
    IFileStorage? fileStorage = null,
    ILogger<GetCourseQueryHandler>? logger = null) : IQueryHandler<GetCourseQuery, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(GetCourseQuery request, CancellationToken cancellationToken)
    {
        CourseEntity? course = await courseRepository
            .GetByIdWithTagsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        if (course is null)
        {
            return Result.Failure<CourseDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại hoặc đã bị xóa."));
        }

        Enrollment? enrollment = null;
        bool hasNominated = false;

        if (request.ViewerUserId.HasValue)
        {
            enrollment = await courseRepository
                .GetEnrollmentAsync(course.Id, request.ViewerUserId.Value, cancellationToken)
                .ConfigureAwait(false);

            hasNominated = await courseRepository
                .HasNominatedAsync(course.Id, request.ViewerUserId.Value, cancellationToken)
                .ConfigureAwait(false);
        }

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, request.ViewerUserId, enrollment);

        // DEC-16 & 3.5.8.1: Hide existence of ONLY_ME / Hidden / Deleted courses with 404 for non-owners
        if (!access.CanViewInfo)
        {
            return Result.Failure<CourseDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại hoặc đã bị xóa."));
        }

        string? coverUrl = null;
        if (!string.IsNullOrEmpty(course.CoverStorageKey) && fileStorage != null)
        {
            try
            {
                coverUrl = await fileStorage.CreateDownloadUrl(course.CoverStorageKey, CoverUrlTtl, null, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to create presigned download URL for course cover: {StorageKey}", course.CoverStorageKey);
            }
        }

        string ownerDisplayName = "User";
        string? ownerAvatarUrl = null;

        if (profileContract != null)
        {
            Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(course.OwnerUserId, cancellationToken).ConfigureAwait(false);
            if (profileResult.IsSuccess && !string.IsNullOrWhiteSpace(profileResult.Value.DisplayName))
            {
                ownerDisplayName = profileResult.Value.DisplayName;
                ownerAvatarUrl = profileResult.Value.AvatarUrl;
            }
        }

        UserRefDto ownerRef = new(course.OwnerUserId, ownerDisplayName, ownerAvatarUrl);
        CourseViewerDto viewer = new(
            IsOwner: access.IsOwner,
            EnrollmentStatus: access.EnrollmentStatus,
            CanReadContent: access.CanReadContent,
            CanLearn: access.CanLearn,
            HasNominated: hasNominated);

        CourseDto dto = new(
            Id: course.Id,
            Owner: ownerRef,
            Name: course.Name,
            Description: course.Description,
            CoverUrl: coverUrl,
            AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
            Status: course.Status.ToString().ToUpperInvariant(),
            IsHidden: course.IsHidden,
            IsDeleted: course.IsDeleted,
            Tags: course.Tags.Select(t => t.Tag).ToArray(),
            CreatedAt: course.CreatedAt,
            UpdatedAt: course.UpdatedAt,
            Viewer: viewer,
            RatingAvg: null,
            RatingCount: 0);

        return Result.Success(dto);
    }
}
