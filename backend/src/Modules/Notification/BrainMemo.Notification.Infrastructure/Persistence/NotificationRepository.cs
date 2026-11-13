using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Infrastructure.Persistence;

public sealed class NotificationRepository(
    NotificationDbContext dbContext,
    ILogger<NotificationRepository>? logger = null) : INotificationRepository
{
    public async Task<PagedResult<NotificationItem>> ListForUserAsync(
        Guid recipientUserId,
        bool unreadOnly,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<NotificationItem> query = dbContext.Notifications
            .AsNoTracking()
            .Include(n => n.Announcement)
            .Where(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null);

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        int totalCount = await query.CountAsync(ct).ConfigureAwait(false);

        List<NotificationItem> items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<NotificationItem>(items, page, pageSize, totalCount);
    }

    public async Task<int> GetUnreadCountAsync(Guid recipientUserId, CancellationToken ct = default)
    {
        return await dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null && n.ReadAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<NotificationItem?> FindByIdAsync(Guid id, Guid recipientUserId, CancellationToken ct = default)
    {
        return await dbContext.Notifications
            .Include(n => n.Announcement)
            .FirstOrDefaultAsync(n => n.Id == id && n.RecipientUserId == recipientUserId && n.DeletedAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> MarkAllAsReadAsync(Guid recipientUserId, DateTimeOffset utcNow, CancellationToken ct = default)
    {
        return await dbContext.Notifications
            .Where(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null && n.ReadAt == null)
            .ExecuteUpdateAsync(setter => setter.SetProperty(n => n.ReadAt, utcNow), ct)
            .ConfigureAwait(false);
    }

    public async Task<Result> AddNotificationAsync(NotificationItem item, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(item);

        try
        {
            await dbContext.Notifications.AddAsync(item, ct).ConfigureAwait(false);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogWarning(ex, "Failed to insert notification {Id} for user {UserId}. Record may already exist.", item.Id, item.RecipientUserId);
            return Error.Conflict("NOTIFICATION_EXISTS", "Thông báo đã tồn tại.");
        }
    }

    public async Task<Result> SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogError(ex, "Error saving notification changes.");
            return new Error("INTERNAL_SERVER_ERROR", "Lỗi khi lưu thông báo.");
        }
    }
}
