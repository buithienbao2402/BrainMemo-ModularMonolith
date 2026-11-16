using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Application.EventHandlers;

public sealed class ChapterPublishedEventHandler(
    ICourseContract courseContract,
    INotificationRepository notificationRepository,
    IClock clock,
    ILogger<ChapterPublishedEventHandler> logger) : IIntegrationEventHandler<ChapterPublished>
{
    public async Task HandleAsync(ChapterPublished @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        if (!@event.IsFirstPublish)
        {
            return;
        }

        try
        {
            var payload = new
            {
                subtype = "NEW_CHAPTER",
                courseId = @event.CourseId,
                chapterId = @event.ChapterId,
                versionNo = @event.VersionNo
            };

            string payloadJson = JsonSerializer.Serialize(payload);
            DateTimeOffset now = clock.UtcNow;

            Guid? afterId = null;
            bool hasMore = true;

            while (hasMore)
            {
                Result<Page<Guid>> learnersResult = courseContract.ListActiveLearnerIds(
                    @event.CourseId,
                    afterId,
                    50);

                if (!learnersResult.IsSuccess || learnersResult.Value.Items.Count == 0)
                {
                    break;
                }

                foreach (Guid learnerId in learnersResult.Value.Items)
                {
                    if (learnerId == Guid.Empty)
                    {
                        continue;
                    }

                    bool exists = await notificationRepository
                        .ExistsByEventAndRecipientAsync(@event.EventId, learnerId, ct)
                        .ConfigureAwait(false);

                    if (exists)
                    {
                        continue;
                    }

                    Result<NotificationItem> itemResult = NotificationItem.Create(
                        id: Guid.NewGuid(),
                        recipientUserId: learnerId,
                        type: NotificationType.NewChapter,
                        payloadJson: payloadJson,
                        sourceEventId: @event.EventId,
                        announcementId: null,
                        utcNow: now);

                    if (itemResult.IsSuccess)
                    {
                        await notificationRepository.AddNotificationAsync(itemResult.Value, ct).ConfigureAwait(false);
                    }
                }

                hasMore = learnersResult.Value.HasMore;
                afterId = learnersResult.Value.AfterId;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error processing ChapterPublished event {EventId}. Suppressing to avoid rolling back business.", @event.EventId);
        }
    }
}
