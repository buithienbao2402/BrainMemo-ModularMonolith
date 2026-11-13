using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Application.Abstractions;

public interface IEmailDeliveryRepository
{
    Task<EmailDelivery?> FindBySourceEventAndTemplateAsync(
        Guid sourceEventId,
        EmailTemplate template,
        CancellationToken ct = default);

    Task<Result> AddAsync(EmailDelivery delivery, CancellationToken ct = default);

    Task<Result> UpdateAsync(EmailDelivery delivery, CancellationToken ct = default);
}
