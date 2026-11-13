using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Infrastructure.Persistence;

public sealed class AnnouncementRepository(
    NotificationDbContext dbContext,
    ILogger<AnnouncementRepository>? logger = null) : IAnnouncementRepository
{
    public async Task<Result> AddAsync(Announcement announcement, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(announcement);

        try
        {
            await dbContext.Announcements.AddAsync(announcement, ct).ConfigureAwait(false);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogError(ex, "Failed to insert announcement {Id}", announcement.Id);
            return new Error("INTERNAL_SERVER_ERROR", "Lỗi khi tạo thông báo hệ thống.");
        }
    }

    public async Task<Announcement?> FindByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await dbContext.Announcements
            .FirstOrDefaultAsync(a => a.Id == id, ct)
            .ConfigureAwait(false);
    }
}
