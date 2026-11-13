using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using Microsoft.EntityFrameworkCore;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Infrastructure.Persistence;

public sealed class CourseRepository(CourseDbContext dbContext) : ICourseRepository
{
    public async Task AddAsync(CourseEntity course, CancellationToken ct = default)
    {
        await dbContext.Courses.AddAsync(course, ct).ConfigureAwait(false);
    }

    public async Task<CourseEntity?> GetByIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task<CourseEntity?> GetByIdWithTagsAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(c => c.Id == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<CourseEntity>> GetSummariesAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default)
    {
        if (courseIds.Count == 0)
        {
            return [];
        }

        return await dbContext.Courses
            .Include(c => c.Tags)
            .Where(c => courseIds.Contains(c.Id))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<Enrollment?> GetEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.UserId == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<ChapterAccess?> GetChapterAccessAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.ChapterAccesses
            .FirstOrDefaultAsync(a => a.ChapterId == chapterId, ct)
            .ConfigureAwait(false);
    }

    public async Task<ChapterUnlock?> GetChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.ChapterUnlocks
            .FirstOrDefaultAsync(u => u.ChapterId == chapterId && u.UserId == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<bool> HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Nominations
            .AnyAsync(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<CourseStatsDto> GetCourseStatsAsync(Guid courseId, CancellationToken ct = default)
    {
        int activeLearners = await dbContext.Enrollments
            .CountAsync(e => e.CourseId == courseId && e.Status == Domain.Enums.EnrollmentStatus.Active, ct)
            .ConfigureAwait(false);

        int nominationCount = await dbContext.Nominations
            .CountAsync(n => n.CourseId == courseId && n.WithdrawnAt == null, ct)
            .ConfigureAwait(false);

        return new CourseStatsDto(
            ActiveLearners: activeLearners,
            CompletedLearners: 0,
            CompletionRate: 0.0,
            CommentCount: 0,
            ChapterCount: 0,
            NominationCount: nominationCount);
    }

    public async Task<int> GetLearnerCountAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .CountAsync(e => e.CourseId == courseId && e.Status == Domain.Enums.EnrollmentStatus.Active, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> GetNominationCountAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Nominations
            .CountAsync(n => n.CourseId == courseId && n.WithdrawnAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<Page<CourseEntity>> ListUserCoursesAsync(
        Guid userId,
        UserCourseRelation relation,
        CourseAudience audience,
        Guid? afterId,
        int limit,
        CancellationToken ct = default)
    {
        IQueryable<CourseEntity> query;

        if (relation == UserCourseRelation.Owned)
        {
            query = dbContext.Courses
                .Include(c => c.Tags)
                .Where(c => c.OwnerUserId == userId);

            if (audience == CourseAudience.Public)
            {
                query = query.Where(c => c.AccessMode == CourseAccessMode.Public && c.DeletedAt == null && c.HiddenAt == null);
            }
        }
        else
        {
            IQueryable<Guid> enrolledCourseIds = dbContext.Enrollments
                .Where(e => e.UserId == userId && e.Status == Domain.Enums.EnrollmentStatus.Active)
                .Select(e => e.CourseId);

            query = dbContext.Courses
                .Include(c => c.Tags)
                .Where(c => enrolledCourseIds.Contains(c.Id));

            if (audience == CourseAudience.Public)
            {
                query = query.Where(c => c.AccessMode == CourseAccessMode.Public && c.DeletedAt == null && c.HiddenAt == null);
            }
        }

        query = query.OrderBy(c => c.Id);

        if (afterId.HasValue)
        {
            query = query.Where(c => c.Id > afterId.Value);
        }

        List<CourseEntity> items = await query.Take(limit + 1).ToListAsync(ct).ConfigureAwait(false);
        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(limit);
        }

        Guid? nextAfterId = items.Count > 0 ? items[^1].Id : null;
        return new Page<CourseEntity>(items, nextAfterId, hasMore);
    }

    public async Task<PagedResult<CourseEntity>> ListProfileCoursesPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<CourseEntity> query = dbContext.Courses
            .Include(c => c.Tags)
            .Where(c => c.OwnerUserId == userId && c.AccessMode == CourseAccessMode.Public && c.DeletedAt == null && c.HiddenAt == null)
            .OrderByDescending(c => c.CreatedAt);

        int totalCount = await query.CountAsync(ct).ConfigureAwait(false);
        List<CourseEntity> items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<CourseEntity>(items, page, pageSize, totalCount);
    }

    public async Task<PagedResult<CourseEntity>> ListMyOwnedCoursesPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<CourseEntity> query = dbContext.Courses
            .Include(c => c.Tags)
            .Where(c => c.OwnerUserId == userId && c.DeletedAt == null)
            .OrderByDescending(c => c.CreatedAt);

        int totalCount = await query.CountAsync(ct).ConfigureAwait(false);
        List<CourseEntity> items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<CourseEntity>(items, page, pageSize, totalCount);
    }

    public async Task<PagedResult<CourseEntity>> ListMyEnrolledCoursesPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Guid> enrolledCourseIds = dbContext.Enrollments
            .Where(e => e.UserId == userId && e.Status == Domain.Enums.EnrollmentStatus.Active)
            .Select(e => e.CourseId);

        IQueryable<CourseEntity> query = dbContext.Courses
            .Include(c => c.Tags)
            .Where(c => enrolledCourseIds.Contains(c.Id) && c.DeletedAt == null)
            .OrderByDescending(c => c.CreatedAt);

        int totalCount = await query.CountAsync(ct).ConfigureAwait(false);
        List<CourseEntity> items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<CourseEntity>(items, page, pageSize, totalCount);
    }

    public async Task<Page<Guid>> ListActiveLearnerIdsAsync(Guid courseId, Guid? afterId, int limit, CancellationToken ct = default)
    {
        IQueryable<Enrollment> query = dbContext.Enrollments
            .Where(e => e.CourseId == courseId && e.Status == Domain.Enums.EnrollmentStatus.Active)
            .OrderBy(e => e.UserId);

        if (afterId.HasValue)
        {
            query = query.Where(e => e.UserId > afterId.Value);
        }

        List<Guid> items = await query
            .Take(limit + 1)
            .Select(e => e.UserId)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(limit);
        }

        Guid? nextAfterId = items.Count > 0 ? items[^1] : null;
        return new Page<Guid>(items, nextAfterId, hasMore);
    }

    public async Task<Page<CourseSnapshotDto>> ListCourseSnapshotsAsync(Guid? afterId, int limit, CancellationToken ct = default)
    {
        IQueryable<CourseEntity> query = dbContext.Courses
            .Include(c => c.Tags)
            .Where(c => c.DeletedAt == null && c.HiddenAt == null && c.AccessMode == CourseAccessMode.Public)
            .OrderBy(c => c.Id);

        if (afterId.HasValue)
        {
            query = query.Where(c => c.Id > afterId.Value);
        }

        List<CourseEntity> items = await query.Take(limit + 1).ToListAsync(ct).ConfigureAwait(false);
        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(limit);
        }

        List<CourseSnapshotDto> snapshots = items.Select(c => new CourseSnapshotDto(
            Id: c.Id,
            OwnerUserId: c.OwnerUserId,
            Name: c.Name,
            Description: c.Description,
            AccessMode: c.AccessMode.ToString().ToUpperInvariant(),
            Status: c.Status.ToString().ToUpperInvariant(),
            Tags: c.Tags.Select(t => t.Tag).ToArray(),
            Revision: c.Revision,
            CreatedAt: c.CreatedAt,
            UpdatedAt: c.UpdatedAt)).ToList();

        Guid? nextAfterId = items.Count > 0 ? items[^1].Id : null;
        return new Page<CourseSnapshotDto>(snapshots, nextAfterId, hasMore);
    }

    public async Task<Page<EnrollmentFactDto>> ListEnrollmentFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default)
    {
        IQueryable<Enrollment> query = dbContext.Enrollments
            .OrderBy(e => e.StatusChangedAt);

        if (after.HasValue)
        {
            query = query.Where(e => e.StatusChangedAt > after.Value);
        }

        List<Enrollment> items = await query.Take(limit + 1).ToListAsync(ct).ConfigureAwait(false);
        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(limit);
        }

        List<EnrollmentFactDto> facts = items.Select(e => new EnrollmentFactDto(
            EnrollmentId: e.Id,
            CourseId: e.CourseId,
            UserId: e.UserId,
            Status: e.Status.ToString().ToUpperInvariant(),
            FirstEnrolledAt: e.FirstEnrolledAt,
            StatusChangedAt: e.StatusChangedAt)).ToList();

        Guid? nextAfterId = items.Count > 0 ? items[^1].Id : null;
        return new Page<EnrollmentFactDto>(facts, nextAfterId, hasMore);
    }

    public async Task<Page<NominationFactDto>> ListNominationFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default)
    {
        IQueryable<Nomination> query = dbContext.Nominations
            .OrderBy(n => n.NominatedAt);

        if (after.HasValue)
        {
            query = query.Where(n => n.NominatedAt > after.Value);
        }

        List<Nomination> items = await query.Take(limit + 1).ToListAsync(ct).ConfigureAwait(false);
        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(limit);
        }

        List<NominationFactDto> facts = items.Select(n => new NominationFactDto(
            NominationId: n.Id,
            CourseId: n.CourseId,
            UserId: n.UserId,
            NominatedAt: n.NominatedAt,
            WithdrawnAt: n.WithdrawnAt,
            IsActive: n.IsActive)).ToList();

        Guid? nextAfterId = items.Count > 0 ? items[^1].Id : null;
        return new Page<NominationFactDto>(facts, nextAfterId, hasMore);
    }

    public Task DeletePermanentlyAsync(CourseEntity course, CancellationToken ct = default)
    {
        dbContext.Courses.Remove(course);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
