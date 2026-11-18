using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;
using ReportTargetDto = BrainMemo.Learning.Contracts.Dtos.ReportTargetDto;

namespace BrainMemo.Notification.Application.EventHandlers;

public sealed class CommentCreatedEventHandler(
    ICourseContract courseContract,
    ILearningContract learningContract,
    INotificationRepository notificationRepository,
    IClock clock,
    ILogger<CommentCreatedEventHandler> logger) : IIntegrationEventHandler<CommentCreated>
{
    public async Task HandleAsync(CommentCreated @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        try
        {
            HashSet<Guid> recipientIds = new();

            // Course owner
            Result<CourseAccessDto> courseAccess = courseContract.GetCourseAccess(@event.CourseId, null);
            if (courseAccess.IsSuccess && courseAccess.Value.OwnerUserId != Guid.Empty && courseAccess.Value.OwnerUserId != @event.AuthorUserId)
            {
                recipientIds.Add(courseAccess.Value.OwnerUserId);
            }

            // Parent comment author (if this is a reply)
            if (@event.ParentCommentId.HasValue)
            {
                Result<ReportTargetDto> parentTarget = learningContract.ResolveReportTarget(@event.ParentCommentId.Value, Guid.Empty);
                if (parentTarget.IsSuccess && parentTarget.Value.AuthorUserId != Guid.Empty && parentTarget.Value.AuthorUserId != @event.AuthorUserId)
                {
                    recipientIds.Add(parentTarget.Value.AuthorUserId);
                }
            }

            if (recipientIds.Count == 0)
            {
                logger.LogInformation("No recipients for CommentCreated event {EventId}.", @event.EventId);
                return;
            }

            string preview = @event.Content.Length > 120
                ? @event.Content[..120] + "..."
                : @event.Content;

            var payload = new
            {
                subtype = @event.ParentCommentId.HasValue ? "COMMENT_REPLY" : "COMMENT_ROOT",
                courseId = @event.CourseId,
                chapterId = @event.ChapterId,
                commentId = @event.CommentId,
                authorUserId = @event.AuthorUserId,
                parentCommentId = @event.ParentCommentId,
                contentPreview = preview
            };

            string payloadJson = JsonSerializer.Serialize(payload);
            DateTimeOffset now = clock.UtcNow;

            foreach (Guid recipientId in recipientIds)
            {
                bool exists = await notificationRepository
                    .ExistsByEventAndRecipientAsync(@event.EventId, recipientId, ct)
                    .ConfigureAwait(false);

                if (exists)
                {
                    continue;
                }

                Result<NotificationItem> itemResult = NotificationItem.Create(
                    id: Guid.NewGuid(),
                    recipientUserId: recipientId,
                    type: NotificationType.Comment,
                    payloadJson: payloadJson,
                    sourceEventId: @event.EventId,
                    announcementId: null,
                    utcNow: now);

                if (itemResult.IsSuccess)
                {
                    await notificationRepository.AddNotificationAsync(itemResult.Value, ct).ConfigureAwait(false);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error processing CommentCreated event {EventId}. Suppressing to avoid rolling back business.", @event.EventId);
        }
    }
}
