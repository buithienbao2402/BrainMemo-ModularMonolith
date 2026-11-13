using BrainMemo.BuildingBlocks.Abstractions.Email;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.Email;
using BrainMemo.Notification.Application.Options;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BrainMemo.Notification.Application.EventHandlers;

/// <summary>
/// Consumes PasswordResetRequested integration event, builds reset password email,
/// attempts in-memory sending with retries, and records delivery status into ntf_email_delivery.
/// Never logs or persists the raw reset token.
/// </summary>
public sealed class PasswordResetRequestedEventHandler(
    IEmailDeliveryRepository emailDeliveryRepository,
    IIdentityContract identityContract,
    IEmailSender emailSender,
    IOptions<NotificationEmailOptions> emailOptions,
    IClock clock,
    ILogger<PasswordResetRequestedEventHandler> logger) : IIntegrationEventHandler<PasswordResetRequested>
{
    private const int MaxInMemoryAttempts = 3;

    public async Task HandleAsync(PasswordResetRequested @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        EmailDelivery? existing = await emailDeliveryRepository
            .FindBySourceEventAndTemplateAsync(@event.EventId, EmailTemplate.ResetPassword, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            logger.LogInformation("Email delivery already recorded for event {EventId} (ResetPassword). Skipping.", @event.EventId);
            return;
        }

        Result<IReadOnlyList<UserSummaryDto>> summaryResult = await identityContract
            .GetUserSummary([@event.UserId], ct)
            .ConfigureAwait(false);

        if (summaryResult.IsFailure || summaryResult.Value.Count == 0)
        {
            logger.LogWarning("Unable to resolve recipient email for user {UserId} from Identity contract.", @event.UserId);
            return;
        }

        string recipientEmail = summaryResult.Value[0].Email;
        DateTimeOffset utcNow = clock.UtcNow;

        Result<EmailDelivery> deliveryResult = EmailDelivery.Create(
            Guid.NewGuid(),
            @event.EventId,
            EmailTemplate.ResetPassword,
            @event.UserId,
            utcNow);

        if (deliveryResult.IsFailure)
        {
            logger.LogError("Failed to initialize EmailDelivery entity: {Error}", deliveryResult.Error);
            return;
        }

        EmailDelivery delivery = deliveryResult.Value;
        EmailMessage message = NotificationEmailBuilder.BuildPasswordResetEmail(
            recipientEmail,
            @event.RawToken,
            emailOptions.Value);

        bool sentSuccessfully = false;
        string? lastError = null;

        for (int attempt = 1; attempt <= MaxInMemoryAttempts; attempt++)
        {
            try
            {
                await emailSender.Send(message, ct).ConfigureAwait(false);
                sentSuccessfully = true;
                break;
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                logger.LogWarning(ex, "Attempt {Attempt}/{Max} sending password reset email to user {UserId} failed.", attempt, MaxInMemoryAttempts, @event.UserId);

                if (attempt < MaxInMemoryAttempts)
                {
                    await Task.Delay(200 * attempt, ct).ConfigureAwait(false);
                }
            }
        }

        DateTimeOffset finishAt = clock.UtcNow;
        if (sentSuccessfully)
        {
            delivery.MarkSent(finishAt);
            logger.LogInformation("Password reset email sent successfully for user {UserId}.", @event.UserId);
        }
        else
        {
            delivery.RecordFailure(lastError, finishAt, nextAttemptAt: null);
            logger.LogError("Failed to send password reset email for user {UserId} after {Max} attempts.", @event.UserId, MaxInMemoryAttempts);
        }

        await emailDeliveryRepository.AddAsync(delivery, ct).ConfigureAwait(false);
    }
}
