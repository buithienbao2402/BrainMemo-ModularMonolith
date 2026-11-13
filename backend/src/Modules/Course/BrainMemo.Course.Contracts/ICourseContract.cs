using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Contracts;

public interface ICourseContract
{
    Result<CourseAccessDto> GetCourseAccess(
        Guid courseId,
        Guid? viewerUserId,
        AccessPurpose purpose = AccessPurpose.Normal);

    Result<ChapterAccessResult> CheckChapterAccess(
        Guid courseId,
        Guid chapterId,
        Guid? viewerUserId);

    Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(
        IReadOnlyList<Guid> courseIds,
        Guid? viewerUserId);

    Result<Page<CourseSummaryDto>> ListUserCourses(
        Guid userId,
        UserCourseRelation relation,
        CourseAudience audience,
        Guid? afterId,
        int limit);

    Result<ReportTargetDto> ResolveReportTarget(
        Guid courseId,
        Guid reporterUserId);

    Result HideCourse(
        Guid courseId,
        Guid sanctionId,
        Guid actorAdminId);

    Result RestoreCourse(
        Guid courseId,
        Guid sanctionId,
        ActorKind actor);

    Result<string> PermanentlyDeleteCourse(
        Guid courseId,
        Guid actorAdminId);

    Result<Page<Guid>> ListActiveLearnerIds(
        Guid courseId,
        Guid? afterId,
        int limit);

    Result<Page<CourseSnapshotDto>> ListCourseSnapshots(
        Guid? afterId,
        int limit);

    Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(
        DateTimeOffset? after,
        int limit);

    Result<Page<NominationFactDto>> ListNominationFacts(
        DateTimeOffset? after,
        int limit);
}
