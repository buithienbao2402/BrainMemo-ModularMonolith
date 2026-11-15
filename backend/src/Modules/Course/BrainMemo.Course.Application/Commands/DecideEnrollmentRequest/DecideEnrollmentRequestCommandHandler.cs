using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.DecideEnrollmentRequest;

public sealed class DecideEnrollmentRequestCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<DecideEnrollmentRequestCommand>
{
    public async Task<Result> Handle(DecideEnrollmentRequestCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.OwnerUserId)
        {
            return Result.Failure(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền duyệt yêu cầu ghi danh."));
        }

        EnrollmentRequest? enrollmentRequest = await courseRepository.GetEnrollmentRequestByIdAsync(request.RequestId, ct).ConfigureAwait(false);
        if (enrollmentRequest is null || enrollmentRequest.CourseId != request.CourseId)
        {
            return Result.Failure(new Error("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu ghi danh đã cho."));
        }

        if (enrollmentRequest.Decision != EnrollmentDecision.Pending)
        {
            return Result.Failure(new Error("REQUEST_ALREADY_DECIDED", "Yêu cầu này đã được xử lý trước đó."));
        }

        DateTimeOffset now = clock.UtcNow;
        string decisionUpper = request.Decision.Trim().ToUpperInvariant();

        if (decisionUpper == "ACCEPTED")
        {
            enrollmentRequest.Decide(EnrollmentDecision.Accepted, request.OwnerUserId, now);

            Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, enrollmentRequest.UserId, ct).ConfigureAwait(false);
            bool isFirst = false;
            if (enrollment is not null && enrollment.Status == EnrollmentStatus.PendingApproval)
            {
                isFirst = enrollment.FirstEnrolledAt is null;
                enrollment.ChangeStatus(EnrollmentStatus.Active, now);
            }

            await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                Guid.NewGuid(),
                now,
                request.CourseId,
                course.OwnerUserId,
                enrollmentRequest.UserId,
                "REQUEST_APPROVED",
                "PENDING_APPROVAL",
                "ACTIVE",
                IsFirstActivation: isFirst), ct).ConfigureAwait(false);

            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        else if (decisionUpper == "REJECTED")
        {
            enrollmentRequest.Decide(EnrollmentDecision.Rejected, request.OwnerUserId, now);

            Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, enrollmentRequest.UserId, ct).ConfigureAwait(false);
            string toStatus = "REMOVED";

            if (enrollment is not null && enrollment.Status == EnrollmentStatus.PendingApproval)
            {
                if (enrollment.FirstEnrolledAt.HasValue)
                {
                    enrollment.ChangeStatus(EnrollmentStatus.Left, now);
                    toStatus = "LEFT";
                }
                else
                {
                    await courseRepository.RemoveEnrollmentAsync(enrollment, ct).ConfigureAwait(false);
                    toStatus = "REMOVED";
                }
            }

            await outboxWriter.WriteAsync(request.CourseId, new EnrollmentChanged(
                Guid.NewGuid(),
                now,
                request.CourseId,
                course.OwnerUserId,
                enrollmentRequest.UserId,
                "REQUEST_REJECTED",
                "PENDING_APPROVAL",
                toStatus,
                IsFirstActivation: false), ct).ConfigureAwait(false);

            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }

        return Result.Failure(new Error("INVALID_DECISION", "Quyết định không hợp lệ. Chỉ chấp nhận ACCEPTED hoặc REJECTED."));
    }
}
