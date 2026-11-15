using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.RemoveLearner;

public sealed class RemoveLearnerCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<RemoveLearnerCommand>
{
    public async Task<Result> Handle(RemoveLearnerCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.OwnerUserId)
        {
            return Result.Failure(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền xóa học viên."));
        }

        if (request.TargetUserId == course.OwnerUserId)
        {
            return Result.Failure(new Error("CANNOT_REMOVE_OWNER", "Không thể xóa chủ sở hữu khỏi khóa học."));
        }

        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.TargetUserId, ct).ConfigureAwait(false);
        if (enrollment is null || enrollment.Status == EnrollmentStatus.Removed)
        {
            return Result.Failure(new Error("ENROLLMENT_NOT_FOUND", "Học viên không có trong khóa học này."));
        }

        DateTimeOffset now = clock.UtcNow;
        string fromStatus = enrollment.Status.ToString().ToUpperInvariant();
        enrollment.ChangeStatus(EnrollmentStatus.Removed, now);

        await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            course.OwnerUserId,
            request.TargetUserId,
            "REMOVED",
            fromStatus,
            "REMOVED",
            IsFirstActivation: false), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success();
    }
}
