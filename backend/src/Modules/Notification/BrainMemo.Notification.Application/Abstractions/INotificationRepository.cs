using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Application.Abstractions;

public interface INotificationRepository
{
    Task<PagedResult<NotificationItem>> ListForUserAsync(
        Guid recipientUserId,
        bool unreadOnly,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<int> GetUnreadCountAsync(Guid recipientUserId, CancellationToken ct = default);

    Task<NotificationItem?> FindByIdAsync(Guid id, Guid recipientUserId, CancellationToken ct = default);

    Task<int> MarkAllAsReadAsync(Guid recipientUserId, DateTimeOffset utcNow, CancellationToken ct = default);

    Task<Result> AddNotificationAsync(NotificationItem item, CancellationToken ct = default);

    Task<Result> SaveChangesAsync(CancellationToken ct = default);
}
