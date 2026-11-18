using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Moderation.Infrastructure.EventHandlers;

public sealed class AccountUnlockedEventHandler(
    ModerationDbContext dbContext,
    IModerationRepository repository,
    ILogger<AccountUnlockedEventHandler> logger) : IIntegrationEventHandler<AccountUnlocked>
{
    public async Task HandleAsync(AccountUnlocked @event, CancellationToken ct)
    {
        if (@event.Kind != UnlockKind.AutoExpired)
        {
            return;
        }

        Sanction? sanction = await dbContext.Sanctions
            .FirstOrDefaultAsync(s => s.Id == @event.SanctionId && s.LiftedAt == null, ct)
            .ConfigureAwait(false);

        if (sanction is null)
        {
            return;
        }

        sanction.Lift(null, "Tự động gỡ khi hết hạn khóa tài khoản", LiftKind.Expired, @event.OccurredAt);

        Result<AuditLog> auditLog = AuditLog.Create(
            Guid.NewGuid(),
            AuditActorType.System,
            null,
            AuditAction.AccountUnlocked,
            AuditObjectType.User,
            sanction.TargetId,
            null,
            "Tự động gỡ khi hết hạn khóa tài khoản",
            null,
            sanction.ReportId,
            sanction.Id,
            @event.OccurredAt);

        if (auditLog.IsSuccess)
        {
            await repository.AddAuditLogAsync(auditLog.Value, ct).ConfigureAwait(false);
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        logger.LogInformation("Closed expired temporary lock sanction {SanctionId} for user {UserId}", sanction.Id, @event.UserId);
    }
}
