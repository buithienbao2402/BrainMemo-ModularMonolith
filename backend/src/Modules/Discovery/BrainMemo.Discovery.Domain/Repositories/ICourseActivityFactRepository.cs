using BrainMemo.Discovery.Domain.Entities;

namespace BrainMemo.Discovery.Domain.Repositories;

public interface ICourseActivityFactRepository
{
    Task<bool> ExistsBySourceEventIdAsync(Guid sourceEventId, CancellationToken ct = default);
    Task AddAsync(CourseActivityFact fact, CancellationToken ct = default);
    Task DeleteByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<(Guid CourseId, int Count)>> GetTop10Async(
        string metric,
        DateTimeOffset? since,
        int limit = 10,
        CancellationToken ct = default);
}
