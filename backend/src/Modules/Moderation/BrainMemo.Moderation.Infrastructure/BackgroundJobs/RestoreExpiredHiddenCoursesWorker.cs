using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Moderation.Infrastructure.BackgroundJobs;

public sealed class RestoreExpiredHiddenCoursesWorker(
    IServiceProvider serviceProvider,
    IClock clock,
    ILogger<RestoreExpiredHiddenCoursesWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RestoreExpiredHiddenCoursesWorker started.");
        using var timer = new PeriodicTimer(Interval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
        {
            try
            {
                await ProcessExpiredHiddenCoursesAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while auto-restoring expired hidden courses.");
            }
        }
    }

    public async Task<int> ProcessExpiredHiddenCoursesAsync(CancellationToken ct = default)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        ModerationDbContext dbContext = scope.ServiceProvider.GetRequiredService<ModerationDbContext>();
        IModerationRepository repository = scope.ServiceProvider.GetRequiredService<IModerationRepository>();
        ICourseContract courseContract = scope.ServiceProvider.GetRequiredService<ICourseContract>();

        DateTimeOffset utcNow = clock.UtcNow;

        List<Sanction> expiredHidden = await dbContext.Sanctions
            .Where(s =>
                s.SanctionType == SanctionType.CourseHide
                && s.LiftedAt == null
                && s.ExpiresAt != null
                && s.ExpiresAt <= utcNow)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        if (expiredHidden.Count == 0)
        {
            return 0;
        }

        int restoredCount = 0;
        foreach (Sanction sanction in expiredHidden)
        {
            Result restoreResult = courseContract.RestoreCourse(sanction.TargetId, sanction.Id, ActorKind.System);
            if (restoreResult.IsSuccess)
            {
                sanction.Lift(null, "Tự động khôi phục khi hết hạn tạm ẩn", LiftKind.Expired, utcNow);

                Result<AuditLog> log = AuditLog.Create(
                    Guid.NewGuid(),
                    AuditActorType.System,
                    null,
                    AuditAction.CourseRestored,
                    AuditObjectType.Course,
                    sanction.TargetId,
                    null,
                    "Tự động khôi phục khi hết hạn tạm ẩn",
                    null,
                    sanction.ReportId,
                    sanction.Id,
                    utcNow);

                if (log.IsSuccess)
                {
                    await repository.AddAuditLogAsync(log.Value, ct).ConfigureAwait(false);
                }

                restoredCount++;
            }
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        logger.LogInformation("Auto-restored {Count} expired hidden courses.", restoredCount);
        return restoredCount;
    }
}
