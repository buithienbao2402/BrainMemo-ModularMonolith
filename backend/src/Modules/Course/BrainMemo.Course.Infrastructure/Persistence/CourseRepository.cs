using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Course.Infrastructure.Persistence;

internal sealed class CourseRepository(CourseDbContext dbContext) : ICourseRepository
{
    public async Task<Domain.Entities.Course?> FindByIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task<Domain.Entities.Course?> FindByIdWithTagsAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .Include(static c => c.Tags)
            .FirstOrDefaultAsync(c => c.Id == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Domain.Entities.Course>> FindByIdsAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default)
    {
        if (courseIds.Count == 0)
        {
            return [];
        }

        return await dbContext.Courses
            .Include(static c => c.Tags)
            .Where(c => courseIds.Contains(c.Id))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Domain.Entities.Course>> ListOwnedCoursesAsync(Guid ownerUserId, int skip, int take, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .Include(static c => c.Tags)
            .Where(c => c.OwnerUserId == ownerUserId && c.DeletedAt == null)
            .OrderByDescending(static c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Domain.Entities.Course>> ListEnrolledCoursesAsync(Guid userId, int skip, int take, CancellationToken ct = default)
    {
        IQueryable<Guid> enrolledCourseIds = dbContext.Enrollments
            .Where(e => e.UserId == userId && e.Status == EnrollmentStatus.Active)
            .OrderByDescending(static e => e.StatusChangedAt)
            .Select(static e => e.CourseId);

        return await dbContext.Courses
            .Include(static c => c.Tags)
            .Where(c => enrolledCourseIds.Contains(c.Id) && c.DeletedAt == null)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Domain.Entities.Course>> ListPublicCoursesByOwnerAsync(Guid ownerUserId, int skip, int take, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .Include(static c => c.Tags)
            .Where(c => c.OwnerUserId == ownerUserId
                && c.AccessMode == CourseAccessMode.Public
                && c.HiddenAt == null
                && c.DeletedAt == null)
            .OrderByDescending(static c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountOwnedCoursesAsync(Guid ownerUserId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .CountAsync(c => c.OwnerUserId == ownerUserId && c.DeletedAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountEnrolledCoursesAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .CountAsync(e => e.UserId == userId && e.Status == EnrollmentStatus.Active, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountPublicCoursesByOwnerAsync(Guid ownerUserId, CancellationToken ct = default)
    {
        return await dbContext.Courses
            .CountAsync(c => c.OwnerUserId == ownerUserId
                && c.AccessMode == CourseAccessMode.Public
                && c.HiddenAt == null
                && c.DeletedAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<Enrollment?> FindEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.UserId == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Enrollment>> FindEnrollmentsByCourseAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .Where(e => e.CourseId == courseId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<ChapterAccess?> FindChapterAccessAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.ChapterAccesses
            .FirstOrDefaultAsync(a => a.ChapterId == chapterId, ct)
            .ConfigureAwait(false);
    }

    public async Task<ChapterUnlock?> FindChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.ChapterUnlocks
            .FirstOrDefaultAsync(u => u.ChapterId == chapterId && u.UserId == userId, ct)
            .ConfigureAwait(false);
    }

    public async Task<Nomination?> FindActiveNominationAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Nominations
            .FirstOrDefaultAsync(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountActiveNominationsAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Nominations
            .CountAsync(n => n.CourseId == courseId && n.WithdrawnAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountActiveLearnersAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Enrollments
            .CountAsync(e => e.CourseId == courseId && e.Status == EnrollmentStatus.Active, ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Domain.Entities.Course course, CancellationToken ct = default)
    {
        await dbContext.Courses.AddAsync(course, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(Domain.Entities.Course course, CancellationToken ct = default)
    {
        dbContext.Courses.Update(course);
        return Task.CompletedTask;
    }

    public Task DeletePhysicallyAsync(Domain.Entities.Course course, CancellationToken ct = default)
    {
        dbContext.Courses.Remove(course);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
