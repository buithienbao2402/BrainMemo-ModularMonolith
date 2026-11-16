using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Identity.Infrastructure.BackgroundJobs;

public sealed class UnlockExpiredAccountsWorker(
    IServiceProvider serviceProvider,
    IClock clock,
    ILogger<UnlockExpiredAccountsWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("UnlockExpiredAccountsWorker background service started.");

        using var timer = new PeriodicTimer(CheckInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
        {
            try
            {
                await ProcessExpiredAccountsAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while auto-unlocking expired accounts.");
            }
        }
    }

    public async Task<int> ProcessExpiredAccountsAsync(CancellationToken ct = default)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        IdentityDbContext dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        IEventBus eventBus = scope.ServiceProvider.GetRequiredService<IEventBus>();

        DateTimeOffset utcNow = clock.UtcNow;

        List<User> expiredUsers = await dbContext.Users
            .Where(u => u.AccountStatus == AccountStatus.LockedTemporary
                && u.LockedUntil != null
                && u.LockedUntil <= utcNow)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        if (expiredUsers.Count == 0)
        {
            return 0;
        }

        List<AccountUnlocked> events = [];

        foreach (User user in expiredUsers)
        {
            Guid? sanctionId = user.UnlockIfExpired(utcNow);
            if (sanctionId is not null)
            {
                events.Add(new AccountUnlocked(
                    Guid.NewGuid(),
                    utcNow,
                    user.Id,
                    sanctionId.Value,
                    UnlockKind.AutoExpired));
            }
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        foreach (AccountUnlocked evt in events)
        {
            await eventBus.Publish(evt, ct).ConfigureAwait(false);
        }

        logger.LogInformation("Auto-unlocked {Count} expired temporary account locks.", expiredUsers.Count);
        return expiredUsers.Count;
    }
}
