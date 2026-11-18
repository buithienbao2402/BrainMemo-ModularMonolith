using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using UserRefDto = BrainMemo.Learning.Application.DTOs.UserRefDto;

namespace BrainMemo.Learning.Application.Commands.ResolveComment;

public sealed record ResolveCommentCommand(Guid CommentId, Guid? ResolvedCommentId, Guid CurrentUserId) : ICommand<CommentDto>;
public sealed record UnresolveCommentCommand(Guid CommentId, Guid CurrentUserId) : ICommand<CommentDto>;

public sealed class ResolveCommentCommandHandler(
    ICourseContract courseContract,
    ILearningRepository learningRepository,
    IClock clock)
    : ICommandHandler<ResolveCommentCommand, CommentDto>,
      ICommandHandler<UnresolveCommentCommand, CommentDto>
{
    public async Task<Result<CommentDto>> Handle(ResolveCommentCommand request, CancellationToken ct)
    {
        Comment? comment = await learningRepository.GetCommentByIdAsync(request.CommentId, ct).ConfigureAwait(false);
        if (comment is null || comment.IsDeleted)
        {
            return Result.Failure<CommentDto>(Error.NotFound("Không tìm thấy câu hỏi."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(comment.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<CommentDto>(accessResult.Error);
        }

        bool isOwner = accessResult.Value.IsOwner;
        if (!isOwner && comment.UserId != request.CurrentUserId)
        {
            return Result.Failure<CommentDto>(Error.Forbidden("Chỉ tác giả câu hỏi hoặc Giảng viên mới có quyền đánh dấu đã giải đáp."));
        }

        Result result = comment.Resolve(request.CurrentUserId, request.ResolvedCommentId, clock.UtcNow);
        if (result.IsFailure)
        {
            return Result.Failure<CommentDto>(result.Error);
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success(ToDto(comment, isOwner));
    }

    public async Task<Result<CommentDto>> Handle(UnresolveCommentCommand request, CancellationToken ct)
    {
        Comment? comment = await learningRepository.GetCommentByIdAsync(request.CommentId, ct).ConfigureAwait(false);
        if (comment is null || comment.IsDeleted)
        {
            return Result.Failure<CommentDto>(Error.NotFound("Không tìm thấy câu hỏi."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(comment.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<CommentDto>(accessResult.Error);
        }

        bool isOwner = accessResult.Value.IsOwner;
        if (!isOwner && comment.UserId != request.CurrentUserId)
        {
            return Result.Failure<CommentDto>(Error.Forbidden("Chỉ tác giả câu hỏi hoặc Giảng viên mới có quyền bỏ đánh dấu đã giải đáp."));
        }

        Result result = comment.Unresolve(clock.UtcNow);
        if (result.IsFailure)
        {
            return Result.Failure<CommentDto>(result.Error);
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success(ToDto(comment, isOwner));
    }

    private static CommentDto ToDto(Comment c, bool isOwner) => new(
        Id: c.Id,
        CourseId: c.CourseId,
        ChapterId: c.ChapterId,
        Author: new UserRefDto(c.UserId, string.Empty, null),
        ParentCommentId: c.ParentCommentId,
        Content: c.Content,
        IsPinned: c.IsPinned,
        EditedAt: c.EditedAt,
        CreatedAt: c.CreatedAt,
        Replies: Array.Empty<CommentDto>(),
        Title: c.Title,
        BlockId: c.BlockId,
        IsResolved: c.IsResolved,
        ResolvedAt: c.ResolvedAt,
        ResolvedByUserId: c.ResolvedByUserId,
        ResolvedCommentId: c.ResolvedCommentId,
        IsInstructorReply: isOwner);
}
