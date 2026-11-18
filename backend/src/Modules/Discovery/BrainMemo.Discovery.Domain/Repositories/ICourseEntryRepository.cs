using BrainMemo.Discovery.Domain.Entities;

namespace BrainMemo.Discovery.Domain.Repositories;

public interface ICourseEntryRepository
{
    Task<CourseEntry?> GetByIdAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<CourseEntry>> GetByIdsAsync(IEnumerable<Guid> courseIds, CancellationToken ct = default);
    Task<IReadOnlyList<CourseEntry>> GetByOwnerUserIdAsync(Guid ownerUserId, CancellationToken ct = default);
    Task UpsertAsync(CourseEntry entry, CancellationToken ct = default);
    Task DeleteAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<CourseEntry>> GetRecentlyUpdatedAsync(int limit, CancellationToken ct = default);
    Task<IReadOnlyList<CourseEntry>> GetRecommendedRandomAsync(int limit, CancellationToken ct = default);
    Task<(IReadOnlyList<CourseEntry> Items, int TotalCount)> SearchAsync(
        string? q,
        string? tag,
        string? accessMode,
        string? status,
        string? sort,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task<int> CountEligibleCoursesAsync(CancellationToken ct = default);
    Task<int> GetRankByLearnerCountAsync(Guid courseId, CancellationToken ct = default);
    Task<int> GetRankByNominationCountAsync(Guid courseId, CancellationToken ct = default);
    Task<int> GetRankByReviewCountAsync(Guid courseId, CancellationToken ct = default);
}
