using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Table-agnostic EF Core implementation of <see cref="IOutboxStore"/> bound to a module's <see cref="DbContext"/>.
/// </summary>
public sealed class EfOutboxStore<TDbContext>(
    TDbContext dbContext,
    string moduleName) : IOutboxStore
    where TDbContext : DbContext
{
    private readonly TDbContext _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));

    public string ModuleName { get; } = !string.IsNullOrWhiteSpace(moduleName)
        ? moduleName.Trim()
        : throw new ArgumentException("Module name cannot be empty.", nameof(moduleName));

    public async Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default)
    {
        if (eventId == Guid.Empty)
        {
            return false;
        }

        bool existsLocally = _dbContext.ChangeTracker
            .Entries<OutboxMessage>()
            .Any(entry => entry.Entity.Id == eventId
                && entry.State is not EntityState.Deleted and not EntityState.Detached);

        if (existsLocally)
        {
            return true;
        }

        return await _dbContext.Set<OutboxMessage>()
            .AsNoTracking()
            .AnyAsync(x => x.Id == eventId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(OutboxMessage message, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(message);

        if (await ExistsAsync(message.Id, ct).ConfigureAwait(false))
        {
            return;
        }

        await _dbContext.Set<OutboxMessage>()
            .AddAsync(message, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<OutboxMessage>> GetUnpublishedAsync(
        int batchSize,
        int maxAttempts,
        CancellationToken ct = default)
    {
        int normalizedBatchSize = batchSize > 0 ? batchSize : 50;

        IQueryable<OutboxMessage> query = _dbContext.Set<OutboxMessage>()
            .Where(x => x.PublishedAt == null);

        if (maxAttempts > 0)
        {
            ushort max = (ushort)Math.Min(maxAttempts, ushort.MaxValue);
            query = query.Where(x => x.AttemptCount < max);
        }

        return await query
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .Take(normalizedBatchSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}
