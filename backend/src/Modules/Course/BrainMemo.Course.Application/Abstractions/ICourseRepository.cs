using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Abstractions;

public interface ICourseRepository
{
    Task AddAsync(CourseEntity course, CancellationToken ct = default);
    Task<CourseEntity?> GetByIdAsync(Guid courseId, CancellationToken ct = default);
    Task<CourseEntity?> GetByIdWithTagsAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<CourseEntity>> GetSummariesAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default);
    Task<Enrollment?> GetEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task AddEnrollmentAsync(Enrollment enrollment, CancellationToken ct = default);
    Task RemoveEnrollmentAsync(Enrollment enrollment, CancellationToken ct = default);
    Task<EnrollmentRequest?> GetPendingEnrollmentRequestAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<EnrollmentRequest?> GetEnrollmentRequestByIdAsync(Guid requestId, CancellationToken ct = default);
    Task AddEnrollmentRequestAsync(EnrollmentRequest request, CancellationToken ct = default);
    Task<PagedResult<Enrollment>> ListEnrollmentsPagedAsync(Guid courseId, Domain.Enums.EnrollmentStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Enrollment>> ListUserInvitationsAsync(Guid userId, CancellationToken ct = default);
    Task<PagedResult<EnrollmentRequest>> ListEnrollmentRequestsPagedAsync(Guid courseId, EnrollmentDecision? decision, int page, int pageSize, CancellationToken ct = default);
    Task<ChapterAccess?> GetChapterAccessAsync(Guid chapterId, CancellationToken ct = default);
    Task AddChapterAccessAsync(ChapterAccess access, CancellationToken ct = default);
    Task RemoveChapterAccessAsync(ChapterAccess access, CancellationToken ct = default);
    Task<ChapterUnlock?> GetChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default);
    Task AddChapterUnlockAsync(ChapterUnlock unlock, CancellationToken ct = default);
    Task RemoveChapterUnlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default);
    Task<bool> HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<Nomination?> GetActiveNominationAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task AddNominationAsync(Nomination nomination, CancellationToken ct = default);
    Task<CourseStatsDto> GetCourseStatsAsync(Guid courseId, CancellationToken ct = default);
    Task<int> GetLearnerCountAsync(Guid courseId, CancellationToken ct = default);
    Task<int> GetNominationCountAsync(Guid courseId, CancellationToken ct = default);
    Task<Page<CourseEntity>> ListUserCoursesAsync(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit, CancellationToken ct = default);
    Task<PagedResult<CourseEntity>> ListProfileCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<CourseEntity>> ListMyOwnedCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<CourseEntity>> ListMyEnrolledCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task<Page<Guid>> ListActiveLearnerIdsAsync(Guid courseId, Guid? afterId, int limit, CancellationToken ct = default);
    Task<Page<CourseSnapshotDto>> ListCourseSnapshotsAsync(Guid? afterId, int limit, CancellationToken ct = default);
    Task<Page<EnrollmentFactDto>> ListEnrollmentFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default);
    Task<Page<NominationFactDto>> ListNominationFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default);
    Task<PagedResult<CourseEntity>> ListByPublishStatusAsync(Domain.Enums.CoursePublishStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        Task.FromResult(new PagedResult<CourseEntity>(Array.Empty<CourseEntity>(), page, pageSize, 0));
    Task<int> CountPendingReviewsAsync(CancellationToken ct = default) => Task.FromResult(0);
    Task DeletePermanentlyAsync(CourseEntity course, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
