using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using UserRefDto = BrainMemo.Learning.Application.DTOs.UserRefDto;

namespace BrainMemo.Learning.Application.Commands.CreateComment;

public sealed class CreateCommentCommandHandler(
    ICourseContract courseContract,
    ILearningRepository learningRepository,
    IProfileContract profileContract,
    IEventBus eventBus,
    IClock clock) : ICommandHandler<CreateCommentCommand, CommentDto>
{
    public async Task<Result<CommentDto>> Handle(CreateCommentCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return Result.Failure<CommentDto>(Error.Validation("Nội dung bình luận không được để trống."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(request.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<CommentDto>(accessResult.Error);
        }

        CourseAccessDto access = accessResult.Value;
        bool hasPermission = access.IsOwner || access.CanLearn || string.Equals(access.EnrollmentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase);
        if (!hasPermission)
        {
            return Result.Failure<CommentDto>(Error.Forbidden("Bạn cần ghi danh vào khóa học hoặc là chủ khóa để bình luận."));
        }

        Guid? resolvedChapterId = request.ChapterId;

        if (request.ParentCommentId.HasValue)
        {
            Comment? parent = await learningRepository.GetCommentByIdAsync(request.ParentCommentId.Value, ct).ConfigureAwait(false);
            if (parent is null || parent.IsDeleted)
            {
                return Result.Failure<CommentDto>(Error.NotFound("Bình luận cha không tồn tại hoặc đã bị xóa."));
            }

            if (parent.CourseId != request.CourseId)
            {
                return Result.Failure<CommentDto>(Error.Validation("Bình luận cha không thuộc cùng khóa học."));
            }

            if (parent.ParentCommentId.HasValue)
            {
                return Result.Failure<CommentDto>(Error.Validation("Chỉ được trả lời bình luận tối đa 1 cấp."));
            }

            if (request.ChapterId.HasValue && parent.ChapterId.HasValue && parent.ChapterId != request.ChapterId)
            {
                return Result.Failure<CommentDto>(Error.Validation("Bình luận cha không thuộc cùng chương học."));
            }

            if (!resolvedChapterId.HasValue && parent.ChapterId.HasValue)
            {
                resolvedChapterId = parent.ChapterId;
            }
        }

        DateTimeOffset now = clock.UtcNow;
        Guid commentId = Guid.NewGuid();

        Result<Comment> createResult = Comment.Create(
            commentId,
            request.CourseId,
            resolvedChapterId,
            request.CurrentUserId,
            request.ParentCommentId,
            request.Content,
            now);

        if (!createResult.IsSuccess)
        {
            return Result.Failure<CommentDto>(createResult.Error);
        }

        Comment comment = createResult.Value;
        await learningRepository.AddCommentAsync(comment, ct).ConfigureAwait(false);
        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        await eventBus.Publish(new CommentCreated(
            EventId: Guid.NewGuid(),
            OccurredAt: now,
            CommentId: comment.Id,
            CourseId: comment.CourseId,
            ChapterId: comment.ChapterId,
            AuthorUserId: comment.UserId,
            ParentCommentId: comment.ParentCommentId,
            Content: comment.Content)).ConfigureAwait(false);

        UserRefDto authorDto = await ResolveUserRefAsync(request.CurrentUserId, ct).ConfigureAwait(false);

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
