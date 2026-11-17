using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Messaging.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Application.EventHandlers;

public sealed class NewMessageReceivedEventHandler(
    INotificationRepository notificationRepository,
    IClock clock,
    ILogger<NewMessageReceivedEventHandler> logger) : IIntegrationEventHandler<NewMessageReceived>
{
    public async Task HandleAsync(NewMessageReceived @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);
        if (@event.RecipientUserId == Guid.Empty) return;

        try
        {
            bool exists = await notificationRepository
                .ExistsByEventAndRecipientAsync(@event.EventId, @event.RecipientUserId, ct)
                .ConfigureAwait(false);

            if (exists) return;

            var payload = new
            {
                subtype = "NEW_MESSAGE",
                conversationId = @event.ConversationId,
                messageId = @event.MessageId,
                courseId = @event.CourseId,
                senderUserId = @event.SenderUserId,
                preview = @event.Preview
            };

            Result<NotificationItem> itemResult = NotificationItem.Create(
                id: Guid.NewGuid(),
                recipientUserId: @event.RecipientUserId,
                type: NotificationType.Comment,
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
            logger.LogError(ex, "Failed to create notification for NewMessageReceived {MessageId}.", @event.MessageId);
        }
    }
}
