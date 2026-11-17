using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Application.EventHandlers;

public sealed class CourseApprovalDecidedEventHandler(
    INotificationRepository notificationRepository,
    IClock clock,
    ILogger<CourseApprovalDecidedEventHandler> logger) : IIntegrationEventHandler<CourseApprovalDecided>
{
    public async Task HandleAsync(CourseApprovalDecided @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);
        if (@event.OwnerUserId == Guid.Empty) return;

        try
        {
            bool exists = await notificationRepository
                .ExistsByEventAndRecipientAsync(@event.EventId, @event.OwnerUserId, ct)
                .ConfigureAwait(false);

            if (exists) return;

            var payload = new
            {
                subtype = @event.Approved ? "COURSE_APPROVED" : "COURSE_REJECTED",
                courseId = @event.CourseId,
                courseName = @event.CourseName,
                approved = @event.Approved,
                rejectionReason = @event.RejectionReason
            };

            Result<NotificationItem> itemResult = NotificationItem.Create(
                id: Guid.NewGuid(),
                recipientUserId: @event.OwnerUserId,
                type: NotificationType.ReportResult,
                payloadJson: JsonSerializer.Serialize(payload),
                sourceEventId: @event.EventId,
                announcementId: null,
                utcNow: clock.UtcNow);

            if (itemResult.IsSuccess)
            {
                await notificationRepository.AddNotificationAsync(itemResult.Value, ct).ConfigureAwait(false);
                await notificationRepository.SaveChangesAsync(ct).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process CourseApprovalDecided notification for CourseId {CourseId}.", @event.CourseId);
        }
    }
}
