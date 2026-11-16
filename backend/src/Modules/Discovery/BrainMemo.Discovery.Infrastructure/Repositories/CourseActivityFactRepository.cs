using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Discovery.Infrastructure.Repositories;

public sealed class CourseActivityFactRepository : ICourseActivityFactRepository
{
    private readonly DiscoveryDbContext _dbContext;

    public CourseActivityFactRepository(DiscoveryDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> ExistsBySourceEventIdAsync(Guid sourceEventId, CancellationToken ct = default)
    {
        return await _dbContext.CourseActivityFacts
            .AnyAsync(f => f.SourceEventId == sourceEventId, ct);
    }

    public async Task AddAsync(CourseActivityFact fact, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(fact);

        await _dbContext.CourseActivityFacts.AddAsync(fact, ct);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task DeleteByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        List<CourseActivityFact> facts = await _dbContext.CourseActivityFacts
            .Where(f => f.CourseId == courseId)
            .ToListAsync(ct);

        if (facts.Count > 0)
        {
            _dbContext.CourseActivityFacts.RemoveRange(facts);
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<(Guid CourseId, int Count)>> GetTop10Async(
        string metric,
        DateTimeOffset? since,
        int limit = 10,
        CancellationToken ct = default)
    {
        IQueryable<CourseActivityFact> query = _dbContext.CourseActivityFacts.AsNoTracking();

        if (since.HasValue)
        {
            query = query.Where(f => f.OccurredAt >= since.Value);
        }

        List<CourseActivityFact> facts = await query.ToListAsync(ct);

        if (string.Equals(metric, "NOMINATIONS", StringComparison.OrdinalIgnoreCase))
        {
            // Trường hợp rút đề cử: NOMINATION_NEW (+1) trừ đi NOMINATION_WITHDRAWN (-1) (mục 3.9.4.2)
            var nominationGroups = facts
                .Where(f => f.ActivityType == "NOMINATION_NEW" || f.ActivityType == "NOMINATION_WITHDRAWN")
                .GroupBy(f => f.CourseId)
                .Select(g => (
                    CourseId: g.Key,
                    Count: g.Sum(f => f.ActivityType == "NOMINATION_NEW" ? 1 : -1)))
                .Where(x => x.Count > 0)
                .OrderByDescending(x => x.Count)
                .Take(limit)
                .ToList();

            return nominationGroups;
        }

        string targetActivity = string.Equals(metric, "REVIEWS", StringComparison.OrdinalIgnoreCase)
            ? "REVIEW_NEW"
            : "ENROLLMENT_NEW";

        var groups = facts
            .Where(f => f.ActivityType == targetActivity)
            .GroupBy(f => f.CourseId)
            .Select(g => (CourseId: g.Key, Count: g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .ToList();

        return groups;
    }
}
