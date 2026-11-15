using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.LeaveCourse;

public sealed class LeaveCourseCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<LeaveCourseCommand>
{
    public async Task<Result> Handle(LeaveCourseCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted || course.IsHidden || course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId == request.UserId)
        {
            return Result.Failure(new Error("OWNER_CANNOT_LEAVE", "Chủ sở hữu không thể tự rời khỏi khóa học của chính mình."));
        }

        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
        if (enrollment is null || enrollment.Status != EnrollmentStatus.Active)
        {
            return Result.Failure(new Error("NOT_ENROLLED", "Bạn chưa ghi danh hoặc không ở trạng thái học tập trong khóa học này."));
        }

        DateTimeOffset now = clock.UtcNow;
        enrollment.ChangeStatus(EnrollmentStatus.Left, now);

        await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            course.OwnerUserId,
            request.UserId,
            "LEFT",
            "ACTIVE",
            "LEFT",
            IsFirstActivation: false), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success();
    }
}
