using BrainMemo.BuildingBlocks.Abstractions.Email;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.Commands.CreateAnnouncement;
using BrainMemo.Notification.Application.Commands.DeleteNotification;
using BrainMemo.Notification.Application.Commands.MarkAllNotificationsRead;
using BrainMemo.Notification.Application.Commands.MarkNotificationRead;
using BrainMemo.Notification.Application.DTOs;
using BrainMemo.Notification.Application.EventHandlers;
using BrainMemo.Notification.Application.Options;
using BrainMemo.Notification.Application.Queries.GetUnreadCount;
using BrainMemo.Notification.Application.Queries.ListNotifications;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Notification.UnitTests.Application;

public sealed class NotificationApplicationTests
{
    private sealed class InMemoryNotificationRepository : INotificationRepository
    {
        public List<NotificationItem> Items { get; } = [];

        public Task<PagedResult<NotificationItem>> ListForUserAsync(Guid recipientUserId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default)
        {
            IEnumerable<NotificationItem> filtered = Items.Where(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null);
            if (unreadOnly)
            {
                filtered = filtered.Where(n => n.ReadAt == null);
            }

            List<NotificationItem> list = filtered.OrderByDescending(n => n.CreatedAt).ToList();
            int total = list.Count;
            List<NotificationItem> paged = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<NotificationItem>(paged, page, pageSize, total));
        }

        public Task<int> GetUnreadCountAsync(Guid recipientUserId, CancellationToken ct = default)
        {
            int count = Items.Count(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null && n.ReadAt == null);
            return Task.FromResult(count);
        }

        public Task<NotificationItem?> FindByIdAsync(Guid id, Guid recipientUserId, CancellationToken ct = default)
        {
            NotificationItem? item = Items.FirstOrDefault(n => n.Id == id && n.RecipientUserId == recipientUserId && n.DeletedAt == null);
            return Task.FromResult(item);
        }

        public Task<int> MarkAllAsReadAsync(Guid recipientUserId, DateTimeOffset utcNow, CancellationToken ct = default)
        {
            int count = 0;
            foreach (NotificationItem item in Items.Where(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null && n.ReadAt == null))
            {
                item.MarkAsRead(utcNow);
                count++;
            }

            return Task.FromResult(count);
        }

        public Task<Result> AddNotificationAsync(NotificationItem item, CancellationToken ct = default)
        {
            Items.Add(item);
            return Task.FromResult(Result.Success());
        }

        public Task<Result> SaveChangesAsync(CancellationToken ct = default) => Task.FromResult(Result.Success());
    }

    private sealed class InMemoryAnnouncementRepository : IAnnouncementRepository
    {
        public List<Announcement> Announcements { get; } = [];

        public Task<Result> AddAsync(Announcement announcement, CancellationToken ct = default)
        {
            Announcements.Add(announcement);
            return Task.FromResult(Result.Success());
        }

        public Task<Announcement?> FindByIdAsync(Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(Announcements.FirstOrDefault(a => a.Id == id));
        }
    }

    private sealed class InMemoryEmailDeliveryRepository : IEmailDeliveryRepository
    {
        public List<EmailDelivery> Deliveries { get; } = [];

        public Task<EmailDelivery?> FindBySourceEventAndTemplateAsync(Guid sourceEventId, EmailTemplate template, CancellationToken ct = default)
        {
            return Task.FromResult(Deliveries.FirstOrDefault(d => d.SourceEventId == sourceEventId && d.Template == template));
        }

        public Task<Result> AddAsync(EmailDelivery delivery, CancellationToken ct = default)
        {
            Deliveries.Add(delivery);
            return Task.FromResult(Result.Success());
        }

        public Task<Result> UpdateAsync(EmailDelivery delivery, CancellationToken ct = default) => Task.FromResult(Result.Success());
    }

    private sealed class FakeIdentityContract : IIdentityContract
    {
        public Dictionary<Guid, UserSummaryDto> Users { get; } = [];

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            List<UserSummaryDto> list = [];
            foreach (Guid id in userIds)
            {
                if (Users.TryGetValue(id, out UserSummaryDto? dto))
                {
                    list.Add(dto);
                }
            }

            return Task.FromResult<Result<IReadOnlyList<UserSummaryDto>>>(list);
        }

        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeEmailSender : IEmailSender
    {
        public List<EmailMessage> SentMessages { get; } = [];
        public bool ShouldFail { get; set; }

        public Task Send(EmailMessage message, CancellationToken ct = default)
        {
            if (ShouldFail)
            {
                throw new InvalidOperationException("Simulated SMTP error");
            }

            SentMessages.Add(message);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; } = now;
    }

    [Fact]
    public async Task EmailVerificationRequestedHandler_ShouldSendEmailAndRecordDelivery()
    {
        InMemoryEmailDeliveryRepository deliveryRepo = new();
        FakeIdentityContract identity = new();
        FakeEmailSender emailSender = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        IOptions<NotificationEmailOptions> options = Options.Create(new NotificationEmailOptions());

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "verify@brainmemo.vn");

        EmailVerificationRequestedEventHandler handler = new(
            deliveryRepo,
            identity,
            emailSender,
            options,
            clock,
            NullLogger<EmailVerificationRequestedEventHandler>.Instance);

        Guid eventId = Guid.NewGuid();
        EmailVerificationRequested evt = new(eventId, clock.UtcNow, userId, Guid.NewGuid(), "secret_token_abc");

        await handler.HandleAsync(evt, CancellationToken.None);

        Assert.Single(emailSender.SentMessages);
        EmailMessage sent = emailSender.SentMessages[0];
        Assert.Equal("verify@brainmemo.vn", sent.ToEmail);
        Assert.Contains("secret_token_abc", sent.HtmlBody);

        Assert.Single(deliveryRepo.Deliveries);
        EmailDelivery delivery = deliveryRepo.Deliveries[0];
        Assert.Equal(eventId, delivery.SourceEventId);
        Assert.Equal(EmailTemplate.VerifyEmail, delivery.Template);
        Assert.Equal(EmailDeliveryStatus.Sent, delivery.Status);

        // Idempotency: second handle does not re-send
        await handler.HandleAsync(evt, CancellationToken.None);
        Assert.Single(emailSender.SentMessages);
    }

    [Fact]
    public async Task PasswordResetRequestedHandler_ShouldSendEmailAndRecordDelivery()
    {
        InMemoryEmailDeliveryRepository deliveryRepo = new();
        FakeIdentityContract identity = new();
        FakeEmailSender emailSender = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        IOptions<NotificationEmailOptions> options = Options.Create(new NotificationEmailOptions());

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "reset@brainmemo.vn");

        PasswordResetRequestedEventHandler handler = new(
            deliveryRepo,
            identity,
            emailSender,
            options,
            clock,
            NullLogger<PasswordResetRequestedEventHandler>.Instance);

        Guid eventId = Guid.NewGuid();
        PasswordResetRequested evt = new(eventId, clock.UtcNow, userId, Guid.NewGuid(), "reset_raw_123");

        await handler.HandleAsync(evt, CancellationToken.None);

        Assert.Single(emailSender.SentMessages);
        EmailMessage sent = emailSender.SentMessages[0];
        Assert.Equal("reset@brainmemo.vn", sent.ToEmail);
        Assert.Contains("reset_raw_123", sent.HtmlBody);

        Assert.Single(deliveryRepo.Deliveries);
        EmailDelivery delivery = deliveryRepo.Deliveries[0];
        Assert.Equal(eventId, delivery.SourceEventId);
        Assert.Equal(EmailTemplate.ResetPassword, delivery.Template);
        Assert.Equal(EmailDeliveryStatus.Sent, delivery.Status);
    }

    [Fact]
    public async Task AccountLockedHandler_ShouldSendEmail()
    {
        InMemoryEmailDeliveryRepository deliveryRepo = new();
        FakeIdentityContract identity = new();
        FakeEmailSender emailSender = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.LockedTemporary, clock.UtcNow, "locked@brainmemo.vn");

        AccountLockedEventHandler handler = new(
            deliveryRepo,
            identity,
            emailSender,
            clock,
            NullLogger<AccountLockedEventHandler>.Instance);

        Guid eventId = Guid.NewGuid();
        DateTimeOffset until = clock.UtcNow.AddDays(7);
        AccountLocked evt = new(eventId, clock.UtcNow, userId, LockType.Temporary, until, Guid.NewGuid());

        await handler.HandleAsync(evt, CancellationToken.None);

        Assert.Single(emailSender.SentMessages);
        EmailMessage sent = emailSender.SentMessages[0];
        Assert.Equal("locked@brainmemo.vn", sent.ToEmail);
        Assert.Contains("tạm thời", sent.HtmlBody);

        Assert.Single(deliveryRepo.Deliveries);
        Assert.Equal(EmailDeliveryStatus.Sent, deliveryRepo.Deliveries[0].Status);
    }

    [Fact]
    public async Task NotificationQueriesAndCommands_ShouldOperateCorrectly()
    {
        InMemoryNotificationRepository repo = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        Guid n1 = Guid.NewGuid();
        Guid n2 = Guid.NewGuid();

        NotificationItem item1 = NotificationItem.Create(n1, userId, NotificationType.Comment, "{\"commentId\":\"1\"}", Guid.NewGuid(), null, clock.UtcNow).Value;
        NotificationItem item2 = NotificationItem.Create(n2, userId, NotificationType.Enrollment, "{\"courseId\":\"2\"}", Guid.NewGuid(), null, clock.UtcNow.AddMinutes(1)).Value;

        await repo.AddNotificationAsync(item1);
        await repo.AddNotificationAsync(item2);

        // Get unread count
        GetUnreadCountQueryHandler unreadHandler = new(repo);
        Result<int> unread = await unreadHandler.Handle(new GetUnreadCountQuery(userId), CancellationToken.None);
        Assert.Equal(2, unread.Value);

        // Mark 1 as read
        MarkNotificationReadCommandHandler readHandler = new(repo, clock);
        Result markResult = await readHandler.Handle(new MarkNotificationReadCommand(userId, n1), CancellationToken.None);
        Assert.True(markResult.IsSuccess);

        unread = await unreadHandler.Handle(new GetUnreadCountQuery(userId), CancellationToken.None);
        Assert.Equal(1, unread.Value);

        // List notifications
        ListNotificationsQueryHandler listHandler = new(repo);
        Result<PagedResult<NotificationDto>> list = await listHandler.Handle(new ListNotificationsQuery(userId, false, 1, 10), CancellationToken.None);
        Assert.True(list.IsSuccess);
        Assert.Equal(2, list.Value.TotalItems);

        // Mark all as read
        MarkAllNotificationsReadCommandHandler markAllHandler = new(repo, clock);
        await markAllHandler.Handle(new MarkAllNotificationsReadCommand(userId), CancellationToken.None);

        unread = await unreadHandler.Handle(new GetUnreadCountQuery(userId), CancellationToken.None);
        Assert.Equal(0, unread.Value);

        // Delete notification
        DeleteNotificationCommandHandler deleteHandler = new(repo, clock);
        await deleteHandler.Handle(new DeleteNotificationCommand(userId, n1), CancellationToken.None);

        list = await listHandler.Handle(new ListNotificationsQuery(userId, false, 1, 10), CancellationToken.None);
        Assert.Equal(1, list.Value.TotalItems);
        Assert.Equal(n2, list.Value.Items[0].Id);
    }

    [Fact]
    public async Task CreateAnnouncementCommandHandler_ShouldCreateAnnouncement()
    {
        InMemoryAnnouncementRepository repo = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        CreateAnnouncementCommandHandler handler = new(repo, clock);

        Guid adminId = Guid.NewGuid();
        CreateAnnouncementCommand command = new(adminId, "Thông báo quan trọng", "Nội dung thông báo toàn hệ thống");

        Result<Guid> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value);

        Announcement? saved = await repo.FindByIdAsync(result.Value);
        Assert.NotNull(saved);
        Assert.Equal("Thông báo quan trọng", saved.Title);
        Assert.Equal(adminId, saved.CreatedByUserId);
        Assert.Equal(DispatchStatus.Pending, saved.DispatchStatus);
    }
}
