using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Infrastructure.Persistence;

public sealed class EmailDeliveryRepository(
    NotificationDbContext dbContext,
    ILogger<EmailDeliveryRepository>? logger = null) : IEmailDeliveryRepository
{
    public async Task<EmailDelivery?> FindBySourceEventAndTemplateAsync(
        Guid sourceEventId,
        EmailTemplate template,
        CancellationToken ct = default)
    {
        return await dbContext.EmailDeliveries
            .FirstOrDefaultAsync(e => e.SourceEventId == sourceEventId && e.Template == template, ct)
            .ConfigureAwait(false);
    }

    public async Task<Result> AddAsync(EmailDelivery delivery, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(delivery);

        try
        {
            await dbContext.EmailDeliveries.AddAsync(delivery, ct).ConfigureAwait(false);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogWarning(ex, "Failed to insert email delivery {Id} for event {EventId}. Delivery may already exist.", delivery.Id, delivery.SourceEventId);
            return Error.Conflict("DELIVERY_EXISTS", "Bản ghi gửi email đã tồn tại.");
        }
    }

    public async Task<Result> UpdateAsync(EmailDelivery delivery, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(delivery);

        try
        {
            dbContext.EmailDeliveries.Update(delivery);
            await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (DbUpdateException ex)
        {
            logger?.LogError(ex, "Failed to update email delivery {Id}", delivery.Id);
            return new Error("INTERNAL_SERVER_ERROR", "Lỗi khi cập nhật trạng thái gửi email.");
        }
    }
}
