using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.WithdrawNomination;

public sealed class WithdrawNominationCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<WithdrawNominationCommand>
{
    public async Task<Result> Handle(WithdrawNominationCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        Nomination? activeNomination = await courseRepository.GetActiveNominationAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
        if (activeNomination is null)
        {
            // Idempotent: nothing to withdraw
            return Result.Success();
        }

        DateTimeOffset now = clock.UtcNow;
        activeNomination.Withdraw(now);

        await outboxWriter.WriteAsync(request.CourseId, new NominationChanged(
            Guid.NewGuid(),
            now,
            request.CourseId,
            request.UserId,
            false), ct).ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
