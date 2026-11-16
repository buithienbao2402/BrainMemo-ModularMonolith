using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.NominateCourse;

public sealed class NominateCourseCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<NominateCourseCommand>
{
    public async Task<Result> Handle(NominateCourseCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        bool isOwner = course.OwnerUserId == request.UserId;
        if (!isOwner)
        {
            Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
            if (enrollment is null || enrollment.Status != EnrollmentStatus.Active)
            {
                return Result.Failure(new Error("NOT_ELIGIBLE_TO_NOMINATE", "Chỉ học viên đang học hoặc chủ khóa mới có thể đề cử khóa học này."));
            }
        }

        Nomination? activeNomination = await courseRepository.GetActiveNominationAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
        if (activeNomination is not null)
        {
            // Idempotent: already nominated
            return Result.Success();
        }

        DateTimeOffset now = clock.UtcNow;
        Nomination nomination = new(Guid.NewGuid(), request.CourseId, request.UserId, now);
        await courseRepository.AddNominationAsync(nomination, ct).ConfigureAwait(false);

        await outboxWriter.WriteAsync(request.CourseId, new NominationChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            request.UserId,
            true), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
