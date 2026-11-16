using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Reviews.Commands.ReplyCourseReview;

public sealed record ReplyCourseReviewCommand(
    Guid CourseId,
    Guid ReviewId,
    Guid InstructorUserId,
    string ReplyText) : ICommand<ReviewDto>;

public sealed class ReplyCourseReviewCommandHandler(
    IAssessmentRepository repository,
    ICourseContract courseContract,
    IIdentityContract identityContract,
    IOutboxWriter? outboxWriter = null,
    IEventBus? eventBus = null) : ICommandHandler<ReplyCourseReviewCommand, ReviewDto>
{
    public async Task<Result<ReviewDto>> Handle(ReplyCourseReviewCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ReplyText))
        {
            return Result.Failure<ReviewDto>(Error.Validation("Nội dung phản hồi không được để trống."));
        }

        var accessRes = courseContract.GetCourseAccess(request.CourseId, request.InstructorUserId);
        if (accessRes.IsFailure || !accessRes.Value.Exists)
        {
            return Result.Failure<ReviewDto>(Error.NotFound("Khóa học không tồn tại."));
        }

        var access = accessRes.Value;
        if (!access.IsOwner)
        {
            return Result.Failure<ReviewDto>(Error.Forbidden("Chỉ chủ khóa học mới được phản hồi đánh giá."));
        }

        var review = await repository.GetReviewByIdAsync(request.ReviewId, cancellationToken);
        if (review == null || review.CourseId != request.CourseId)
        {
            return Result.Failure<ReviewDto>(Error.NotFound("Không tìm thấy đánh giá."));
        }

        review.Reply(request.ReplyText.Trim(), request.InstructorUserId);
        await repository.SaveChangesAsync(cancellationToken);

        var repliedEvent = new CourseReviewReplied(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            review.Id,
            request.CourseId,
            review.UserId,
            request.InstructorUserId,
            review.ReplyText!);

        if (outboxWriter != null)
        {
            await outboxWriter.WriteAsync("Assessment", review.Id, repliedEvent, cancellationToken);
        }

        if (eventBus != null)
        {
            await eventBus.Publish(repliedEvent, cancellationToken);
        }

        var userSummaryRes = await identityContract.GetUserSummary(new[] { review.UserId }, cancellationToken);
        var userSummary = userSummaryRes.IsSuccess ? userSummaryRes.Value.FirstOrDefault() : null;
        var userRef = new UserRefDto(review.UserId, userSummary?.Email ?? "Học viên", null, userSummary?.Email);

        return Result.Success(new ReviewDto(
            review.Id,
            userRef,
            review.Rating,
            review.CommentText,
            review.ReplyText,
            review.RepliedAt,
            review.CreatedAt,
            review.UpdatedAt));
    }
}
