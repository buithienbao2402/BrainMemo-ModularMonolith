using BrainMemo.Discovery.Domain.Entities;

namespace BrainMemo.Discovery.Domain.Repositories;

public interface ISearchHistoryRepository
{
    Task AddAsync(SearchHistory history, CancellationToken ct = default);
    Task<IReadOnlyList<SearchHistory>> GetRecentByUserIdAsync(Guid userId, int limit = 20, CancellationToken ct = default);
}
