using BrainMemo.Course.Domain.Entities;

namespace BrainMemo.Course.Application.Abstractions;

public interface ICourseRepository
{
    Task<Course?> FindByIdAsync(Guid courseId, CancellationToken ct = default);
    Task<Course?> FindByIdWithTagsAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<Course>> FindByIdsAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default);
    Task<IReadOnlyList<Course>> ListOwnedCoursesAsync(Guid ownerUserId, int skip, int take, CancellationToken ct = default);
    Task<IReadOnlyList<Course>> ListEnrolledCoursesAsync(Guid userId, int skip, int take, CancellationToken ct = default);
    Task<IReadOnlyList<Course>> ListPublicCoursesByOwnerAsync(Guid ownerUserId, int skip, int take, CancellationToken ct = default);
    Task<int> CountOwnedCoursesAsync(Guid ownerUserId, CancellationToken ct = default);
    Task<int> CountEnrolledCoursesAsync(Guid userId, CancellationToken ct = default);
    Task<int> CountPublicCoursesByOwnerAsync(Guid ownerUserId, CancellationToken ct = default);
    Task<Enrollment?> FindEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<Enrollment>> FindEnrollmentsByCourseAsync(Guid courseId, CancellationToken ct = default);
    Task<ChapterAccess?> FindChapterAccessAsync(Guid chapterId, CancellationToken ct = default);
    Task<ChapterUnlock?> FindChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default);
    Task<Nomination?> FindActiveNominationAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<int> CountActiveNominationsAsync(Guid courseId, CancellationToken ct = default);
    Task<int> CountActiveLearnersAsync(Guid courseId, CancellationToken ct = default);
    Task AddAsync(Course course, CancellationToken ct = default);
    Task UpdateAsync(Course course, CancellationToken ct = default);
    Task DeletePhysicallyAsync(Course course, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
