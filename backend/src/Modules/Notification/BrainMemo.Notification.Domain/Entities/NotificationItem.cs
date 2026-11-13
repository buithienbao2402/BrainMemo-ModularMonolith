using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Domain.Entities;

public sealed class NotificationItem : Entity<Guid>
{
    private NotificationItem(
        Guid id,
        Guid recipientUserId,
        NotificationType type,
        string payloadJson,
        Guid sourceEventId,
        Guid? announcementId,
        DateTimeOffset? readAt,
        DateTimeOffset? deletedAt,
        DateTimeOffset createdAt)
        : base(id)
    {
        RecipientUserId = recipientUserId;
        Type = type;
        PayloadJson = payloadJson;
        SourceEventId = sourceEventId;
        AnnouncementId = announcementId;
        ReadAt = readAt;
        DeletedAt = deletedAt;
        CreatedAt = createdAt;
    }

    // Required by EF Core
    private NotificationItem() : base(Guid.Empty)
    {
        PayloadJson = "{}";
    }

    public Guid RecipientUserId { get; private set; }

    public NotificationType Type { get; private set; }

    public string PayloadJson { get; private set; }

    public Guid SourceEventId { get; private set; }

    public Guid? AnnouncementId { get; private set; }

    public DateTimeOffset? ReadAt { get; private set; }

    public DateTimeOffset? DeletedAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public Announcement? Announcement { get; private set; }

    public bool IsRead => ReadAt.HasValue;

    public bool IsDeleted => DeletedAt.HasValue;

    public static Result<NotificationItem> Create(
        Guid id,
        Guid recipientUserId,
        NotificationType type,
        string payloadJson,
        Guid sourceEventId,
        Guid? announcementId,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("Id không hợp lệ.");
        }

        if (recipientUserId == Guid.Empty)
        {
            return Error.Validation("RecipientUserId không hợp lệ.");
        }

        if (sourceEventId == Guid.Empty)
        {
            return Error.Validation("SourceEventId không hợp lệ.");
        }

        if (type == NotificationType.SystemAnnouncement && (!announcementId.HasValue || announcementId.Value == Guid.Empty))
        {
            return Error.Validation("Thông báo hệ thống phải có AnnouncementId.");
        }

        string safePayload = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson;

        return new NotificationItem(
            id,
            recipientUserId,
            type,
            safePayload,
            sourceEventId,
            announcementId,
            readAt: null,
            deletedAt: null,
            createdAt: utcNow);
    }

    public void MarkAsRead(DateTimeOffset utcNow)
    {
        if (!ReadAt.HasValue)
        {
            ReadAt = utcNow;
        }
    }

    public void SoftDelete(DateTimeOffset utcNow)
    {
        if (!DeletedAt.HasValue)
        {
            DeletedAt = utcNow;
        }
    }
}
