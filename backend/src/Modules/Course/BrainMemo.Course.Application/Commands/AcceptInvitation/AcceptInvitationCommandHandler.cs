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

namespace BrainMemo.Course.Application.Commands.AcceptInvitation;

public sealed class AcceptInvitationCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock,
    IProfileContract? profileContract = null) : ICommandHandler<AcceptInvitationCommand, EnrollmentDto>
{
    public async Task<Result<EnrollmentDto>> Handle(AcceptInvitationCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure<EnrollmentDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
        if (enrollment is null || enrollment.Status != EnrollmentStatus.Invited)
        {
            return Result.Failure<EnrollmentDto>(new Error("NO_PENDING_INVITATION", "Bạn không có lời mời nào đang chờ xử lý cho khóa học này."));
        }

        DateTimeOffset now = clock.UtcNow;
        bool isFirst = enrollment.FirstEnrolledAt is null;
        enrollment.ChangeStatus(EnrollmentStatus.Active, now);

        await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            course.OwnerUserId,
            request.UserId,
            "INVITE_ACCEPTED",
            "INVITED",
            "ACTIVE",
            IsFirstActivation: isFirst), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        UserRefDto userRef = await GetUserRefAsync(request.UserId, ct).ConfigureAwait(false);

        return Result.Success(new EnrollmentDto(
            enrollment.Id,
            enrollment.CourseId,
            userRef,
            enrollment.Status.ToStatusString(),
            null,
            enrollment.StatusChangedAt));
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
