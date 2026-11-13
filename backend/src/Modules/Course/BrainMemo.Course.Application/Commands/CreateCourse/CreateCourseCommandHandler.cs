using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Application.Commands.CreateCourse;

internal sealed class CreateCourseCommandHandler(
    ICourseRepository courseRepository,
    IIdentityContract identityContract,
    IProfileContract profileContract,
    IClock clock,
    IOutboxWriter outboxWriter,
    IFileStorage? fileStorage = null,
    ILogger<CreateCourseCommandHandler>? logger = null) : ICommandHandler<CreateCourseCommand, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(CreateCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        // 1. Check email verified via Identity
        Result<AccountStatusDto> statusResult = await identityContract
            .GetAccountStatus(request.OwnerUserId, cancellationToken)
            .ConfigureAwait(false);

        if (statusResult.IsFailure)
        {
            return statusResult.Error;
        }

        if (!statusResult.Value.EmailVerified)
        {
            return new Error("EMAIL_NOT_VERIFIED", "Bạn cần xác minh email trước khi tạo khóa học.");
        }

        // 2. Parse Enums
        if (!Enum.TryParse(request.AccessMode, true, out CourseAccessMode accessMode))
        {
            return Error.Validation("Chế độ truy cập không hợp lệ (PUBLIC, PRIVATE, ONLY_ME).");
        }

        CourseStatus courseStatus = CourseStatus.Updating;
        if (!string.IsNullOrWhiteSpace(request.Status)
            && !Enum.TryParse(request.Status, true, out courseStatus))
        {
            return Error.Validation("Trạng thái khóa học không hợp lệ (UPDATING, COMPLETED, PAUSED).");
        }

        Guid courseId = Guid.NewGuid();
        string? permanentCoverKey = null;

        // 3. Handle Cover upload if provided (DEC-05)
        if (!string.IsNullOrWhiteSpace(request.CoverUploadKey))
        {
            if (fileStorage is null)
            {
                return new Error("INTERNAL_SERVER_ERROR", "Dịch vụ lưu trữ tệp chưa sẵn sàng.");
            }

            FileHead? head = await fileStorage
                .Head(request.CoverUploadKey, cancellationToken)
                .ConfigureAwait(false);

            Result<ValidatedFileUpload> validation = FileUploadPolicy.ValidateCommittedObject(
                FileUploadPurpose.CourseCover,
                request.OwnerUserId,
                request.CoverUploadKey,
                head);

            if (validation.IsFailure)
            {
                return validation.Error;
            }

            permanentCoverKey = $"covers/{courseId:D}/{Guid.NewGuid():D}{validation.Value.NormalizedExtension}";

            await fileStorage
                .Commit(request.CoverUploadKey, permanentCoverKey, cancellationToken)
                .ConfigureAwait(false);
        }

        // 4. Create Course domain entity
        Result<Entities.Course> createResult = Entities.Course.Create(
            courseId,
            request.OwnerUserId,
            request.Name,
            request.Description,
            permanentCoverKey,
            accessMode,
            courseStatus,
            request.Tags,
            utcNow);

        if (createResult.IsFailure)
        {
            return createResult.Error;
        }

        Entities.Course course = createResult.Value;

        // 5. Persist Course entity
        await courseRepository.AddAsync(course, cancellationToken).ConfigureAwait(false);

        // 6. Record Outbox CourseUpserted event (DEC-05, D18)
        CourseUpserted upsertedEvent = CourseEventFactory.CreateUpsertedEvent(
            course,
            ["name", "description", "access_mode", "status", "cover_storage_key", "tags"],
            utcNow);

        await outboxWriter
            .WriteAsync("Course", course.Id, upsertedEvent, cancellationToken)
            .ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // 7. Resolve Owner display info & Presigned cover URL
        UserRefDto ownerRef = await ResolveOwnerRefAsync(request.OwnerUserId, cancellationToken).ConfigureAwait(false);

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
                IsOwner: true,
                EnrollmentStatus: null,
                CanReadContent: true,
                CanLearn: true,
                HasNominated: false),
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
