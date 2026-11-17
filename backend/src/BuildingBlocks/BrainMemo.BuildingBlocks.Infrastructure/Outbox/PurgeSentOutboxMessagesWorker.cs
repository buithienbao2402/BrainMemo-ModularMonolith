using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Housekeeping worker to purge processed outbox messages older than retention window (T-S12-BE-01).
/// </summary>
public sealed class PurgeSentOutboxMessagesWorker(
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<PurgeSentOutboxMessagesWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan RetentionPeriod = TimeSpan.FromDays(7);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("PurgeSentOutboxMessagesWorker background service started.");

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
                logger.LogError(ex, "Error occurred while purging published outbox messages.");
            }
        }
    }

    public async Task<int> ProcessPurgeAsync(CancellationToken ct = default)
    {
        using IServiceScope scope = scopeFactory.CreateScope();
        IEnumerable<IOutboxStore> stores = scope.ServiceProvider.GetServices<IOutboxStore>();

        DateTimeOffset cutoff = clock.UtcNow - RetentionPeriod;
        int totalPurged = 0;

        foreach (IOutboxStore store in stores)
        {
            try
            {
                int count = await store.PurgePublishedOlderThanAsync(cutoff, ct).ConfigureAwait(false);
                totalPurged += count;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to purge outbox store for module {ModuleName}", store.ModuleName);
            }
        }

        if (totalPurged > 0)
        {
            logger.LogInformation("Housekeeping: Purged {Count} published outbox messages older than {Cutoff}.", totalPurged, cutoff);
        }

        return totalPurged;
    }
}
