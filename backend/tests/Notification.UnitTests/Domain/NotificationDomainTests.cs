using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Notification.UnitTests.Domain;

public sealed class NotificationDomainTests
{
    [Fact]
    public void Announcement_Create_WithValidData_ShouldSucceed()
    {
        Guid id = Guid.NewGuid();
        Guid adminId = Guid.NewGuid();
        DateTimeOffset now = DateTimeOffset.UtcNow;

        Result<Announcement> result = Announcement.Create(id, "Bảo trì hệ thống", "<p>Hệ thống bảo trì 2 tiếng.</p>", adminId, now);

        Assert.True(result.IsSuccess);
        Announcement announcement = result.Value;
        Assert.Equal(id, announcement.Id);
        Assert.Equal("Bảo trì hệ thống", announcement.Title);
        Assert.Equal(adminId, announcement.CreatedByUserId);
        Assert.Equal(DispatchStatus.Pending, announcement.DispatchStatus);
        Assert.Null(announcement.RecipientCount);
        Assert.Null(announcement.DispatchedAt);
    }

    [Fact]
    public void Announcement_Create_WithEmptyTitle_ShouldFail()
    {
        Result<Announcement> result = Announcement.Create(Guid.NewGuid(), "   ", "Nội dung", Guid.NewGuid(), DateTimeOffset.UtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
    }

    [Fact]
    public void Announcement_MarkDispatched_ShouldUpdateStatusAndCount()
    {
        Announcement announcement = Announcement.Create(Guid.NewGuid(), "Tiêu đề", "Nội dung", Guid.NewGuid(), DateTimeOffset.UtcNow).Value;
        DateTimeOffset dispatchedAt = DateTimeOffset.UtcNow.AddMinutes(5);

        announcement.MarkDispatched(150, dispatchedAt);

        Assert.Equal(DispatchStatus.Completed, announcement.DispatchStatus);
        Assert.Equal(150, announcement.RecipientCount);
        Assert.Equal(dispatchedAt, announcement.DispatchedAt);
    }

    [Fact]
    public void NotificationItem_MarkAsRead_ShouldSetReadAtOnlyOnce()
    {
        Guid id = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        DateTimeOffset created = DateTimeOffset.UtcNow;

        NotificationItem item = NotificationItem.Create(
            id,
            userId,
            NotificationType.Comment,
            "{\"commentId\":\"abc\"}",
            Guid.NewGuid(),
            announcementId: null,
            created).Value;

        Assert.False(item.IsRead);
        Assert.Null(item.ReadAt);

        DateTimeOffset read1 = created.AddMinutes(2);
        item.MarkAsRead(read1);

        Assert.True(item.IsRead);
        Assert.Equal(read1, item.ReadAt);

        // Subsequent call does not overwrite earlier readAt
        item.MarkAsRead(created.AddMinutes(10));
        Assert.Equal(read1, item.ReadAt);
    }

    [Fact]
    public void NotificationItem_SoftDelete_ShouldSetDeletedAt()
    {
        NotificationItem item = NotificationItem.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            NotificationType.GradeFeedback,
            "{}",
            Guid.NewGuid(),
            announcementId: null,
            DateTimeOffset.UtcNow).Value;

        Assert.False(item.IsDeleted);

        DateTimeOffset deletedAt = DateTimeOffset.UtcNow.AddMinutes(1);
        item.SoftDelete(deletedAt);

        Assert.True(item.IsDeleted);
        Assert.Equal(deletedAt, item.DeletedAt);
    }

    [Fact]
    public void EmailDelivery_MarkSent_And_RecordFailure()
    {
        Guid eventId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        DateTimeOffset now = DateTimeOffset.UtcNow;

        EmailDelivery delivery = EmailDelivery.Create(Guid.NewGuid(), eventId, EmailTemplate.VerifyEmail, userId, now).Value;

        Assert.Equal(EmailDeliveryStatus.Pending, delivery.Status);
        Assert.Equal(0, delivery.AttemptCount);

        delivery.RecordFailure("SMTP Connection Refused", now.AddSeconds(1));
        Assert.Equal(EmailDeliveryStatus.Failed, delivery.Status);
        Assert.Equal(1, delivery.AttemptCount);
        Assert.Equal("SMTP Connection Refused", delivery.LastError);

        delivery.MarkSent(now.AddSeconds(10));
        Assert.Equal(EmailDeliveryStatus.Sent, delivery.Status);
        Assert.Equal(2, delivery.AttemptCount);
        Assert.Null(delivery.LastError);
        Assert.NotNull(delivery.SentAt);
    }
}
