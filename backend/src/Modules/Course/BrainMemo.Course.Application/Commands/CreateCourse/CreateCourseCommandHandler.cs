using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.CreateCourse;

public sealed class CreateCourseCommandHandler(
    ICourseRepository courseRepository,
    IIdentityContract identityContract,
    IProfileContract? profileContract,
    IOutboxWriter outboxWriter,
    IClock clock,
    IFileStorage? fileStorage = null,
    ILogger<CreateCourseCommandHandler>? logger = null) : ICommandHandler<CreateCourseCommand, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(CreateCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset now = clock.UtcNow;

        // 1. Check verified email per FR-CRS-01
        Result<AccountStatusDto> accountStatusResult = await identityContract
            .GetAccountStatus(request.OwnerUserId, cancellationToken)
            .ConfigureAwait(false);

        if (accountStatusResult.IsFailure || !accountStatusResult.Value.EmailVerified)
        {
            return Result.Failure<CourseDto>(new Error("EMAIL_NOT_VERIFIED", "Email must be verified before creating a course."));
        }

        Guid courseId = Guid.NewGuid();
        string? permanentCoverKey = null;

        // 2. Validate and commit cover upload key if provided
        if (!string.IsNullOrWhiteSpace(request.CoverUploadKey))
        {
            if (fileStorage is null)
            {
                return Result.Failure<CourseDto>(new Error("INTERNAL_SERVER_ERROR", "File storage is not configured."));
            }

            FileHead? head = await fileStorage.Head(request.CoverUploadKey, cancellationToken).ConfigureAwait(false);

            Result<ValidatedFileUpload> validationResult = FileUploadPolicy.ValidateCommittedObject(
                FileUploadPurpose.CourseCover,
                request.OwnerUserId,
                request.CoverUploadKey,
                head);

            if (validationResult.IsFailure)
            {
                return Result.Failure<CourseDto>(validationResult.Error);
            }

            ValidatedFileUpload validated = validationResult.Value;
            permanentCoverKey = $"courses/{courseId:D}/cover{validated.NormalizedExtension}";

            await fileStorage.Commit(request.CoverUploadKey, permanentCoverKey, cancellationToken).ConfigureAwait(false);
        }

        // 3. Create course aggregate
        Result<CourseEntity> courseResult = CourseEntity.Create(
            courseId,
            request.OwnerUserId,
            request.Name,
            request.Description,
            permanentCoverKey,
            request.AccessMode,
            request.Status,
            request.Tags,
            now);

        if (courseResult.IsFailure)
        {
            return Result.Failure<CourseDto>(courseResult.Error);
        }

        CourseEntity course = courseResult.Value;

        // 4. Persist and write outbox event
        await courseRepository.AddAsync(course, cancellationToken).ConfigureAwait(false);
        await outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now), cancellationToken).ConfigureAwait(false);
        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // 5. Build DTO
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
            Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(request.OwnerUserId, cancellationToken).ConfigureAwait(false);
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
