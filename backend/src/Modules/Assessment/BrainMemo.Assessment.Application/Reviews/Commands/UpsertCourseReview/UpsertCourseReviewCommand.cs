using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Reviews.Commands.UpsertCourseReview;

public sealed record UpsertCourseReviewCommand(
    Guid CourseId,
    Guid UserId,
    int Rating,
    string? CommentText) : ICommand<ReviewDto>;

public sealed class UpsertCourseReviewCommandHandler(
    IAssessmentRepository repository,
    ICourseContract courseContract,
    IIdentityContract identityContract,
    IOutboxWriter? outboxWriter = null,
    IEventBus? eventBus = null) : ICommandHandler<UpsertCourseReviewCommand, ReviewDto>
{
    public async Task<Result<ReviewDto>> Handle(UpsertCourseReviewCommand request, CancellationToken cancellationToken)
    {
        if (request.Rating < 1 || request.Rating > 5)
        {
            return Result.Failure<ReviewDto>(Error.Validation("Đánh giá phải từ 1 đến 5 sao."));
        }

        var accessRes = courseContract.GetCourseAccess(request.CourseId, request.UserId);
        if (accessRes.IsFailure || !accessRes.Value.Exists)
        {
            return Result.Failure<ReviewDto>(Error.NotFound("Khóa học không tồn tại."));
        }

        var access = accessRes.Value;
        if (access.IsOwner)
        {
            return Result.Failure<ReviewDto>(Error.Validation("Chủ khóa học không thể tự đánh giá khóa học của mình."));
        }

        bool isActiveLearner = string.Equals(access.EnrollmentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase)
            || (access.CanLearn && !string.IsNullOrEmpty(access.EnrollmentStatus));

        if (!isActiveLearner)
        {
            return Result.Failure<ReviewDto>(Error.Validation("Chỉ học viên đang học mới được đánh giá khóa học."));
        }

        var existing = await repository.GetReviewByCourseAndUserAsync(request.CourseId, request.UserId, cancellationToken);
        CourseReview review;
        bool isNew = existing == null;
        int oldRating = 0;

        if (isNew)
        {
            review = new CourseReview(Guid.NewGuid(), request.CourseId, request.UserId, request.Rating, request.CommentText);
            await repository.AddReviewAsync(review, cancellationToken);
        }
        else
        {
            review = existing!;
            oldRating = review.Rating;
            review.UpdateReview(request.Rating, request.CommentText);
        }

        await repository.SaveChangesAsync(cancellationToken);

        var stats = await repository.GetCourseReviewStatsAsync(request.CourseId, cancellationToken);

        if (isNew)
        {
            var createdEvent = new CourseReviewCreated(
                Guid.NewGuid(),
                DateTimeOffset.UtcNow,
                review.Id,
                request.CourseId,
                request.UserId,
                request.Rating,
                request.CommentText,
                stats.AvgRating,
                stats.TotalCount);

            if (outboxWriter != null)
            {
                await outboxWriter.WriteAsync("Assessment", review.Id, createdEvent, cancellationToken);
            }

            if (eventBus != null)
            {
                await eventBus.Publish(createdEvent, cancellationToken);
            }
        }
        else
        {
            var updatedEvent = new CourseReviewUpdated(
                Guid.NewGuid(),
                DateTimeOffset.UtcNow,
                review.Id,
                request.CourseId,
                request.UserId,
                oldRating,
                request.Rating,
                request.CommentText,
                stats.AvgRating,
                stats.TotalCount);

            if (outboxWriter != null)
            {
                await outboxWriter.WriteAsync("Assessment", review.Id, updatedEvent, cancellationToken);
            }

            if (eventBus != null)
            {
                await eventBus.Publish(updatedEvent, cancellationToken);
            }
        }

        var userSummaryRes = await identityContract.GetUserSummary(new[] { request.UserId }, cancellationToken);
        var userSummary = userSummaryRes.IsSuccess ? userSummaryRes.Value.FirstOrDefault() : null;
        var userRef = new UserRefDto(request.UserId, userSummary?.Email ?? "Học viên", null, userSummary?.Email);

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
