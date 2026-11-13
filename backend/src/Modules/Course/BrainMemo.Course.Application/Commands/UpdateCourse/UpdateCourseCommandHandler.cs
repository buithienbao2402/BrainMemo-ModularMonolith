using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.UpdateCourse;

public sealed class UpdateCourseCommandHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract,
    IOutboxWriter outboxWriter,
    IClock clock,
    IFileStorage? fileStorage = null,
    ILogger<UpdateCourseCommandHandler>? logger = null) : ICommandHandler<UpdateCourseCommand, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(UpdateCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset now = clock.UtcNow;

        CourseEntity? course = await courseRepository
            .GetByIdWithTagsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        if (course is null)
        {
            return Result.Failure<CourseDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại hoặc đã bị xóa."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure<CourseDto>(Error.Forbidden("Chỉ chủ sở hữu mới có quyền chỉnh sửa khóa học."));
        }

        // Handle cover update or removal
        if (request.RemoveCover == true)
        {
            course.UpdateCover(null, now);
        }
        else if (!string.IsNullOrWhiteSpace(request.CoverUploadKey))
        {
            if (fileStorage is null)
            {
                return Result.Failure<CourseDto>(new Error("INTERNAL_SERVER_ERROR", "File storage is not configured."));
            }

            FileHead? head = await fileStorage.Head(request.CoverUploadKey, cancellationToken).ConfigureAwait(false);

            Result<ValidatedFileUpload> validationResult = FileUploadPolicy.ValidateCommittedObject(
                FileUploadPurpose.CourseCover,
                request.CurrentUserId,
                request.CoverUploadKey,
                head);

            if (validationResult.IsFailure)
            {
                return Result.Failure<CourseDto>(validationResult.Error);
            }

            ValidatedFileUpload validated = validationResult.Value;
            string permanentCoverKey = $"courses/{course.Id:D}/cover{validated.NormalizedExtension}";

            await fileStorage.Commit(request.CoverUploadKey, permanentCoverKey, cancellationToken).ConfigureAwait(false);
            course.UpdateCover(permanentCoverKey, now);
        }

        string targetName = request.Name ?? course.Name;
        string? targetDesc = request.Description ?? course.Description;
        CourseAccessMode targetMode = request.AccessMode ?? course.AccessMode;
        CourseStatus targetStatus = request.Status ?? course.Status;
        IReadOnlyList<string> targetTags = request.Tags ?? course.Tags.Select(t => t.Tag).ToArray();

        Result updateResult = course.Update(targetName, targetDesc, targetMode, targetStatus, targetTags, now);
        if (updateResult.IsFailure)
        {
            return Result.Failure<CourseDto>(updateResult.Error);
        }

        await outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now), cancellationToken).ConfigureAwait(false);
        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

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
            IsOwner: true,
            EnrollmentStatus: null,
            CanReadContent: true,
            CanLearn: true,
            HasNominated: false);

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
