using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Course.Application.Commands.DeleteCourse;

public sealed record DeleteCourseCommand(Guid CourseId, Guid UserId) : ICommand;

internal sealed class DeleteCourseCommandHandler(
    ICourseRepository courseRepository,
    IClock clock,
    IOutboxWriter outboxWriter) : ICommandHandler<DeleteCourseCommand>
{
    public async Task<Result> Handle(DeleteCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        Entities.Course? course = await courseRepository
            .FindByIdAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        if (course is null)
        {
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        if (course.OwnerUserId != request.UserId)
        {
            return Error.Forbidden("Chỉ chủ khóa mới có quyền xóa khóa học.");
        }

        Result deleteResult = course.SoftDelete(utcNow);
        if (deleteResult.IsFailure)
        {
            return deleteResult.Error;
        }

        await courseRepository.UpdateAsync(course, cancellationToken).ConfigureAwait(false);

        CourseUpserted upsertedEvent = CourseEventFactory.CreateUpsertedEvent(
            course,
            ["deleted_at"],
            utcNow);

        await outboxWriter
            .WriteAsync("Course", course.Id, upsertedEvent, cancellationToken)
            .ConfigureAwait(false);

        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
