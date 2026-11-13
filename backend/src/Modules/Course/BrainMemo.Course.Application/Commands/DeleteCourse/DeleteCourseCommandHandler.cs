using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.DeleteCourse;

public sealed class DeleteCourseCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock) : ICommandHandler<DeleteCourseCommand>
{
    public async Task<Result> Handle(DeleteCourseCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset now = clock.UtcNow;

        CourseEntity? course = await courseRepository
            .GetByIdWithTagsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        if (course is null)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại hoặc đã bị xóa."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure(Error.Forbidden("Chỉ chủ sở hữu mới có quyền xóa khóa học."));
        }

        Result deleteResult = course.SoftDelete(now);
        if (deleteResult.IsFailure)
        {
            return deleteResult;
        }

        // Outbox event with eligible = false and stripped payload per D18
        await outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now), cancellationToken).ConfigureAwait(false);
        await courseRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
