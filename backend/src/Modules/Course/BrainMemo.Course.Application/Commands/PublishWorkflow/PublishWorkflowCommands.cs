using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.PublishWorkflow;

public sealed record SubmitCourseForReviewCommand(Guid CourseId, Guid ActorUserId) : ICommand<CourseDto>;
public sealed record CancelCourseReviewCommand(Guid CourseId, Guid ActorUserId) : ICommand<CourseDto>;
public sealed record UnpublishCourseCommand(Guid CourseId, Guid ActorUserId) : ICommand<CourseDto>;

public sealed class PublishWorkflowCommandHandler(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock,
    IProfileContract? profileContract = null)
    : ICommandHandler<SubmitCourseForReviewCommand, CourseDto>,
      ICommandHandler<CancelCourseReviewCommand, CourseDto>,
      ICommandHandler<UnpublishCourseCommand, CourseDto>
{
    public Task<Result<CourseDto>> Handle(SubmitCourseForReviewCommand request, CancellationToken ct) =>
        ExecuteTransitionAsync(
            request.CourseId,
            request.ActorUserId,
            (course, now) => course.SubmitForReview(now),
            emitSubmittedEvent: true,
            emitUpsertedEvent: false,
            ct);

    public Task<Result<CourseDto>> Handle(CancelCourseReviewCommand request, CancellationToken ct) =>
        ExecuteTransitionAsync(
            request.CourseId,
            request.ActorUserId,
            (course, now) => course.CancelReview(now),
            emitSubmittedEvent: false,
            emitUpsertedEvent: false,
            ct);

    public Task<Result<CourseDto>> Handle(UnpublishCourseCommand request, CancellationToken ct) =>
        ExecuteTransitionAsync(
            request.CourseId,
            request.ActorUserId,
            (course, now) => course.Unpublish(now),
            emitSubmittedEvent: false,
            emitUpsertedEvent: true,
            ct);

    private async Task<Result<CourseDto>> ExecuteTransitionAsync(
        Guid courseId,
        Guid actorUserId,
        Func<CourseEntity, DateTimeOffset, Result> transition,
        bool emitSubmittedEvent,
        bool emitUpsertedEvent,
        CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdWithTagsAsync(courseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure<CourseDto>(Error.NotFound("Không tìm thấy khóa học."));
        }

        if (course.OwnerUserId != actorUserId)
        {
            return Result.Failure<CourseDto>(Error.Forbidden("Chỉ Chủ khóa mới có quyền thực hiện thao tác này."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result result = transition(course, now);
        if (result.IsFailure)
        {
            return Result.Failure<CourseDto>(result.Error);
        }

        if (emitSubmittedEvent)
        {
            await outboxWriter.WriteAsync(course.Id, new CourseSubmittedForReview(
                EventId: Guid.NewGuid(),
                OccurredAt: now,
                CourseId: course.Id,
                CourseName: course.Name,
                OwnerUserId: course.OwnerUserId), ct).ConfigureAwait(false);
        }

        if (emitUpsertedEvent)
        {
            await outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now), ct)
                .ConfigureAwait(false);
        }

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

        string ownerDisplayName = "Giảng viên";
        string? ownerAvatarUrl = null;
        if (profileContract != null)
        {
            Result<PublicProfileDto> profileResult = await profileContract.GetPublicProfile(course.OwnerUserId, ct).ConfigureAwait(false);
            if (profileResult.IsSuccess && !string.IsNullOrWhiteSpace(profileResult.Value.DisplayName))
            {
                ownerDisplayName = profileResult.Value.DisplayName;
                ownerAvatarUrl = profileResult.Value.AvatarUrl;
            }
        }

        CourseDto dto = new(
            Id: course.Id,
            Owner: new UserRefDto(course.OwnerUserId, ownerDisplayName, ownerAvatarUrl),
            Name: course.Name,
            Description: course.Description,
            CoverUrl: null,
            AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
            Status: course.Status.ToString().ToUpperInvariant(),
            IsHidden: course.IsHidden,
            IsDeleted: course.IsDeleted,
            Tags: course.Tags.Select(t => t.Tag).ToArray(),
            CreatedAt: course.CreatedAt,
            UpdatedAt: course.UpdatedAt,
            Viewer: new CourseViewerDto(true, null, true, true, false),
            RatingAvg: null,
            RatingCount: 0,
            PublishStatus: course.PublishStatus.ToApiString(),
            SubmittedForReviewAt: course.SubmittedForReviewAt,
            PublishedAt: course.PublishedAt,
            RejectionReason: course.RejectionReason);

        return Result.Success(dto);
    }
}
