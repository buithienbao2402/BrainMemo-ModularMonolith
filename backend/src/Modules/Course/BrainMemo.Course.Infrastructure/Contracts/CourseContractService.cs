using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Infrastructure.Contracts;

public sealed class CourseContractService(
    ICourseRepository courseRepository,
    IOutboxWriter outboxWriter,
    IClock clock,
    IFileStorage? fileStorage = null) : ICourseContract
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
    {
        CourseEntity? course = courseRepository.GetByIdWithTagsAsync(courseId).GetAwaiter().GetResult();
        Enrollment? enrollment = null;

        if (viewerUserId.HasValue)
        {
            enrollment = courseRepository.GetEnrollmentAsync(courseId, viewerUserId.Value).GetAwaiter().GetResult();
        }

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, viewerUserId, enrollment, purpose);
        return Result.Success(access);
    }

    public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId)
    {
        Result<CourseAccessDto> courseAccessResult = GetCourseAccess(courseId, viewerUserId);
        if (courseAccessResult.IsFailure)
        {
            return Result.Failure<ChapterAccessResult>(courseAccessResult.Error);
        }

        CourseAccessDto courseAccess = courseAccessResult.Value;
        ChapterAccess? chapterAccess = courseRepository.GetChapterAccessAsync(chapterId).GetAwaiter().GetResult();
        ChapterUnlock? unlock = null;

        if (viewerUserId.HasValue)
        {
            unlock = courseRepository.GetChapterUnlockAsync(chapterId, viewerUserId.Value).GetAwaiter().GetResult();
        }

        ChapterAccessResult result = CourseAccessEvaluator.EvaluateChapterAccess(chapterAccess, courseAccess, unlock);
        return Result.Success(result);
    }

    public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId)
    {
        if (courseIds.Count == 0)
        {
            return Result.Success<IReadOnlyList<CourseSummaryDto>>([]);
        }

        IReadOnlyList<CourseEntity> courses = courseRepository.GetSummariesAsync(courseIds).GetAwaiter().GetResult();
        Dictionary<Guid, CourseEntity> courseMap = courses.ToDictionary(c => c.Id);
        List<CourseSummaryDto> summaries = [];

        foreach (Guid id in courseIds)
        {
            if (!courseMap.TryGetValue(id, out CourseEntity? course))
            {
                continue;
            }

            Enrollment? enrollment = null;
            if (viewerUserId.HasValue)
            {
                enrollment = courseRepository.GetEnrollmentAsync(course.Id, viewerUserId.Value).GetAwaiter().GetResult();
            }

            CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, viewerUserId, enrollment);

            if (!access.CanViewInfo)
            {
                // Visible=false khi không xem được, KHÔNG kèm nội dung per contract spec
                summaries.Add(new CourseSummaryDto(
                    Id: course.Id,
                    Name: null,
                    Description: null,
                    CoverUrl: null,
                    OwnerUserId: course.OwnerUserId,
                    AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
                    Status: course.Status.ToString().ToUpperInvariant(),
                    Visible: false,
                    Tags: null));
            }
            else
            {
                string? coverUrl = null;
                if (!string.IsNullOrEmpty(course.CoverStorageKey) && fileStorage != null)
                {
                    try
                    {
                        coverUrl = fileStorage.CreateDownloadUrl(course.CoverStorageKey, CoverUrlTtl).GetAwaiter().GetResult();
                    }
                    catch
                    {
                        // Ignore storage error
                    }
                }

                summaries.Add(new CourseSummaryDto(
                    Id: course.Id,
                    Name: course.Name,
                    Description: course.Description,
                    CoverUrl: coverUrl,
                    OwnerUserId: course.OwnerUserId,
                    AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
                    Status: course.Status.ToString().ToUpperInvariant(),
                    Visible: true,
                    Tags: course.Tags.Select(t => t.Tag).ToArray()));
            }
        }

        return Result.Success<IReadOnlyList<CourseSummaryDto>>(summaries);
    }

    public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit)
    {
        Page<CourseEntity> page = courseRepository.ListUserCoursesAsync(userId, relation, audience, afterId, limit).GetAwaiter().GetResult();

        List<CourseSummaryDto> dtos = page.Items.Select(c => new CourseSummaryDto(
            Id: c.Id,
            Name: c.Name,
            Description: c.Description,
            CoverUrl: null,
            OwnerUserId: c.OwnerUserId,
            AccessMode: c.AccessMode.ToString().ToUpperInvariant(),
            Status: c.Status.ToString().ToUpperInvariant(),
            Visible: true,
            Tags: c.Tags.Select(t => t.Tag).ToArray())).ToList();

        return Result.Success(new Page<CourseSummaryDto>(dtos, page.AfterId, page.HasMore));
    }

    public Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId)
    {
        CourseEntity? course = courseRepository.GetByIdAsync(courseId).GetAwaiter().GetResult();

        // contracts/course.md: Only Me → NOT_FOUND
        if (course is null || course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure<ReportTargetDto>(new Error("NOT_FOUND", "Không tìm thấy khóa học để báo cáo."));
        }

        return Result.Success(new ReportTargetDto(
            CourseId: course.Id,
            CourseName: course.Name,
            OwnerUserId: course.OwnerUserId,
            AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
            CanBeReported: true));
    }

    public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId)
    {
        CourseEntity? course = courseRepository.GetByIdWithTagsAsync(courseId).GetAwaiter().GetResult();
        if (course is null)
        {
            return Result.Failure(new Error("NOT_FOUND", "Khóa học không tồn tại."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result hideResult = course.Hide(sanctionId, now);
        if (hideResult.IsFailure)
        {
            return hideResult;
        }

        outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now)).GetAwaiter().GetResult();
        courseRepository.SaveChangesAsync().GetAwaiter().GetResult();

        return Result.Success();
    }

    public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor)
    {
        CourseEntity? course = courseRepository.GetByIdWithTagsAsync(courseId).GetAwaiter().GetResult();
        if (course is null)
        {
            return Result.Failure(new Error("NOT_FOUND", "Khóa học không tồn tại."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result restoreResult = course.Restore(sanctionId, now);
        if (restoreResult.IsFailure)
        {
            return restoreResult;
        }

        outboxWriter.WriteAsync(course.Id, CourseEventFactory.CreateUpsertedEvent(course, now)).GetAwaiter().GetResult();
        courseRepository.SaveChangesAsync().GetAwaiter().GetResult();

        return Result.Success();
    }

    public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId)
    {
        CourseEntity? course = courseRepository.GetByIdAsync(courseId).GetAwaiter().GetResult();
        if (course is null)
        {
            return Result.Failure<string>(new Error("NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!course.IsDeleted && !course.IsHidden)
        {
            return Result.Failure<string>(new Error("INVALID_STATE", "Chỉ có thể xóa vĩnh viễn khóa học đã bị xóa mềm hoặc tạm ẩn."));
        }

        DateTimeOffset now = clock.UtcNow;
        string courseName = course.Name;

        outboxWriter.WriteAsync(course.Id, new CoursePermanentlyDeleted(
            EventId: Guid.NewGuid(),
            OccurredAt: now,
            CourseId: course.Id,
            CourseName: course.Name,
            OwnerUserId: course.OwnerUserId,
            ActorAdminId: actorAdminId)).GetAwaiter().GetResult();

        courseRepository.DeletePermanentlyAsync(course).GetAwaiter().GetResult();
        courseRepository.SaveChangesAsync().GetAwaiter().GetResult();

        return Result.Success(courseName);
    }

    public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit)
    {
        Page<Guid> page = courseRepository.ListActiveLearnerIdsAsync(courseId, afterId, limit).GetAwaiter().GetResult();
        return Result.Success(page);
    }

    public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit)
    {
        Page<CourseSnapshotDto> page = courseRepository.ListCourseSnapshotsAsync(afterId, limit).GetAwaiter().GetResult();
        return Result.Success(page);
    }

    public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit)
    {
        Page<EnrollmentFactDto> page = courseRepository.ListEnrollmentFactsAsync(after, limit).GetAwaiter().GetResult();
        return Result.Success(page);
    }

    public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit)
    {
        Page<NominationFactDto> page = courseRepository.ListNominationFactsAsync(after, limit).GetAwaiter().GetResult();
        return Result.Success(page);
    }
}
