using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Domain.Entities;

public sealed class EmailDelivery : Entity<Guid>
{
    public const int MaxLastErrorLength = 500;

    private EmailDelivery(
        Guid id,
        Guid sourceEventId,
        EmailTemplate template,
        Guid recipientUserId,
        EmailDeliveryStatus status,
        byte attemptCount,
        DateTimeOffset? nextAttemptAt,
        DateTimeOffset? lastAttemptAt,
        string? lastError,
        DateTimeOffset? sentAt,
        DateTimeOffset createdAt)
        : base(id)
    {
        SourceEventId = sourceEventId;
        Template = template;
        RecipientUserId = recipientUserId;
        Status = status;
        AttemptCount = attemptCount;
        NextAttemptAt = nextAttemptAt;
        LastAttemptAt = lastAttemptAt;
        LastError = lastError;
        SentAt = sentAt;
        CreatedAt = createdAt;
    }

    // Required by EF Core
    private EmailDelivery() : base(Guid.Empty)
    {
    }

    public Guid SourceEventId { get; private set; }

    public EmailTemplate Template { get; private set; }

    public Guid RecipientUserId { get; private set; }

    public EmailDeliveryStatus Status { get; private set; }

    public byte AttemptCount { get; private set; }

    public DateTimeOffset? NextAttemptAt { get; private set; }

    public DateTimeOffset? LastAttemptAt { get; private set; }

    public string? LastError { get; private set; }

    public DateTimeOffset? SentAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static Result<EmailDelivery> Create(
        Guid id,
        Guid sourceEventId,
        EmailTemplate template,
        Guid recipientUserId,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("Id không hợp lệ.");
        }

        if (sourceEventId == Guid.Empty)
        {
            return Error.Validation("SourceEventId không hợp lệ.");
        }

        if (recipientUserId == Guid.Empty)
        {
            return Error.Validation("RecipientUserId không hợp lệ.");
        }

        return new EmailDelivery(
            id,
            sourceEventId,
            template,
            recipientUserId,
            EmailDeliveryStatus.Pending,
            attemptCount: 0,
            nextAttemptAt: null,
            lastAttemptAt: null,
            lastError: null,
            sentAt: null,
            createdAt: utcNow);
    }

    public void MarkSent(DateTimeOffset utcNow)
    {
        Status = EmailDeliveryStatus.Sent;
        AttemptCount++;
        LastAttemptAt = utcNow;
        SentAt = utcNow;
        NextAttemptAt = null;
        LastError = null;
    }

    public void RecordFailure(string? errorMessage, DateTimeOffset utcNow, DateTimeOffset? nextAttemptAt = null)
    {
        AttemptCount++;
        LastAttemptAt = utcNow;
        NextAttemptAt = nextAttemptAt;
        LastError = string.IsNullOrWhiteSpace(errorMessage)
            ? "Gửi email thất bại."
            : errorMessage.Length > MaxLastErrorLength
                ? errorMessage[..MaxLastErrorLength]
                : errorMessage;

        if (nextAttemptAt is null)
        {
            Status = EmailDeliveryStatus.Failed;
        }
        else
        {
            Status = EmailDeliveryStatus.Pending;
        }
    }
}
