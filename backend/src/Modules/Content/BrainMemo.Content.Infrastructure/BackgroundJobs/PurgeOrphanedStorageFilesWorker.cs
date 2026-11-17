using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Content.Infrastructure.BackgroundJobs;

/// <summary>
/// Housekeeping worker to purge soft-deleted and orphaned storage files from S3/R2 and database (T-S12-BE-01).
/// </summary>
public sealed class PurgeOrphanedStorageFilesWorker(
    IServiceProvider serviceProvider,
    IClock clock,
    ILogger<PurgeOrphanedStorageFilesWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan RetentionPeriod = TimeSpan.FromDays(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("PurgeOrphanedStorageFilesWorker background service started.");

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
                logger.LogError(ex, "Error occurred while purging orphaned storage files.");
            }
        }
    }

    public async Task<int> ProcessPurgeAsync(CancellationToken ct = default)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        ContentDbContext dbContext = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
        IFileStorage? fileStorage = scope.ServiceProvider.GetService<IFileStorage>();

        DateTimeOffset cutoff = clock.UtcNow - RetentionPeriod;

        List<Resource> deletedResources = await dbContext.Resources
            .Where(r => r.DeletedAt != null && r.DeletedAt <= cutoff)
            .Take(100)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        if (deletedResources.Count == 0)
        {
            return 0;
        }

        int purgedCount = 0;
        foreach (Resource resource in deletedResources)
        {
            if (fileStorage is not null && !string.IsNullOrWhiteSpace(resource.StorageKey))
            {
                try
                {
                    await fileStorage.Delete(resource.StorageKey, ct).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to delete physical storage object for key {StorageKey}", resource.StorageKey);
                }
            }

            dbContext.Resources.Remove(resource);
            purgedCount++;
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        logger.LogInformation("Housekeeping: Purged {Count} orphaned resource files from storage and database.", purgedCount);

        return purgedCount;
    }
}
