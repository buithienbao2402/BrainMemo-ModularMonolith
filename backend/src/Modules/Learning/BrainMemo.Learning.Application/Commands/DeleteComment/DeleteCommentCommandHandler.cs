using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Learning.Application.Commands.DeleteComment;

public sealed class DeleteCommentCommandHandler(
    ILearningRepository learningRepository,
    IEventBus eventBus,
    IClock clock) : ICommandHandler<DeleteCommentCommand>
{
    public async Task<Result> Handle(DeleteCommentCommand request, CancellationToken ct)
    {
        Comment? comment = await learningRepository.GetCommentByIdAsync(request.CommentId, ct).ConfigureAwait(false);
        if (comment is null)
        {
            return Result.Failure(Error.NotFound("Bình luận không tồn tại."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result deleteResult = comment.SoftDelete(request.CurrentUserId, now);
        if (!deleteResult.IsSuccess)
        {
            return deleteResult;
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        await eventBus.Publish(new CommentDeleted(
            EventId: Guid.NewGuid(),
            OccurredAt: now,
            CommentId: comment.Id,
            DeletedByUserId: request.CurrentUserId,
            Reason: "USER_DELETED")).ConfigureAwait(false);

        return Result.Success();
    }
}
