using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
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
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.InviteLearner;

public sealed class InviteLearnerCommandHandler(
    ICourseRepository courseRepository,
    IIdentityContract identityContract,
    IOutboxWriter outboxWriter,
    IClock clock,
    IProfileContract? profileContract = null) : ICommandHandler<InviteLearnerCommand, EnrollmentDto>
{
    public async Task<Result<EnrollmentDto>> Handle(InviteLearnerCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return Result.Failure<EnrollmentDto>(new Error("INVALID_EMAIL", "Email không được để trống."));
        }

        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure<EnrollmentDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.OwnerUserId)
        {
            return Result.Failure<EnrollmentDto>(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền mời học viên."));
        }

        Result<Guid?> findResult = await identityContract.FindUserIdByEmail(request.Email.Trim(), ct).ConfigureAwait(false);
        if (findResult.IsFailure || !findResult.Value.HasValue)
        {
            return Result.Failure<EnrollmentDto>(new Error("USER_NOT_FOUND", "Không tìm thấy người dùng với địa chỉ email đã cho."));
        }

        Guid targetUserId = findResult.Value.Value;
        if (targetUserId == course.OwnerUserId)
        {
            return Result.Failure<EnrollmentDto>(new Error("CANNOT_INVITE_OWNER", "Không thể mời chủ sở hữu vào khóa học của chính mình."));
        }

        UserRefDto userRef = await GetUserRefAsync(targetUserId, ct).ConfigureAwait(false);
        DateTimeOffset now = clock.UtcNow;
        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, targetUserId, ct).ConfigureAwait(false);

        if (enrollment is not null)
        {
            if (enrollment.Status == EnrollmentStatus.Active)
            {
                return Result.Failure<EnrollmentDto>(new Error("ALREADY_ENROLLED", "Người dùng đã là học viên chính thức của khóa học này."));
            }

            if (enrollment.Status == EnrollmentStatus.Invited)
            {
                // Idempotent: already invited
                return Result.Success(new EnrollmentDto(
                    enrollment.Id,
                    enrollment.CourseId,
                    userRef,
                    enrollment.Status.ToStatusString(),
                    null,
                    enrollment.StatusChangedAt));
            }

            string fromStatus = enrollment.Status.ToStatusString();
            enrollment.ChangeStatus(EnrollmentStatus.Invited, now);

            await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                Guid.NewGuid(),
                now,
                request.CourseId,
                course.OwnerUserId,
                targetUserId,
                "INVITE_SENT",
                fromStatus,
                "INVITED",
                IsFirstActivation: false), ct).ConfigureAwait(false);

            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success(new EnrollmentDto(
                enrollment.Id,
                enrollment.CourseId,
                userRef,
                enrollment.Status.ToStatusString(),
                null,
                enrollment.StatusChangedAt));
        }

        Enrollment newEnrollment = new(
            Guid.NewGuid(),
            request.CourseId,
            targetUserId,
            EnrollmentStatus.Invited,
            null,
            now);

        await courseRepository.AddEnrollmentAsync(newEnrollment, ct).ConfigureAwait(false);

        await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            course.OwnerUserId,
            targetUserId,
            "INVITE_SENT",
            null,
            "INVITED",
            IsFirstActivation: false), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(new EnrollmentDto(
            newEnrollment.Id,
            newEnrollment.CourseId,
            userRef,
            newEnrollment.Status.ToStatusString(),
            null,
            newEnrollment.StatusChangedAt));
    }

    private async Task<UserRefDto> GetUserRefAsync(Guid userId, CancellationToken ct)
    {
        if (profileContract is not null)
        {
            Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(userId, ct).ConfigureAwait(false);
            if (profileResult.IsSuccess && !string.IsNullOrWhiteSpace(profileResult.Value.DisplayName))
            {
                return new UserRefDto(userId, profileResult.Value.DisplayName, profileResult.Value.AvatarUrl);
            }
        }

        return new UserRefDto(userId, "Người dùng");
    }
}
