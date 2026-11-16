using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Discovery.Infrastructure.Repositories;

public sealed class SearchHistoryRepository : ISearchHistoryRepository
{
    private readonly DiscoveryDbContext _dbContext;

    public SearchHistoryRepository(DiscoveryDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(SearchHistory history, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(history);

        await _dbContext.SearchHistories.AddAsync(history, ct);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<SearchHistory>> GetRecentByUserIdAsync(
        Guid userId,
        int limit = 20,
        CancellationToken ct = default)
    {
        return await _dbContext.SearchHistories
            .AsNoTracking()
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }
}
