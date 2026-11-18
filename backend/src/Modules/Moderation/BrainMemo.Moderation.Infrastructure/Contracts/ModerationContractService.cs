using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Contracts;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Moderation.Infrastructure.Contracts;

public sealed class ModerationContractService(
    ModerationDbContext dbContext,
    IModerationRepository repository,
    IClock clock) : IModerationContract
{
    public async Task<Result<Guid>> SubmitAiFlag(
        Guid aiFindingId,
        ReportTargetType targetType,
        Guid targetId,
        Guid targetCourseId,
        Guid targetOwnerUserId,
        string reasonCode,
        string contentSnapshot,
        decimal score,
        CancellationToken ct = default)
    {
        // 1. Idempotency check on ai_finding_id
        Report? existing = await dbContext.Reports
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AiFindingId == aiFindingId, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            return Result.Success(existing.Id);
        }

        DateTimeOffset utcNow = clock.UtcNow;
        Guid reportId = Guid.NewGuid();

        Result<Report> createResult = Report.CreateAiReport(
            reportId,
            aiFindingId,
            targetType,
            targetId,
            targetCourseId,
            targetOwnerUserId,
            reasonCode,
            contentSnapshot,
            score,
            utcNow);

        if (createResult.IsFailure)
        {
            return createResult.Error;
        }

        await repository.AddReportAsync(createResult.Value, ct).ConfigureAwait(false);
        await repository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(reportId);
    }
}
