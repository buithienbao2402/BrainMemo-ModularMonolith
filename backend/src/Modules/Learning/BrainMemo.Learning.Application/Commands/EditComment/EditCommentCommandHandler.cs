using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Learning.Application.Commands.EditComment;

public sealed class EditCommentCommandHandler(
    ILearningRepository learningRepository,
    IProfileContract profileContract,
    IClock clock) : ICommandHandler<EditCommentCommand, CommentDto>
{
    public async Task<Result<CommentDto>> Handle(EditCommentCommand request, CancellationToken ct)
    {
        Comment? comment = await learningRepository.GetCommentByIdAsync(request.CommentId, ct).ConfigureAwait(false);
        if (comment is null || comment.IsDeleted)
        {
            return Result.Failure<CommentDto>(Error.NotFound("Bình luận không tồn tại hoặc đã bị xóa."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result editResult = comment.Edit(request.CurrentUserId, request.Content, now);
        if (!editResult.IsSuccess)
        {
            return Result.Failure<CommentDto>(editResult.Error);
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        UserRefDto authorDto = await ResolveUserRefAsync(comment.UserId, ct).ConfigureAwait(false);

        CommentDto dto = new(
            Id: comment.Id,
            CourseId: comment.CourseId,
            ChapterId: comment.ChapterId,
            Author: authorDto,
            ParentCommentId: comment.ParentCommentId,
            Content: comment.Content,
            IsPinned: comment.IsPinned,
            EditedAt: comment.EditedAt,
            CreatedAt: comment.CreatedAt,
            Replies: Array.Empty<CommentDto>());

        return Result.Success(dto);
    }

    private async Task<UserRefDto> ResolveUserRefAsync(Guid userId, CancellationToken ct)
    {
        try
        {
            Result<IReadOnlyList<DisplayInfoDto>> result = await profileContract
                .GetDisplayInfo([userId], ct)
                .ConfigureAwait(false);

            if (result.IsSuccess && result.Value.Count > 0)
            {
                DisplayInfoDto info = result.Value[0];
                return new UserRefDto(userId, info.DisplayName, info.AvatarUrl);
            }
        }
        catch
        {
            // Fallback
        }

        return new UserRefDto(userId, "Người dùng", null);
    }
}
