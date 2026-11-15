using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
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
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.EnrollCourse;

public sealed class EnrollCourseCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock,
    IProfileContract? profileContract = null) : ICommandHandler<EnrollCourseCommand, EnrollmentDto>
{
    public async Task<Result<EnrollmentDto>> Handle(EnrollCourseCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted || course.IsHidden || course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure<EnrollmentDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId == request.UserId)
        {
            return Result.Failure<EnrollmentDto>(new Error("CANNOT_ENROLL_OWN_COURSE", "Chủ khóa không thể tự ghi danh vào khóa học của chính mình."));
        }

        DateTimeOffset now = clock.UtcNow;
        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);

        UserRefDto userRef = await GetUserRefAsync(request.UserId, ct).ConfigureAwait(false);

        if (enrollment is not null)
        {
            if (enrollment.Status == EnrollmentStatus.Active)
            {
                // Idempotent: already active
                return Result.Success(new EnrollmentDto(
                    enrollment.Id,
                    enrollment.CourseId,
                    userRef,
                    enrollment.Status.ToStatusString(),
                    null,
                    enrollment.StatusChangedAt));
            }

            if (enrollment.Status == EnrollmentStatus.PendingApproval)
            {
                EnrollmentRequest? pendingReq = await courseRepository.GetPendingEnrollmentRequestAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
                return Result.Success(new EnrollmentDto(
                    enrollment.Id,
                    enrollment.CourseId,
                    userRef,
                    enrollment.Status.ToStatusString(),
                    pendingReq?.Id,
                    enrollment.StatusChangedAt));
            }

            if (enrollment.Status == EnrollmentStatus.Removed)
            {
                return Result.Failure<EnrollmentDto>(new Error("LEARNER_REMOVED", "Học viên đã bị đưa ra khỏi khóa học và không thể tự ghi danh lại. Vui lòng liên hệ giảng viên."));
            }

            if (enrollment.Status == EnrollmentStatus.Invited)
            {
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

                return Result.Success(new EnrollmentDto(
                    enrollment.Id,
                    enrollment.CourseId,
                    userRef,
                    enrollment.Status.ToStatusString(),
                    null,
                    enrollment.StatusChangedAt));
            }

            if (enrollment.Status == EnrollmentStatus.Left)
            {
                if (course.AccessMode == CourseAccessMode.Public)
                {
                    enrollment.ChangeStatus(EnrollmentStatus.Active, now);

                    await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                        Guid.NewGuid(),
                        now,
                        request.CourseId,
                        course.OwnerUserId,
                        request.UserId,
                        "SELF_REENROLL",
                        "LEFT",
                        "ACTIVE",
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
                else // Private course
                {
                    EnrollmentRequest pendingReq = new(Guid.NewGuid(), request.CourseId, request.UserId, now);
                    await courseRepository.AddEnrollmentRequestAsync(pendingReq, ct).ConfigureAwait(false);

                    enrollment.ChangeStatus(EnrollmentStatus.PendingApproval, now);

                    await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                        Guid.NewGuid(),
                        now,
                        request.CourseId,
                        course.OwnerUserId,
                        request.UserId,
                        "REQUEST_SENT",
                        "LEFT",
                        "PENDING_APPROVAL",
                        IsFirstActivation: false), ct).ConfigureAwait(false);

                    await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

                    return Result.Success(new EnrollmentDto(
                        enrollment.Id,
                        enrollment.CourseId,
                        userRef,
                        enrollment.Status.ToStatusString(),
                        pendingReq.Id,
                        enrollment.StatusChangedAt));
                }
            }
        }

        // Enrollment is null (never enrolled before)
        if (course.AccessMode == CourseAccessMode.Public)
        {
            Enrollment newEnrollment = new(
                Guid.NewGuid(),
                request.CourseId,
                request.UserId,
                EnrollmentStatus.Active,
                now,
                now);

            await courseRepository.AddEnrollmentAsync(newEnrollment, ct).ConfigureAwait(false);

            await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                Guid.NewGuid(),
                now,
                request.CourseId,
                course.OwnerUserId,
                request.UserId,
                "SELF_ENROLL",
                null,
                "ACTIVE",
                IsFirstActivation: true), ct).ConfigureAwait(false);

            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success(new EnrollmentDto(
                newEnrollment.Id,
                newEnrollment.CourseId,
                userRef,
                newEnrollment.Status.ToStatusString(),
                null,
                newEnrollment.StatusChangedAt));
        }
        else // Private course
        {
            EnrollmentRequest pendingReq = new(Guid.NewGuid(), request.CourseId, request.UserId, now);
            await courseRepository.AddEnrollmentRequestAsync(pendingReq, ct).ConfigureAwait(false);

            Enrollment newEnrollment = new(
                Guid.NewGuid(),
                request.CourseId,
                request.UserId,
                EnrollmentStatus.PendingApproval,
                null,
                now);

            await courseRepository.AddEnrollmentAsync(newEnrollment, ct).ConfigureAwait(false);

            await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                Guid.NewGuid(),
                now,
                request.CourseId,
                course.OwnerUserId,
                request.UserId,
                "REQUEST_SENT",
                null,
                "PENDING_APPROVAL",
                IsFirstActivation: false), ct).ConfigureAwait(false);

            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success(new EnrollmentDto(
                newEnrollment.Id,
                newEnrollment.CourseId,
                userRef,
                newEnrollment.Status.ToStatusString(),
                pendingReq.Id,
                newEnrollment.StatusChangedAt));
        }
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
