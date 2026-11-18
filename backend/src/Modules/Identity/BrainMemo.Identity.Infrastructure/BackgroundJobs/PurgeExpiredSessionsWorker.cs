using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Identity.Infrastructure.BackgroundJobs;

/// <summary>
/// Housekeeping worker to purge expired or revoked refresh sessions (T-S12-BE-01).
/// </summary>
public sealed class PurgeExpiredSessionsWorker(
    IServiceProvider serviceProvider,
    IClock clock,
    ILogger<PurgeExpiredSessionsWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("PurgeExpiredSessionsWorker background service started.");

        using var timer = new PeriodicTimer(CheckInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
        {
            try
            {
                await ProcessPurgeAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while purging expired sessions.");
            }
        }
    }

    public async Task<int> ProcessPurgeAsync(CancellationToken ct = default)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        IIdentityAuthRepository authRepository = scope.ServiceProvider.GetRequiredService<IIdentityAuthRepository>();

        DateTimeOffset utcNow = clock.UtcNow;
        int purged = await authRepository.PurgeExpiredSessionsAsync(utcNow, ct).ConfigureAwait(false);

        if (purged > 0)
        {
            logger.LogInformation("Housekeeping: Purged {Count} expired/revoked refresh sessions.", purged);
        }

        return purged;
    }
}
