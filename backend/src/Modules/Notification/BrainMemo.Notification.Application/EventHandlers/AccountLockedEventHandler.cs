using BrainMemo.BuildingBlocks.Abstractions.Email;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.Email;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Notification.Application.EventHandlers;

/// <summary>
/// Consumes AccountLocked integration event, builds account locked notification email,
/// sends to user, and tracks delivery status in ntf_email_delivery.
/// </summary>
public sealed class AccountLockedEventHandler(
    IEmailDeliveryRepository emailDeliveryRepository,
    IIdentityContract identityContract,
    IEmailSender emailSender,
    IClock clock,
    ILogger<AccountLockedEventHandler> logger) : IIntegrationEventHandler<AccountLocked>
{
    public async Task HandleAsync(AccountLocked @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        EmailDelivery? existing = await emailDeliveryRepository
            .FindBySourceEventAndTemplateAsync(@event.EventId, EmailTemplate.AccountLocked, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            logger.LogInformation("Email delivery already recorded for event {EventId} (AccountLocked). Skipping.", @event.EventId);
            return;
        }

        Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
            .GetUserSummary([@event.UserId], ct)
            .ConfigureAwait(false);

        if (summaryResult.IsFailure || summaryResult.Value.Count == 0)
        {
            logger.LogWarning("Unable to resolve recipient email for locked user {UserId} from Identity contract.", @event.UserId);
            return;
        }

        string recipientEmail = summaryResult.Value[0].Email;
        DateTimeOffset utcNow = clock.UtcNow;

        Result<EmailDelivery> deliveryResult = EmailDelivery.Create(
            Guid.NewGuid(),
            @event.EventId,
            EmailTemplate.AccountLocked,
            @event.UserId,
            utcNow);

        if (deliveryResult.IsFailure)
        {
            logger.LogError("Failed to initialize EmailDelivery entity for AccountLocked: {Error}", deliveryResult.Error);
            return;
        }

        EmailDelivery delivery = deliveryResult.Value;
        EmailMessage message = NotificationEmailBuilder.BuildAccountLockedEmail(
            recipientEmail,
            @event.Type,
            @event.Until);

        try
        {
            await emailSender.Send(message, ct).ConfigureAwait(false);
            delivery.MarkSent(clock.UtcNow);
            logger.LogInformation("Account locked email sent successfully to user {UserId}.", @event.UserId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send account locked email to user {UserId}. Scheduling retry.", @event.UserId);
            DateTimeOffset nextAttempt = utcNow.AddMinutes(5);
            delivery.RecordFailure(ex.Message, clock.UtcNow, nextAttempt);
        }

        await emailDeliveryRepository.AddAsync(delivery, ct).ConfigureAwait(false);
    }
}
