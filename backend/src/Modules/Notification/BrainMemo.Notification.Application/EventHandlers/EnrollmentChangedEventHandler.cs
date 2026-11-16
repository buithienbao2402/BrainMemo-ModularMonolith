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

public sealed class EnrollmentChangedEventHandler(
    INotificationRepository notificationRepository,
    IClock clock,
    ILogger<EnrollmentChangedEventHandler> logger) : IIntegrationEventHandler<EnrollmentChanged>
{
    public async Task HandleAsync(EnrollmentChanged @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        try
        {
            (Guid recipientUserId, NotificationType type) = ResolveRecipientAndType(@event);

            if (recipientUserId == Guid.Empty)
            {
                logger.LogInformation("No recipient resolved for EnrollmentChanged event {EventId}.", @event.EventId);
                return;
            }

            bool exists = await notificationRepository
                .ExistsByEventAndRecipientAsync(@event.EventId, recipientUserId, ct)
                .ConfigureAwait(false);

            if (exists)
            {
                logger.LogInformation("Notification already exists for event {EventId} and user {UserId}. Skipping.", @event.EventId, recipientUserId);
                return;
            }

            var payload = new
            {
                subtype = type == NotificationType.EnrollmentInviteJoin ? "INVITE_JOIN" : "ENROLLMENT_STATUS",
                courseId = @event.CourseId,
                action = @event.Action,
                fromStatus = @event.FromStatus ?? @event.PreviousStatus,
                toStatus = @event.ToStatus ?? @event.NewStatus,
                studentUserId = @event.UserId,
                ownerUserId = @event.OwnerUserId
            };

            string payloadJson = JsonSerializer.Serialize(payload);
            DateTimeOffset now = clock.UtcNow;

            Result<NotificationItem> itemResult = NotificationItem.Create(
                id: Guid.NewGuid(),
                recipientUserId: recipientUserId,
                type: type,
                payloadJson: payloadJson,
                sourceEventId: @event.EventId,
                announcementId: null,
                utcNow: now);

            if (!itemResult.IsSuccess)
            {
                logger.LogWarning("Failed to create notification item for EnrollmentChanged {EventId}: {Error}", @event.EventId, itemResult.Error);
                return;
            }

            await notificationRepository.AddNotificationAsync(itemResult.Value, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error processing EnrollmentChanged event {EventId}. Suppressing to avoid rolling back business.", @event.EventId);
        }
    }

    private static (Guid RecipientUserId, NotificationType Type) ResolveRecipientAndType(EnrollmentChanged @event)
    {
        string action = (@event.Action ?? string.Empty).ToUpperInvariant();

        return action switch
        {
            "INVITED" => (@event.UserId, NotificationType.EnrollmentInviteJoin),
            "REQUEST_CREATED" => (@event.OwnerUserId, NotificationType.Enrollment),
            "APPROVED" => (@event.UserId, NotificationType.Enrollment),
            "REJECTED" => (@event.UserId, NotificationType.Enrollment),
            "JOINED" or "ENROLLED" => (@event.OwnerUserId, NotificationType.Enrollment),
            "LEFT" => (@event.OwnerUserId, NotificationType.Enrollment),
            "REMOVED" => (@event.UserId, NotificationType.Enrollment),
            _ => string.Equals(@event.ToStatus, "PENDING_APPROVAL", StringComparison.OrdinalIgnoreCase)
                ? (@event.OwnerUserId, NotificationType.Enrollment)
                : (@event.UserId != Guid.Empty ? @event.UserId : @event.OwnerUserId, NotificationType.Enrollment)
        };
    }
}
