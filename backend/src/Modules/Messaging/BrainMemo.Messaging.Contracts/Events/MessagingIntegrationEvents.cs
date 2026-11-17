using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Messaging.Contracts.Events;

public sealed record NewMessageReceived(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ConversationId,
    Guid MessageId,
    Guid CourseId,
    Guid SenderUserId,
    Guid RecipientUserId,
    string Preview) : IntegrationEvent(EventId, OccurredAt);
