using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Discovery.Infrastructure.Repositories;

public sealed class CourseEntryRepository : ICourseEntryRepository
{
    private readonly DiscoveryDbContext _dbContext;

    public CourseEntryRepository(DiscoveryDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CourseEntry?> GetByIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _dbContext.CourseEntries.FindAsync([courseId], ct);
    }

    public async Task<IReadOnlyList<CourseEntry>> GetByIdsAsync(IEnumerable<Guid> courseIds, CancellationToken ct = default)
    {
        List<Guid> idList = courseIds.Distinct().ToList();
        if (idList.Count == 0)
        {
            return [];
        }

        return await _dbContext.CourseEntries
            .Where(e => idList.Contains(e.CourseId))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CourseEntry>> GetByOwnerUserIdAsync(Guid ownerUserId, CancellationToken ct = default)
    {
        return await _dbContext.CourseEntries
            .Where(e => e.OwnerUserId == ownerUserId)
            .ToListAsync(ct);
    }

    public async Task UpsertAsync(CourseEntry entry, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(entry);

        CourseEntry? existing = await _dbContext.CourseEntries.FindAsync([entry.CourseId], ct);
        if (existing is null)
        {
            await _dbContext.CourseEntries.AddAsync(entry, ct);
        }
        else
        {
            _dbContext.Entry(existing).CurrentValues.SetValues(entry);
            existing.TagList = entry.TagList;
        }

        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid courseId, CancellationToken ct = default)
    {
        CourseEntry? existing = await _dbContext.CourseEntries.FindAsync([courseId], ct);
        if (existing is not null)
        {
            _dbContext.CourseEntries.Remove(existing);
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<CourseEntry>> GetRecentlyUpdatedAsync(int limit, CancellationToken ct = default)
    {
        return await _dbContext.CourseEntries
            .AsNoTracking()
            .OrderByDescending(e => e.LastUpdatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CourseEntry>> GetRecommendedRandomAsync(int limit, CancellationToken ct = default)
    {
        // Sử dụng OrderBy(Guid.NewGuid()) tương thích cả MySQL và InMemory provider
        return await _dbContext.CourseEntries
            .AsNoTracking()
            .OrderBy(_ => Guid.NewGuid())
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<(IReadOnlyList<CourseEntry> Items, int TotalCount)> SearchAsync(
        string? q,
        string? tag,
        string? accessMode,
        string? status,
        string? sort,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<CourseEntry> query = _dbContext.CourseEntries.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            string keyword = q.Trim().ToLower();
            query = query.Where(e =>
                e.Name.ToLower().Contains(keyword) ||
                e.OwnerDisplayName.ToLower().Contains(keyword) ||
                (e.Description != null && e.Description.ToLower().Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(accessMode))
        {
            query = query.Where(e => e.AccessMode == accessMode);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(e => e.CourseStatus == status);
        }

        // Lọc tag: lấy danh sách hoặc lọc client-side nếu phức tạp
        List<CourseEntry> candidates;
        if (!string.IsNullOrWhiteSpace(tag))
        {
            string normalizedTag = tag.Trim();
            // Lấy candidates và kiểm tra tag_list
            candidates = await query.ToListAsync(ct);
            candidates = candidates
                .Where(e => e.TagList != null && e.TagList.Any(t => string.Equals(t, normalizedTag, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }
        else
        {
            candidates = await query.ToListAsync(ct);
        }

        int totalCount = candidates.Count;

        // 6 Tiêu chí sắp xếp theo FR-DSC-09:
        IEnumerable<CourseEntry> sorted = sort?.ToUpperInvariant() switch
        {
            "NEWEST_LAUNCH" => candidates.OrderByDescending(e => e.FirstPublishedAt.HasValue)
                .ThenByDescending(e => e.FirstPublishedAt),
            "MOST_REVIEWED" => candidates.OrderByDescending(e => e.ReviewCount),
            "MOST_NOMINATED" => candidates.OrderByDescending(e => e.NominationCount),
            "MOST_LEARNERS" => candidates.OrderByDescending(e => e.LearnerCount),
            "MOST_COMMENTED" => candidates.OrderByDescending(e => e.CommentCount),
            _ => candidates.OrderByDescending(e => e.LastUpdatedAt), // RECENTLY_UPDATED (mặc định)
        };

        List<CourseEntry> items = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return (items, totalCount);
    }

    public async Task<int> CountEligibleCoursesAsync(CancellationToken ct = default)
    {
        return await _dbContext.CourseEntries.CountAsync(ct);
    }

    public async Task<int> GetRankByLearnerCountAsync(Guid courseId, CancellationToken ct = default)
    {
        CourseEntry? target = await _dbContext.CourseEntries.FindAsync([courseId], ct);
        if (target is null)
        {
            return 0;
        }

        int higherCount = await _dbContext.CourseEntries
            .CountAsync(e => e.LearnerCount > target.LearnerCount, ct);

        return higherCount + 1;
    }

    public async Task<int> GetRankByNominationCountAsync(Guid courseId, CancellationToken ct = default)
    {
        CourseEntry? target = await _dbContext.CourseEntries.FindAsync([courseId], ct);
        if (target is null)
        {
            return 0;
        }

        int higherCount = await _dbContext.CourseEntries
            .CountAsync(e => e.NominationCount > target.NominationCount, ct);

        return higherCount + 1;
    }

    public async Task<int> GetRankByReviewCountAsync(Guid courseId, CancellationToken ct = default)
    {
        CourseEntry? target = await _dbContext.CourseEntries.FindAsync([courseId], ct);
        if (target is null)
        {
            return 0;
        }

        int higherCount = await _dbContext.CourseEntries
            .CountAsync(e => e.ReviewCount > target.ReviewCount, ct);

        return higherCount + 1;
    }
}
