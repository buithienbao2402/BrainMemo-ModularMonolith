using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Learning.Application.Commands.UnpinComment;

public sealed class UnpinCommentCommandHandler(
    ICourseContract courseContract,
    ILearningRepository learningRepository,
    IClock clock) : ICommandHandler<UnpinCommentCommand>
{
    public async Task<Result> Handle(UnpinCommentCommand request, CancellationToken ct)
    {
        Comment? comment = await learningRepository.GetCommentByIdAsync(request.CommentId, ct).ConfigureAwait(false);
        if (comment is null || comment.IsDeleted)
        {
            return Result.Failure(Error.NotFound("Bình luận không tồn tại hoặc đã bị xóa."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(comment.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure(accessResult.Error);
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure(Error.Forbidden("Chỉ Chủ khóa mới có quyền bỏ ghim bình luận."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result unpinResult = comment.Unpin(now);
        if (!unpinResult.IsSuccess)
        {
            return unpinResult;
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
