namespace BrainMemo.BuildingBlocks.Abstractions.Outbox;

/// <summary>
/// Table-agnostic transactional outbox record matching <c>crs_outbox_event</c>,
/// <c>lrn_outbox_event</c>, and <c>ast_outbox_event</c> in <c>db/schema.sql</c>.
/// </summary>
public sealed class OutboxMessage
{
    public const int MaxEventTypeLength = 60;
    public const int MaxLastErrorLength = 500;

    private OutboxMessage()
    {
    }

    private OutboxMessage(
        Guid id,
        string eventType,
        Guid aggregateId,
        string payload,
        DateTimeOffset createdAt)
    {
        Id = id;
        EventType = eventType;
        AggregateId = aggregateId;
        Payload = payload;
        CreatedAt = createdAt;
        AttemptCount = 0;
    }

    public Guid Id { get; private set; }

    public string EventType { get; private set; } = string.Empty;

    public Guid AggregateId { get; private set; }

    public string Payload { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? PublishedAt { get; private set; }

    public ushort AttemptCount { get; private set; }

    public string? LastError { get; private set; }

    public static OutboxMessage Create(
        Guid id,
        string eventType,
        Guid aggregateId,
        string payload,
        DateTimeOffset createdAt)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("Outbox EventId cannot be empty.", nameof(id));
        }

        if (aggregateId == Guid.Empty)
        {
            throw new ArgumentException("Outbox AggregateId cannot be empty.", nameof(aggregateId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(eventType);
        string normalizedType = eventType.Trim();
        if (normalizedType.Length > MaxEventTypeLength)
        {
            throw new ArgumentException(
                $"Outbox event_type '{normalizedType}' exceeds {MaxEventTypeLength} characters.",
                nameof(eventType));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(payload);

        return new OutboxMessage(id, normalizedType, aggregateId, payload, createdAt);
    }

    public void MarkPublished(DateTimeOffset publishedAt)
    {
        PublishedAt = publishedAt;
        IncrementAttemptCount();
        LastError = null;
    }

    public void MarkFailed(string error)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(error);
        IncrementAttemptCount();

        string trimmed = error.Trim();
        LastError = trimmed.Length <= MaxLastErrorLength
            ? trimmed
            : trimmed[..MaxLastErrorLength];
    }

    private void IncrementAttemptCount()
    {
        if (AttemptCount < ushort.MaxValue)
        {
            AttemptCount++;
        }
    }
}
