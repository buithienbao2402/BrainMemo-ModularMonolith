using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Application.Commands.UpdateCourse;

internal sealed class UpdateCourseCommandHandler(
    ICourseRepository courseRepository,
    IProfileContract profileContract,
    IClock clock,
    IOutboxWriter outboxWriter,
    IFileStorage? fileStorage = null,
    ILogger<UpdateCourseCommandHandler>? logger = null) : ICommandHandler<UpdateCourseCommand, CourseDto>
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<CourseDto>> Handle(UpdateCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        Entities.Course? course = await courseRepository
            .FindByIdWithTagsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        if (course is null)
        {
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        if (course.OwnerUserId != request.UserId)
        {
            return Error.Forbidden("Chỉ chủ khóa mới có quyền chỉnh sửa khóa học.");
        }

        List<string> changedFields = [];

        // 1. Cover update / removal
        if (request.RemoveCover == true)
        {
            if (course.CoverStorageKey is not null)
            {
                course.UpdateCover(null, utcNow);
                changedFields.Add("cover_storage_key");
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.CoverUploadKey))
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
                request.UserId,
                request.CoverUploadKey,
                head);

            if (validation.IsFailure)
            {
                return validation.Error;
            }

            string permanentKey = $"covers/{course.Id:D}/{Guid.NewGuid():D}{validation.Value.NormalizedExtension}";
            await fileStorage
                .Commit(request.CoverUploadKey, permanentKey, cancellationToken)
                .ConfigureAwait(false);

            course.UpdateCover(permanentKey, utcNow);
            changedFields.Add("cover_storage_key");
        }

        // 2. Parse AccessMode
        CourseAccessMode targetAccessMode = course.AccessMode;
        if (!string.IsNullOrWhiteSpace(request.AccessMode))
        {
            if (!Enum.TryParse(request.AccessMode, true, out targetAccessMode))
            {
                return Error.Validation("Chế độ truy cập không hợp lệ.");
            }

            if (targetAccessMode != course.AccessMode)
            {
                changedFields.Add("access_mode");
            }
        }

        // 3. Parse Status
        CourseStatus targetStatus = course.Status;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!Enum.TryParse(request.Status, true, out targetStatus))
            {
                return Error.Validation("Trạng thái khóa học không hợp lệ.");
            }

            if (targetStatus != course.Status)
            {
                changedFields.Add("status");
            }
        }

        string targetName = !string.IsNullOrWhiteSpace(request.Name) ? request.Name : course.Name;
        if (!string.Equals(targetName, course.Name, StringComparison.Ordinal))
        {
            changedFields.Add("name");
        }

        string? targetDesc = request.Description is not null ? request.Description : course.Description;
        if (!string.Equals(targetDesc, course.Description, StringComparison.Ordinal))
        {
            changedFields.Add("description");
        }

        IEnumerable<string> targetTags = request.Tags ?? course.Tags.Select(static t => t.Tag);
        if (request.Tags is not null)
        {
            changedFields.Add("tags");
        }

        Result updateResult = course.Update(
            targetName,
            targetDesc,
            targetAccessMode,
            targetStatus,
            targetTags,
            utcNow);

        if (updateResult.IsFailure)
        {
            return updateResult.Error;
        }

        await courseRepository.UpdateAsync(course, cancellationToken).ConfigureAwait(false);

        // 4. Outbox event
        CourseUpserted upsertedEvent = CourseEventFactory.CreateUpsertedEvent(
            course,
            changedFields.Count > 0 ? changedFields : ["updated_at"],
            utcNow);

        await outboxWriter
            .WriteAsync("Course", course.Id, upsertedEvent, cancellationToken)
            .ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // 5. Build DTO
        UserRefDto ownerRef = await ResolveOwnerRefAsync(course.OwnerUserId, cancellationToken).ConfigureAwait(false);

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
