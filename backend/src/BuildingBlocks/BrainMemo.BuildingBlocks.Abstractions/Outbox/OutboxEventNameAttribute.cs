namespace BrainMemo.BuildingBlocks.Abstractions.Outbox;

/// <summary>
/// Optional explicit outbox <c>event_type</c> name (max 60 characters) for an integration event.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public sealed class OutboxEventNameAttribute : Attribute
{
    public OutboxEventNameAttribute(string eventType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(eventType);

        string normalized = eventType.Trim();
        if (normalized.Length > OutboxMessage.MaxEventTypeLength)
        {
            throw new ArgumentException(
                $"Outbox event_type '{normalized}' exceeds {OutboxMessage.MaxEventTypeLength} characters.",
                nameof(eventType));
        }

        EventType = normalized;
    }

    public string EventType { get; }
}
